const mongoose = require('mongoose');

const gatewayLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiKey',
      index: true,
    },
    apiKeyPrefix: {
      type: String,
      default: 'Unknown',
    },
    apiKeyName: {
      type: String,
      default: 'Anonymous',
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      index: true,
    },
    serviceSlug: {
      type: String,
      required: true,
      index: true,
    },
    serviceName: {
      type: String,
      default: 'Unknown Service',
    },
    method: {
      type: String,
      required: true,
      uppercase: true,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    },
    path: {
      type: String,
      required: true,
    },
    upstreamUrl: {
      type: String,
    },
    statusCode: {
      type: Number,
      required: true,
      index: true,
    },
    latencyMs: {
      type: Number,
      required: true,
      default: 0,
    },
    ip: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: '',
    },
    errorMessage: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound indexes for lightning fast dashboard aggregation queries
gatewayLogSchema.index({ user: 1, timestamp: -1 });
gatewayLogSchema.index({ user: 1, serviceId: 1, timestamp: -1 });
gatewayLogSchema.index({ user: 1, statusCode: 1 });

module.exports = mongoose.model('GatewayLog', gatewayLogSchema);
