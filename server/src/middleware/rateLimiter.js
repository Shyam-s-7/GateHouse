/**
 * Sliding Window Counter Rate Limiter
 * Tracks API key request frequencies with sub-millisecond precision
 * Enforces X-RateLimit-* standard headers and 429 Too Many Requests
 */

class SlidingWindowRateLimiter {
  constructor() {
    // Map of keyId -> array of timestamp numbers (ms)
    this.storage = new Map();
    
    // Automatic garbage collection every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);

    // Ensure interval doesn't prevent process from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Check and record a request for a given key
   * @param {string} keyIdentifier - Unique key ID (e.g. apiKey._id.toString())
   * @param {number} maxRequests - Max requests permitted in the window
   * @param {number} windowMs - Window duration in milliseconds (e.g. 60000)
   * @returns {{ allowed: boolean, limit: number, remaining: number, resetTime: number, retryAfter: number }}
   */
  check(keyIdentifier, maxRequests, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.storage.get(keyIdentifier);
    if (!record) {
      record = [];
      this.storage.set(keyIdentifier, record);
    }

    // Filter out timestamps outside the sliding window
    while (record.length > 0 && record[0] <= windowStart) {
      record.shift();
    }

    const currentUsage = record.length;
    const limit = maxRequests;

    if (currentUsage >= limit) {
      // Exceeded limit
      const oldestTimestamp = record[0] || now;
      const resetTime = oldestTimestamp + windowMs;
      const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000));

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime: Math.ceil(resetTime / 1000), // Unix epoch in seconds
        retryAfter,
      };
    }

    // Record this request
    record.push(now);

    const remaining = Math.max(0, limit - record.length);
    const oldestTimestamp = record[0];
    const resetTime = oldestTimestamp + windowMs;

    return {
      allowed: true,
      limit,
      remaining,
      resetTime: Math.ceil(resetTime / 1000),
      retryAfter: 0,
    };
  }

  /**
   * Reset rate limit state for a key (e.g., when key is updated or manually reset)
   */
  reset(keyIdentifier) {
    this.storage.delete(keyIdentifier);
  }

  /**
   * Memory cleanup for stale keys
   */
  cleanup() {
    const now = Date.now();
    const maxWindowAge = 24 * 60 * 60 * 1000; // 24 hours max
    for (const [key, timestamps] of this.storage.entries()) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] < now - maxWindowAge) {
        this.storage.delete(key);
      }
    }
  }
}

// Singleton rate limiter instance
const rateLimiterInstance = new SlidingWindowRateLimiter();

module.exports = rateLimiterInstance;
