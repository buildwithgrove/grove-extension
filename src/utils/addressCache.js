/**
 * Address Cache Utility
 * Caches resolved addresses with TTL for performance
 */

const ADDRESS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

class AddressCache {
  constructor(ttl = ADDRESS_CACHE_TTL) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Get cached address for a username
   * @param {string} username - Username/identifier
   * @returns {Object|string|null} - Cached data, 'no-address', or null if not cached/expired
   */
  get(username) {
    const cached = this.cache.get(username);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(username);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached address for a username
   * @param {string} username - Username/identifier
   * @param {Object|string} data - Address result or 'no-address'
   */
  set(username, data) {
    this.cache.set(username, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Check if username exists in cache (regardless of expiry)
   * @param {string} username - Username/identifier
   * @returns {boolean}
   */
  has(username) {
    return this.cache.has(username);
  }

  /**
   * Delete a cached entry
   * @param {string} username - Username/identifier
   */
  delete(username) {
    this.cache.delete(username);
  }

  /**
   * Clear all cached entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get the number of cached entries
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }
}

// Export for different module systems
if (typeof window !== 'undefined') {
  window.AddressCache = AddressCache;
  window.ADDRESS_CACHE_TTL = ADDRESS_CACHE_TTL;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AddressCache, ADDRESS_CACHE_TTL };
}
