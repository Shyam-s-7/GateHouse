const crypto = require('crypto');

/**
 * Generate a cryptographically secure API key
 * Format: gh_live_<32_random_hex_characters>
 * Returns { rawKey, keyPrefix, hashedKey }
 */
function generateApiKey(environment = 'live') {
  const prefix = `gh_${environment}_`;
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `${prefix}${randomBytes}`;
  const keyPrefix = rawKey.substring(0, 14) + '...';
  const hashedKey = hashApiKey(rawKey);

  return {
    rawKey,
    keyPrefix,
    hashedKey,
  };
}

/**
 * Hash raw API key using SHA-256
 */
function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

module.exports = {
  generateApiKey,
  hashApiKey,
};
