const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a service name'],
      trim: true,
      maxlength: [80, 'Service name cannot exceed 80 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Please provide a unique service slug/route identifier'],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-_]+$/, 'Slug must only contain lowercase alphanumeric, dash, or underscore'],
      index: true,
    },
    targetUrl: {
      type: String,
      required: [true, 'Please provide the target upstream URL'],
      trim: true,
      match: [/^https?:\/\/.+/, 'Target URL must start with http:// or https://'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    stripPrefix: {
      type: Boolean,
      default: true,
    },
    timeoutMs: {
      type: Number,
      default: 15000,
      min: [1000, 'Timeout must be at least 1000ms'],
      max: [60000, 'Timeout cannot exceed 60000ms'],
    },
    allowedMethods: {
      type: [String],
      default: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },
    healthCheckPath: {
      type: String,
      default: '',
      trim: true,
    },
    healthStatus: {
      type: String,
      enum: ['healthy', 'unhealthy', 'unknown'],
      default: 'unknown',
    },
    lastHealthCheck: {
      type: Date,
    },
    headersToInject: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user + slug
serviceSchema.index({ user: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Service', serviceSchema);
