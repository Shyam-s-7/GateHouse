const ApiKey = require('../models/ApiKey');
const { generateApiKey } = require('../utils/cryptoUtils');
const rateLimiter = require('../middleware/rateLimiter');

// @desc    Get all API keys for user
// @route   GET /api/keys
// @access  Private
exports.getApiKeys = async (req, res, next) => {
  try {
    const keys = await ApiKey.find({ user: req.user.id })
      .populate('allowedServices', 'name slug')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: keys.length,
      data: keys,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single API key
// @route   GET /api/keys/:id
// @access  Private
exports.getApiKeyById = async (req, res, next) => {
  try {
    const key = await ApiKey.findOne({ _id: req.params.id, user: req.user.id })
      .populate('allowedServices', 'name slug');

    if (!key) {
      return res.status(404).json({ success: false, message: 'API Key not found' });
    }

    res.status(200).json({ success: true, data: key });
  } catch (err) {
    next(err);
  }
};

// @desc    Generate and create new API key
// @route   POST /api/keys
// @access  Private
exports.createApiKey = async (req, res, next) => {
  try {
    const { name, requestsPerMinute, window, allowedServices, expiresAt } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a name or description for this API key.',
      });
    }

    const { rawKey, keyPrefix, hashedKey } = generateApiKey('live');

    const rateWindow = window || '1m';
    const limit = requestsPerMinute ? Number(requestsPerMinute) : 60;

    let windowMs = 60 * 1000;
    if (rateWindow === '1h') windowMs = 60 * 60 * 1000;
    if (rateWindow === '1d') windowMs = 24 * 60 * 60 * 1000;

    const apiKey = await ApiKey.create({
      user: req.user.id,
      name,
      keyPrefix,
      hashedKey,
      rateLimit: {
        requests: limit,
        window: rateWindow,
        windowMs,
      },
      allowedServices: allowedServices || [],
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: 'active',
    });

    const populatedKey = await ApiKey.findById(apiKey._id).populate('allowedServices', 'name slug');

    // IMPORTANT: rawKey is only returned once upon generation
    res.status(201).json({
      success: true,
      data: {
        ...populatedKey.toObject(),
        rawKey, // Revealed once to platform user
      },
      message: 'API Key created successfully. Store this secret key safely; it cannot be viewed again.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update API key (rate limits, allowed services, name)
// @route   PUT /api/keys/:id
// @access  Private
exports.updateApiKey = async (req, res, next) => {
  try {
    const { name, requests, window, allowedServices, status } = req.body;

    let key = await ApiKey.findOne({ _id: req.params.id, user: req.user.id });
    if (!key) {
      return res.status(404).json({ success: false, message: 'API Key not found' });
    }

    if (name) key.name = name;
    if (allowedServices !== undefined) key.allowedServices = allowedServices;
    if (status && ['active', 'revoked'].includes(status)) {
      key.status = status;
      if (status === 'revoked') key.revokedAt = new Date();
    }

    if (requests || window) {
      if (requests) key.rateLimit.requests = Number(requests);
      if (window) {
        key.rateLimit.window = window;
        if (window === '1m') key.rateLimit.windowMs = 60 * 1000;
        else if (window === '1h') key.rateLimit.windowMs = 60 * 60 * 1000;
        else if (window === '1d') key.rateLimit.windowMs = 24 * 60 * 60 * 1000;
      }
      // Reset active sliding window cache so new limit takes effect immediately
      rateLimiter.reset(key._id.toString());
    }

    await key.save();
    const updated = await ApiKey.findById(key._id).populate('allowedServices', 'name slug');

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Revoke API key immediately
// @route   POST /api/keys/:id/revoke
// @access  Private
exports.revokeApiKey = async (req, res, next) => {
  try {
    const key = await ApiKey.findOne({ _id: req.params.id, user: req.user.id });
    if (!key) {
      return res.status(404).json({ success: false, message: 'API Key not found' });
    }

    key.status = 'revoked';
    key.revokedAt = new Date();
    await key.save();

    // Purge from rate limiter in-memory cache
    rateLimiter.reset(key._id.toString());

    res.status(200).json({
      success: true,
      message: `API Key '${key.name}' (${key.keyPrefix}) has been revoked immediately.`,
      data: key,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete API key permanently
// @route   DELETE /api/keys/:id
// @access  Private
exports.deleteApiKey = async (req, res, next) => {
  try {
    const key = await ApiKey.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!key) {
      return res.status(404).json({ success: false, message: 'API Key not found' });
    }

    rateLimiter.reset(key._id.toString());

    res.status(200).json({
      success: true,
      message: 'API Key deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
