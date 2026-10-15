const axios = require('axios');
const Service = require('../models/Service');
const ApiKey = require('../models/ApiKey');

// @desc    Get all upstream services
// @route   GET /api/services
// @access  Private
exports.getServices = async (req, res, next) => {
  try {
    const services = await Service.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single upstream service
// @route   GET /api/services/:id
// @access  Private
exports.getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, user: req.user.id });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.status(200).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new upstream service
// @route   POST /api/services
// @access  Private
exports.createService = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      targetUrl,
      description,
      isActive,
      stripPrefix,
      timeoutMs,
      allowedMethods,
      healthCheckPath,
      headersToInject,
    } = req.body;

    if (!name || !slug || !targetUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide service name, slug identifier, and target URL.',
      });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');

    // Check if slug already exists for any user or this user
    const existingSlug = await Service.findOne({ slug: cleanSlug });
    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: `A service with slug '${cleanSlug}' already exists. Please choose a unique slug.`,
      });
    }

    const service = await Service.create({
      user: req.user.id,
      name,
      slug: cleanSlug,
      targetUrl: targetUrl.trim(),
      description,
      isActive: isActive !== undefined ? isActive : true,
      stripPrefix: stripPrefix !== undefined ? stripPrefix : true,
      timeoutMs: timeoutMs || 15000,
      allowedMethods: allowedMethods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      healthCheckPath: healthCheckPath || '',
      headersToInject: headersToInject || {},
    });

    res.status(201).json({
      success: true,
      data: service,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update upstream service
// @route   PUT /api/services/:id
// @access  Private
exports.updateService = async (req, res, next) => {
  try {
    let service = await Service.findOne({ _id: req.params.id, user: req.user.id });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // If slug is changing, check uniqueness
    if (req.body.slug && req.body.slug !== service.slug) {
      const cleanSlug = req.body.slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
      const existing = await Service.findOne({ slug: cleanSlug, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Slug '${cleanSlug}' is already in use by another service.`,
        });
      }
      req.body.slug = cleanSlug;
    }

    service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete upstream service
// @route   DELETE /api/services/:id
// @access  Private
exports.deleteService = async (req, res, next) => {
  try {
    const service = await Service.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Remove this service from any allowedServices arrays in ApiKey
    await ApiKey.updateMany(
      { allowedServices: service._id },
      { $pull: { allowedServices: service._id } }
    );

    res.status(200).json({
      success: true,
      message: `Service '${service.name}' removed successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Test Upstream Service Health Ping
// @route   POST /api/services/:id/test-ping
// @access  Private
exports.testServicePing = async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, user: req.user.id });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    let testUrl = service.targetUrl;
    if (service.healthCheckPath) {
      const prefix = service.healthCheckPath.startsWith('/') ? '' : '/';
      testUrl = `${service.targetUrl}${prefix}${service.healthCheckPath}`;
    }

    const startTime = Date.now();
    try {
      const response = await axios.get(testUrl, {
        timeout: 6000,
        validateStatus: () => true,
      });

      const latencyMs = Date.now() - startTime;
      const isHealthy = response.status >= 200 && response.status < 400;

      service.healthStatus = isHealthy ? 'healthy' : 'unhealthy';
      service.lastHealthCheck = new Date();
      await service.save();

      res.status(200).json({
        success: true,
        healthy: isHealthy,
        statusCode: response.status,
        latencyMs,
        message: `Upstream responded with HTTP ${response.status} in ${latencyMs}ms.`,
      });
    } catch (pingErr) {
      const latencyMs = Date.now() - startTime;
      service.healthStatus = 'unhealthy';
      service.lastHealthCheck = new Date();
      await service.save();

      res.status(200).json({
        success: false,
        healthy: false,
        statusCode: 0,
        latencyMs,
        message: `Ping failed: ${pingErr.message}`,
      });
    }
  } catch (err) {
    next(err);
  }
};
