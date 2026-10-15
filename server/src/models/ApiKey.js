const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide an API key name or purpose'],
      trim: true,
      maxlength: [80, 'Key name cannot exceed 80 characters'],
    },
    keyPrefix: {
      type: String,
      required: true,
      trim: true,
    },
    hashedKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },
    rateLimit: {
      requests: {
        type: Number,
        default: 60,
        min: [1, 'Rate limit must be at least 1 request'],
        max: [100000, 'Rate limit cannot exceed 100,000 requests'],
      },
      window: {
        type: String,
        enum: ['1m', '1h', '1d'],
        default: '1m',
      },
      windowMs: {
        type: Number,
        default: 60000, // 1 minute in milliseconds
      },
    },
    allowedServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    expiresAt: {
      type: Date,
    },
    lastUsedAt: {
      type: Date,
    },
    totalRequests: {
      type: Number,
      default: 0,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Helper to pre-calculate windowMs from window string
apiKeySchema.pre('save', function (next) {
  if (this.rateLimit) {
    if (this.rateLimit.window === '1m') this.rateLimit.windowMs = 60 * 1000;
    else if (this.rateLimit.window === '1h') this.rateLimit.windowMs = 60 * 60 * 1000;
    else if (this.rateLimit.window === '1d') this.rateLimit.windowMs = 24 * 60 * 60 * 1000;
  }
  next();
});

module.exports = mongoose.model('ApiKey', apiKeySchema);
