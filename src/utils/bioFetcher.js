/**
 * Bio Fetcher Module
 * Handles fetching Twitter user bios via GraphQL API
 * Pure data fetching - no DOM manipulation
 */

const BioFetcher = {
  // Queue state
  queue: new Set(),
  inProgress: new Set(),
  activeCount: 0,
  timer: null,
  csrfToken: null,

  // Configuration
  INTERVAL: 300, // ms between fetches (rate limiting)
  MAX_CONCURRENT: 3, // Max parallel fetches

  // Twitter API configuration
  // Bearer tokens used by Twitter's web client (public, not secret)
  // Primary token with fallback in case Twitter rotates it
  BEARER_TOKENS: [
    'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF'
  ],
  currentTokenIndex: 0,

  /**
   * Get the current bearer token, with automatic fallback on failure
   * @returns {string}
   */
  getBearerToken() {
    return this.BEARER_TOKENS[this.currentTokenIndex] || this.BEARER_TOKENS[0];
  },

  /**
   * Switch to the next bearer token (called on auth failures)
   * @returns {boolean} - Whether there was another token to try
   */
  rotateToken() {
    if (this.currentTokenIndex < this.BEARER_TOKENS.length - 1) {
      this.currentTokenIndex++;
      groveLog.log(`[BioFetcher] Rotating to fallback bearer token (index: ${this.currentTokenIndex})`);
      return true;
    }
    return false;
  },

  // Callbacks set by content.js
  callbacks: {
    onBioFetched: null, // Called with (username, {displayName, bio})
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
    this.csrfToken = null;
    this.currentTokenIndex = 0; // Reset token rotation
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
   * Get Twitter CSRF token from cookies
   * @returns {string|null}
   */
  getTwitterCsrfToken() {
    if (this.csrfToken) return this.csrfToken;

    // Extract ct0 cookie (CSRF token used by Twitter)
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'ct0') {
        this.csrfToken = value;
        return value;
      }
    }
    return null;
  },

  /**
   * Fetch user bio using Twitter's GraphQL API
   * @param {string} username - Twitter username
   * @returns {Promise<{displayName: string|null, bio: string|null, error?: string}>}
   */
  async fetchUserBio(username) {
    groveLog.log(`[BioFetcher] Fetching bio for @${username}...`);

    const csrfToken = this.getTwitterCsrfToken();
    if (!csrfToken) {
      groveLog.log(`[BioFetcher] No CSRF token found for @${username}`);
      return { displayName: null, bio: null, error: 'No CSRF token found' };
    }

    // Use Twitter's user lookup endpoint
    const url = `https://x.com/i/api/graphql/BQ6xjFU6Mgm-WhEP3OiT9w/UserByScreenName?variables=${encodeURIComponent(JSON.stringify({
      screen_name: username,
      withSafetyModeUserFields: true
    }))}&features=${encodeURIComponent(JSON.stringify({
      hidden_profile_subscriptions_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      subscriptions_verification_info_is_identity_verified_enabled: true,
      subscriptions_verification_info_verified_since_enabled: true,
      highlights_tweets_tab_ui_enabled: true,
      responsive_web_twitter_article_notes_tab_enabled: true,
      subscriptions_feature_can_gift_premium: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true
    }))}&fieldToggles=${encodeURIComponent(JSON.stringify({
      withAuxiliaryUserLabels: false
    }))}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${decodeURIComponent(this.getBearerToken())}`,
          'x-csrf-token': csrfToken,
          'x-twitter-active-user': 'yes',
          'x-twitter-auth-type': 'OAuth2Session',
          'x-twitter-client-language': 'en',
          'content-type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        groveLog.log(`[BioFetcher] API response for @${username}: ${response.status} - ${errorText.substring(0, 200)}`);

        // On auth failure, try rotating to fallback token
        if ((response.status === 401 || response.status === 403) && this.rotateToken()) {
          groveLog.log(`[BioFetcher] Retrying @${username} with fallback token`);
          return this.fetchUserBio(username); // Retry with new token
        }

        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Extract user data from GraphQL response
      const user = data?.data?.user?.result;
      if (!user || user.__typename === 'UserUnavailable') {
        return { displayName: null, bio: null, error: 'User not found' };
      }

      const legacy = user.legacy || {};
      groveLog.log(`[BioFetcher] Got bio for @${username}: "${legacy.description?.substring(0, 100)}..."`);
      return {
        displayName: legacy.name || null,
        bio: legacy.description || null
      };
    } catch (error) {
      console.error(`[Grove BioFetcher] Twitter API error for @${username}:`, error);
      return { displayName: null, bio: null, error: error.message };
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
    // Process queue items up to MAX_CONCURRENT limit
    // Re-check activeCount each iteration to handle concurrent calls safely
    while (this.activeCount < this.MAX_CONCURRENT && this.queue.size > 0) {
      const username = this.queue.values().next().value;
      if (!username) break;

      // Double-check we haven't exceeded the limit (defensive against race conditions)
      if (this.activeCount >= this.MAX_CONCURRENT) {
        groveLog.log('[BioFetcher] Concurrency limit reached, deferring remaining fetches');
        break;
      }

      this.queue.delete(username);
      this.inProgress.add(username);

      // Increment activeCount synchronously before starting the async fetch
      // This ensures the count is accurate for the next iteration
      this.activeCount++;

      // Start fetch (don't await - let it run in parallel)
      this._executeFetch(username);
    }

    // Schedule next batch if there are more items and we have capacity
    if (this.queue.size > 0 && this.activeCount < this.MAX_CONCURRENT) {
      this.scheduleNextFetch();
    }
  },

  /**
   * Execute a single bio fetch (separated from processSingleFetch for cleaner activeCount management)
   * @param {string} username - Twitter username to fetch
   * @private
   */
  async _executeFetch(username) {
    try {
      const response = await this.fetchUserBio(username);
      this.inProgress.delete(username);

      if (response && !response.error) {
        // Success - call the callback
        if (this.callbacks.onBioFetched) {
          this.callbacks.onBioFetched(username, response);
        }
      } else {
        // Fetch failed
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
