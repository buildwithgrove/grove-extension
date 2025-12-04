/**
 * Metadata Fetcher
 * Fetches and parses llms.txt and ai.txt files from websites
 * to detect tippable addresses
 */

class MetadataFetcher {
  // Cache for metadata results: domain -> { data, timestamp }
  static cache = new Map();
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch metadata files from the current site and check for addresses
   * @param {string} origin - The site origin (e.g., https://example.com)
   * @returns {Promise<{found: boolean, source: string|null, content: string|null, address: Object|null}>}
   */
  static async fetchAndCheck(origin) {
    if (!origin) {
      origin = window.location.origin;
    }

    // Check cache first
    const cached = this.getCached(origin);
    if (cached !== null) {
      return cached;
    }

    // Try to fetch metadata files in order of priority
    const filesToTry = [
      '/llms.txt',
      '/ai.txt',
      '/.well-known/llms.txt',
      '/.well-known/ai.txt'
    ];

    for (const file of filesToTry) {
      try {
        const url = origin + file;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/plain'
          },
          // Short timeout to avoid hanging
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          const content = await response.text();

          // Check if the content contains any tippable addresses
          if (AddressParser.hasAddresses(content)) {
            const addressResult = AddressParser.resolveAddress(content);

            if (addressResult.address) {
              const result = {
                found: true,
                source: file,
                content: content,
                address: addressResult
              };
              this.setCache(origin, result);
              return result;
            }
          }
        }
      } catch (error) {
        // Silently continue to next file
        continue;
      }
    }

    // No metadata found
    const result = {
      found: false,
      source: null,
      content: null,
      address: null
    };
    this.setCache(origin, result);
    return result;
  }

  /**
   * Get cached result for a domain
   * @param {string} origin - The site origin
   * @returns {Object|null} - Cached result or null if not cached/expired
   */
  static getCached(origin) {
    const cached = this.cache.get(origin);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(origin);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache for a domain
   * @param {string} origin - The site origin
   * @param {Object} data - The result to cache
   */
  static setCache(origin, data) {
    this.cache.set(origin, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for a domain or all domains
   * @param {string} origin - Optional origin to clear, or clears all if not provided
   */
  static clearCache(origin) {
    if (origin) {
      this.cache.delete(origin);
    } else {
      this.cache.clear();
    }
  }
}

if (typeof window !== 'undefined') {
  window.MetadataFetcher = MetadataFetcher;
}
