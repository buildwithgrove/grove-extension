/**
 * Bio Fetcher Module
 * Resolves X/Twitter user tippability via the Grove API.
 *
 * Uses GET /v1/tip/resolve?destination=x.com/{username} instead of
 * Twitter's internal GraphQL API. This is more reliable (no CSRF tokens
 * or scraped bearer tokens) and uses the same resolution logic as the
 * web app and SDK.
 */

const BioFetcher = {
  // Queue state
  queue: new Set(),
  inProgress: new Set(),
  activeCount: 0,
  timer: null,

  // Configuration
  INTERVAL: 300, // ms between fetches (rate limiting)
  MAX_CONCURRENT: 3, // Max parallel fetches

  // Callbacks set by content.js
  callbacks: {
    onBioFetched: null, // Called with (username, {tippable, address, type})
    onFetchError: null, // Called with (username, error)
    isUserCached: null  // Called with (username) to check if already cached
  },

  /**
   * Initialize the bio fetcher with callbacks
   * @param {Object} callbacks - Callback functions
   */
  init(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  },

  /**
   * Reset state (useful for cleanup)
   */
  reset() {
    this.queue.clear();
    this.inProgress.clear();
    this.activeCount = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  },

  /**
   * Queue a username for bio fetching
   * @param {string} username - Twitter username
   * @returns {boolean} - Whether the username was queued
   */
  queueFetch(username) {
    // Check if already cached via callback
    if (this.callbacks.isUserCached && this.callbacks.isUserCached(username)) {
      groveLog.log(`[BioFetcher] @${username} already cached`);
      return false;
    }

    if (this.inProgress.has(username)) {
      groveLog.log(`[BioFetcher] @${username} already in progress`);
      return false;
    }

    if (this.queue.has(username)) {
      groveLog.log(`[BioFetcher] @${username} already in queue`);
      return false;
    }

    groveLog.log(`[BioFetcher] Adding @${username} to queue (queue size: ${this.queue.size})`);
    this.queue.add(username);
    this.scheduleNextFetch();
    return true;
  },

  /**
   * Resolve a user's tippability via the Grove API.
   * @param {string} username - Twitter username
   * @returns {Promise<{tippable: boolean, address: string|null, type: string|null, error?: string}>}
   */
  async fetchUserBio(username) {
    groveLog.log(`[BioFetcher] Resolving @${username} via Grove API...`);

    try {
      const result = await GroveAPI.resolveDestination(`x.com/${username}`);

      if (!result) {
        return { tippable: false, address: null, type: null, error: 'No response from API' };
      }

      if (result.tippable && result.addresses && result.addresses.length > 0) {
        // Pick the first address (same logic the extension tip flow uses)
        const primary = result.addresses[0];
        groveLog.log(`[BioFetcher] @${username} is tippable: ${primary.address} (${primary.token}/${primary.chain})`);
        return {
          tippable: true,
          address: primary.address,
          type: primary.token || 'USDC',
          chain: primary.chain || 'base',
          source: primary.source || 'bio'
        };
      }

      groveLog.log(`[BioFetcher] @${username} is not tippable`);
      return { tippable: false, address: null, type: null };
    } catch (error) {
      console.error(`[Grove BioFetcher] API error for @${username}:`, error);
      return { tippable: false, address: null, type: null, error: error.message };
    }
  },

  /**
   * Schedule the next bio fetch from the queue
   */
  scheduleNextFetch() {
    if (this.activeCount >= this.MAX_CONCURRENT) return;
    if (this.queue.size === 0) return;
    if (this.timer) return;

    this.timer = setTimeout(() => {
      this.timer = null;
      this.processQueue();
    }, this.INTERVAL);
  },

  /**
   * Process the bio fetch queue
   * Guards against race conditions by re-checking activeCount before each fetch
   */
  processQueue() {
    while (this.activeCount < this.MAX_CONCURRENT && this.queue.size > 0) {
      const username = this.queue.values().next().value;
      if (!username) break;

      if (this.activeCount >= this.MAX_CONCURRENT) {
        groveLog.log('[BioFetcher] Concurrency limit reached, deferring remaining fetches');
        break;
      }

      this.queue.delete(username);
      this.inProgress.add(username);
      this.activeCount++;

      // Start fetch (don't await - let it run in parallel)
      this._executeFetch(username);
    }

    if (this.queue.size > 0 && this.activeCount < this.MAX_CONCURRENT) {
      this.scheduleNextFetch();
    }
  },

  /**
   * Execute a single bio fetch
   * @param {string} username - Twitter username to fetch
   * @private
   */
  async _executeFetch(username) {
    try {
      const response = await this.fetchUserBio(username);
      this.inProgress.delete(username);

      if (response && !response.error) {
        if (this.callbacks.onBioFetched) {
          this.callbacks.onBioFetched(username, response);
        }
      } else {
        groveLog.log(`[BioFetcher] Fetch failed for @${username}: ${response?.error || 'unknown error'}`);
        if (this.callbacks.onFetchError) {
          this.callbacks.onFetchError(username, response?.error || 'unknown error');
        }
      }
    } catch (error) {
      this.inProgress.delete(username);
      console.error(`[Grove BioFetcher] Fetch error for @${username}:`, error);
      if (this.callbacks.onFetchError) {
        this.callbacks.onFetchError(username, error.message);
      }
    }

    this.activeCount--;
    this.scheduleNextFetch();
  },

  /**
   * Check if a username is currently being fetched or queued
   * @param {string} username
   * @returns {boolean}
   */
  isPending(username) {
    return this.queue.has(username) || this.inProgress.has(username);
  }
};
