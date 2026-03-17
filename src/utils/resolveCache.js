/**
 * Resolve Cache
 * Caches /v1/tip/resolve API results to reduce redundant network requests.
 *
 * Why chrome.storage.local instead of IndexedDB / idb?
 * ─────────────────────────────────────────────────────
 * 1. Extension-scoped by default — chrome.storage.local is shared across all
 *    content scripts and the service worker within the extension's origin.
 *    IndexedDB in content scripts runs in the *page's* origin, so each site
 *    would get its own isolated database instead of a single shared cache.
 * 2. No bundler needed — the extension loads JS files directly via manifest.json
 *    (no webpack/vite). Adding the `idb` npm package would require either
 *    bundling all content scripts or vendoring a standalone build.
 * 3. Right-sized for the workload — we store ~500 small JSON entries keyed by
 *    URL. chrome.storage.local handles this with minimal overhead. IndexedDB
 *    shines for large datasets, complex queries, or binary blobs — none of
 *    which apply here.
 * 4. Consistent with existing patterns — AddressCache and MetadataFetcher
 *    already use in-memory Maps; this cache adds persistence via the same
 *    chrome.storage.local API the rest of the extension relies on.
 */

/**
 * ── Resolve Cache Constants ──────────────────────────────────────────────────
 *
 * RESOLVE_POSITIVE_TTL (30 min)
 *   How long a "tippable: true" result stays cached before we re-check.
 *   Addresses change infrequently, so a longer window is safe and avoids
 *   hammering the API on repeat visits to the same creator's profile.
 *
 * RESOLVE_NEGATIVE_TTL (10 min)
 *   How long a "tippable: false" result stays cached.
 *   Shorter than positive because a creator may register at any time and
 *   we want to discover them reasonably quickly.
 *
 * RESOLVE_MAX_ENTRIES (500)
 *   Upper bound on cached destinations. Prevents unbounded growth in
 *   chrome.storage.local. When exceeded, expired entries are pruned first,
 *   then the oldest entries are evicted (LRU).
 *
 * RESOLVE_STORAGE_KEY
 *   The chrome.storage.local key under which the entire cache is persisted
 *   as a single JSON object.
 */
const RESOLVE_POSITIVE_TTL = 30 * 60 * 1000; // 30 minutes
const RESOLVE_NEGATIVE_TTL = 10 * 60 * 1000; // 10 minutes
const RESOLVE_MAX_ENTRIES = 500;
const RESOLVE_STORAGE_KEY = 'GROVE_RESOLVE_CACHE';

class ResolveCache {
  static POSITIVE_TTL = RESOLVE_POSITIVE_TTL;
  static NEGATIVE_TTL = RESOLVE_NEGATIVE_TTL;
  static MAX_ENTRIES = RESOLVE_MAX_ENTRIES;
  static STORAGE_KEY = RESOLVE_STORAGE_KEY;

  // In-memory mirror for synchronous-fast reads within the same page lifecycle.
  // Hydrated from chrome.storage.local on first access.
  static memCache = new Map();
  static hydrated = false;

  /**
   * Load the persistent cache into memory (once per content-script lifetime).
   * Safe to call multiple times — only the first call actually reads storage.
   */
  static async hydrate() {
    if (this.hydrated) return;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(this.STORAGE_KEY);
        const stored = result[this.STORAGE_KEY];
        if (stored && typeof stored === 'object') {
          const now = Date.now();
          for (const [key, entry] of Object.entries(stored)) {
            const ttl = entry.tippable ? this.POSITIVE_TTL : this.NEGATIVE_TTL;
            if (now - entry.timestamp < ttl) {
              this.memCache.set(key, entry);
            }
          }
        }
      }
    } catch (e) {
      // Storage unavailable (e.g., extension context invalidated) — proceed with empty cache
      if (typeof groveLog !== 'undefined') {
        groveLog.warn('[ResolveCache] Failed to hydrate from storage:', e.message);
      }
    }

    this.hydrated = true;
  }

  /**
   * Look up a cached resolve result.
   * @param {string} destination - The tipDomain key (e.g., "x.com/alice")
   * @returns {Promise<Object|null>} - Cached result or null if miss/expired
   */
  static async get(destination) {
    await this.hydrate();

    const entry = this.memCache.get(destination);
    if (!entry) return null;

    const ttl = entry.tippable ? this.POSITIVE_TTL : this.NEGATIVE_TTL;
    if (Date.now() - entry.timestamp > ttl) {
      this.memCache.delete(destination);
      // Lazy eviction — don't bother persisting the deletion now.
      // The expired entry will remain in chrome.storage.local until the next
      // set() or clear() call, which avoids a redundant storage write now.
      return null;
    }

    if (typeof groveLog !== 'undefined') {
      groveLog.log(`[ResolveCache] HIT for "${destination}" (tippable: ${entry.tippable})`);
    }
    return entry.result;
  }

  /**
   * Store a resolve result.
   * @param {string} destination - The tipDomain key
   * @param {Object} result - The full resolve response ({ tippable, addresses, source, error })
   */
  static async set(destination, result) {
    await this.hydrate();

    const entry = {
      tippable: !!result.tippable,
      result,
      timestamp: Date.now(),
    };

    this.memCache.set(destination, entry);

    // Evict if over capacity
    if (this.memCache.size > this.MAX_ENTRIES) {
      this.prune();
    }

    await this.persist();
  }

  /**
   * Remove expired entries, then evict oldest if still over MAX_ENTRIES.
   */
  static prune() {
    const now = Date.now();

    // Pass 1: remove expired
    for (const [key, entry] of this.memCache) {
      const ttl = entry.tippable ? this.POSITIVE_TTL : this.NEGATIVE_TTL;
      if (now - entry.timestamp > ttl) {
        this.memCache.delete(key);
      }
    }

    // Pass 2: LRU eviction if still over limit
    if (this.memCache.size > this.MAX_ENTRIES) {
      const sorted = [...this.memCache.entries()].sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      const toRemove = sorted.slice(0, this.memCache.size - this.MAX_ENTRIES);
      for (const [key] of toRemove) {
        this.memCache.delete(key);
      }
    }
  }

  /**
   * Persist the in-memory cache to chrome.storage.local.
   */
  static async persist() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const obj = {};
        for (const [key, entry] of this.memCache) {
          obj[key] = entry;
        }
        await chrome.storage.local.set({ [this.STORAGE_KEY]: obj });
      }
    } catch (e) {
      if (typeof groveLog !== 'undefined') {
        groveLog.warn('[ResolveCache] Failed to persist cache:', e.message);
      }
    }
  }

  /**
   * Clear the cache (useful for testing and manual cache busting).
   * @param {string} [destination] - Optional key to clear; omit to clear all
   */
  static async clear(destination) {
    if (destination) {
      this.memCache.delete(destination);
    } else {
      this.memCache.clear();
    }
    await this.persist();
  }

  /**
   * Reset internal state (for tests).
   */
  static reset() {
    this.memCache.clear();
    this.hydrated = false;
  }
}

// Export to window for browser context
if (typeof window !== 'undefined') {
  window.ResolveCache = ResolveCache;
  window.RESOLVE_POSITIVE_TTL = RESOLVE_POSITIVE_TTL;
  window.RESOLVE_NEGATIVE_TTL = RESOLVE_NEGATIVE_TTL;
  window.RESOLVE_MAX_ENTRIES = RESOLVE_MAX_ENTRIES;
  window.RESOLVE_STORAGE_KEY = RESOLVE_STORAGE_KEY;
}
