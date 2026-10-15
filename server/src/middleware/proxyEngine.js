const axios = require('axios');
const ApiKey = require('../models/ApiKey');
const Service = require('../models/Service');
const GatewayLog = require('../models/GatewayLog');
const rateLimiter = require('./rateLimiter');
const { hashApiKey } = require('../utils/cryptoUtils');

/**
 * Enterprise Gateway Reverse Proxy Engine
 * Handles API key authentication, rate-limit enforcement, header injection,
 * upstream proxying, latency timing, and asynchronous audit logging.
 */
const proxyEngine = async (req, res) => {
  const startTime = process.hrtime.bigint();
  const serviceSlug = req.params.serviceSlug;
  const subPath = req.params[0] ? `/${req.params[0]}` : '';
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown Client';

  // Helper function to asynchronously log requests without blocking client responses
  const asyncLog = (logData) => {
    setImmediate(async () => {
      try {
        await GatewayLog.create(logData);
      } catch (logErr) {
        console.error('[GatewayLog] Failed to record log entry:', logErr.message);
      }
    });
  };

  // Helper to extract API Key from Headers or Query params
  const extractApiKey = () => {
    if (req.headers['x-api-key']) return req.headers['x-api-key'];
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer gh_')) {
      return req.headers.authorization.split(' ')[1];
    }
    if (req.query && req.query.api_key) return req.query.api_key;
    return null;
  };

  const rawKey = extractApiKey();

  // 1. Check API Key presence
  if (!rawKey) {
    const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    asyncLog({
      serviceSlug,
      method: req.method,
      path: req.originalUrl,
      statusCode: 401,
      latencyMs: Math.round(latencyMs),
      ip: clientIp,
      userAgent,
      errorMessage: 'Missing API Key in request headers (x-api-key or Authorization Bearer).',
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing API key. Please pass your key via the "x-api-key" header or Authorization Bearer token.',
    });
  }

  // 2. Validate API Key
  const hashedKey = hashApiKey(rawKey);
  const apiKey = await ApiKey.findOne({ hashedKey }).populate('user');

  if (!apiKey) {
    const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    asyncLog({
      serviceSlug,
      apiKeyPrefix: rawKey.substring(0, 10) + '...',
      method: req.method,
      path: req.originalUrl,
      statusCode: 401,
      latencyMs: Math.round(latencyMs),
      ip: clientIp,
      userAgent,
      errorMessage: 'Invalid API key provided.',
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'The provided API key is invalid.',
    });
  }

  if (apiKey.status === 'revoked') {
    const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    asyncLog({
      user: apiKey.user?._id,
      apiKeyId: apiKey._id,
      apiKeyPrefix: apiKey.keyPrefix,
      apiKeyName: apiKey.name,
      serviceSlug,
      method: req.method,
      path: req.originalUrl,
      statusCode: 403,
      latencyMs: Math.round(latencyMs),
      ip: clientIp,
      userAgent,
      errorMessage: 'Attempted to use a revoked API key.',
    });

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'This API key has been revoked and cannot be used.',
    });
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    apiKey.status = 'expired';
    await apiKey.save();

    const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    asyncLog({
      user: apiKey.user?._id,
      apiKeyId: apiKey._id,
      apiKeyPrefix: apiKey.keyPrefix,
      apiKeyName: apiKey.name,
      serviceSlug,
      method: req.method,
      path: req.originalUrl,
      statusCode: 403,
      latencyMs: Math.round(latencyMs),
      ip: clientIp,
      userAgent,
      errorMessage: 'API key has expired.',
    });

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'This API key has expired.',
    });
  }

  // 3. Find Upstream Service
  const service = await Service.findOne({ slug: serviceSlug });

  if (!service) {
    const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    asyncLog({
      user: apiKey.user?._id,
      apiKeyId: apiKey._id,
      apiKeyPrefix: apiKey.keyPrefix,
      apiKeyName: apiKey.name,
      serviceSlug,
      method: req.method,
      path: req.originalUrl,
      statusCode: 404,
      latencyMs: Math.round(latencyMs),
      ip: clientIp,
      userAgent,
      errorMessage: `Service with slug '${serviceSlug}' not found.`,
    });

    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `No service registered under route slug '${serviceSlug}'.`,
    });
  }

  if (!service.isActive) {
    const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    asyncLog({
      user: apiKey.user?._id,
      apiKeyId: apiKey._id,
      apiKeyPrefix: apiKey.keyPrefix,
      apiKeyName: apiKey.name,
      serviceId: service._id,
      serviceSlug: service.slug,
      serviceName: service.name,
      method: req.method,
      path: req.originalUrl,
      statusCode: 503,
      latencyMs: Math.round(latencyMs),
      ip: clientIp,
      userAgent,
      errorMessage: `Service '${service.name}' is currently disabled/inactive.`,
    });

    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: `The upstream service '${service.name}' is currently inactive.`,
    });
  }

  // Check if API key is authorized for this service
  if (apiKey.allowedServices && apiKey.allowedServices.length > 0) {
    const isAllowed = apiKey.allowedServices.some(
      (allowedId) => allowedId.toString() === service._id.toString()
    );
    if (!isAllowed) {
      const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      asyncLog({
        user: apiKey.user?._id,
        apiKeyId: apiKey._id,
        apiKeyPrefix: apiKey.keyPrefix,
        apiKeyName: apiKey.name,
        serviceId: service._id,
        serviceSlug: service.slug,
        serviceName: service.name,
        method: req.method,
        path: req.originalUrl,
        statusCode: 403,
        latencyMs: Math.round(latencyMs),
        ip: clientIp,
        userAgent,
        errorMessage: `API key not authorized for service '${service.name}'.`,
      });

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `This API key is not authorized to access upstream service '${service.name}'.`,
      });
    }
  }

  // Check allowed HTTP methods
  if (
    service.allowedMethods &&
    service.allowedMethods.length > 0 &&
    !service.allowedMethods.includes(req.method.toUpperCase())
  ) {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: `HTTP ${req.method} is not permitted for service '${service.name}'. Allowed: ${service.allowedMethods.join(', ')}`,
    });
  }

  // 4. Rate Limiting Check
  const rateLimitResult = rateLimiter.check(
    apiKey._id.toString(),
    apiKey.rateLimit.requests,
    apiKey.rateLimit.windowMs
  );

  // Set standard Rate Limit headers
  res.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
  res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime);

  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', rateLimitResult.retryAfter);
    const latencyMs = Number(process.hrtime.bigint() - startTime) / 1e6;

    asyncLog({
      user: apiKey.user?._id,
      apiKeyId: apiKey._id,
      apiKeyPrefix: apiKey.keyPrefix,
      apiKeyName: apiKey.name,
      serviceId: service._id,
      serviceSlug: service.slug,
      serviceName: service.name,
      method: req.method,
      path: req.originalUrl,
      statusCode: 429,
      latencyMs: Math.round(latencyMs),
      ip: clientIp,
      userAgent,
      errorMessage: `Rate limit of ${rateLimitResult.limit} requests per ${apiKey.rateLimit.window} exceeded.`,
    });

    return res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. You are limited to ${rateLimitResult.limit} requests per ${apiKey.rateLimit.window}.`,
      limit: rateLimitResult.limit,
      remaining: 0,
      retryAfterSeconds: rateLimitResult.retryAfter,
    });
  }

  // 5. Build Upstream Destination URL
  let upstreamBase = service.targetUrl.trim();
  if (upstreamBase.endsWith('/')) {
    upstreamBase = upstreamBase.slice(0, -1);
  }

  const cleanedSubPath = subPath ? (subPath.startsWith('/') ? subPath : `/${subPath}`) : '';
  const fullTargetUrl = `${upstreamBase}${cleanedSubPath}`;

  // Forward query parameters (filter out api_key)
  const forwardedQuery = { ...req.query };
  delete forwardedQuery.api_key;

  // Prepare Forwarded Headers
  const forwardedHeaders = { ...req.headers };
  delete forwardedHeaders.host;
  delete forwardedHeaders['content-length'];
  delete forwardedHeaders['x-api-key'];
  delete forwardedHeaders['connection'];

  forwardedHeaders['X-Forwarded-For'] = clientIp;
  forwardedHeaders['X-Forwarded-Host'] = req.headers.host || 'gatehouse-gateway';
  forwardedHeaders['X-Gatehouse-Service'] = service.slug;
  forwardedHeaders['X-Gatehouse-Consumer-Key'] = apiKey.keyPrefix;

  // Custom headers injected by upstream service definition
  if (service.headersToInject) {
    const customHeaders =
      service.headersToInject instanceof Map
        ? Object.fromEntries(service.headersToInject)
        : service.headersToInject;
    Object.assign(forwardedHeaders, customHeaders);
  }

  try {
    const upstreamResponse = await axios({
      method: req.method,
      url: fullTargetUrl,
      params: forwardedQuery,
      headers: forwardedHeaders,
      data: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : req.body,
      timeout: service.timeoutMs || 15000,
      validateStatus: () => true, // Pass through all status codes
      responseType: 'arraybuffer', // Clean binary/text/JSON passthrough
    });

    const endTime = process.hrtime.bigint();
    const latencyMs = Number(endTime - startTime) / 1e6;
    const roundedLatency = Math.round(latencyMs * 10) / 10;

    // Attach Gatehouse telemetry headers to client response
    res.setHeader('X-Gatehouse-Latency', `${roundedLatency}ms`);
    res.setHeader('X-Gatehouse-Upstream', service.slug);

    // Forward upstream response headers
    const headersToIgnore = ['content-length', 'transfer-encoding', 'connection'];
    Object.entries(upstreamResponse.headers).forEach(([headerName, headerVal]) => {
      if (!headersToIgnore.includes(headerName.toLowerCase())) {
        res.setHeader(headerName, headerVal);
      }
    });

    // Send response status and data
    res.status(upstreamResponse.status).send(upstreamResponse.data);

    // Asynchronously log the successful/upstream response
    asyncLog({
      user: apiKey.user?._id,
      apiKeyId: apiKey._id,
      apiKeyPrefix: apiKey.keyPrefix,
      apiKeyName: apiKey.name,
      serviceId: service._id,
      serviceSlug: service.slug,
      serviceName: service.name,
      method: req.method,
      path: req.originalUrl,
      upstreamUrl: fullTargetUrl,
      statusCode: upstreamResponse.status,
      latencyMs: roundedLatency,
      ip: clientIp,
      userAgent,
      errorMessage: upstreamResponse.status >= 400 ? `Upstream returned HTTP ${upstreamResponse.status}` : '',
    });

    // Update key statistics in background
    setImmediate(async () => {
      try {
        await ApiKey.findByIdAndUpdate(apiKey._id, {
          $inc: { totalRequests: 1 },
          lastUsedAt: new Date(),
        });
      } catch (e) {
        // non-blocking
      }
    });

  } catch (upstreamErr) {
    const endTime = process.hrtime.bigint();
    const latencyMs = Number(endTime - startTime) / 1e6;
    const roundedLatency = Math.round(latencyMs * 10) / 10;

    let statusCode = 502; // Bad Gateway default
    let errorMessage = 'Upstream gateway error';

    if (upstreamErr.code === 'ECONNABORTED' || upstreamErr.message.includes('timeout')) {
      statusCode = 504; // Gateway Timeout
      errorMessage = `Upstream service timed out after ${service.timeoutMs}ms.`;
    } else if (upstreamErr.code === 'ECONNREFUSED') {
      statusCode = 502;
      errorMessage = `Connection refused by upstream target (${service.targetUrl}).`;
    } else if (upstreamErr.code === 'ENOTFOUND') {
      statusCode = 502;
      errorMessage = `Upstream target host not found (${service.targetUrl}).`;
    } else {
      errorMessage = upstreamErr.message || 'Error communicating with upstream service.';
    }

    res.setHeader('X-Gatehouse-Latency', `${roundedLatency}ms`);

    res.status(statusCode).json({
      success: false,
      error: statusCode === 504 ? 'Gateway Timeout' : 'Bad Gateway',
      message: errorMessage,
      service: service.slug,
      targetUrl: fullTargetUrl,
    });

    asyncLog({
      user: apiKey.user?._id,
      apiKeyId: apiKey._id,
      apiKeyPrefix: apiKey.keyPrefix,
      apiKeyName: apiKey.name,
      serviceId: service._id,
      serviceSlug: service.slug,
      serviceName: service.name,
      method: req.method,
      path: req.originalUrl,
      upstreamUrl: fullTargetUrl,
      statusCode,
      latencyMs: roundedLatency,
      ip: clientIp,
      userAgent,
      errorMessage,
    });
  }
};

module.exports = proxyEngine;
