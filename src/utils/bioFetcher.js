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
  // Bearer token is public and used by Twitter's web client
  BEARER_TOKEN: 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',

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
  },

  /**
   * Queue a username for bio fetching
   * @param {string} username - Twitter username
   * @returns {boolean} - Whether the username was queued
   */
  queueFetch(username) {
    // Check if already cached via callback
    if (this.callbacks.isUserCached && this.callbacks.isUserCached(username)) {
      console.log(`[Grove BioFetcher] @${username} already cached`);
      return false;
    }

    if (this.inProgress.has(username)) {
      console.log(`[Grove BioFetcher] @${username} already in progress`);
      return false;
    }

    if (this.queue.has(username)) {
      console.log(`[Grove BioFetcher] @${username} already in queue`);
      return false;
    }

    console.log(`[Grove BioFetcher] Adding @${username} to queue (queue size: ${this.queue.size})`);
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
    console.log(`[Grove BioFetcher] Fetching bio for @${username}...`);

    const csrfToken = this.getTwitterCsrfToken();
    if (!csrfToken) {
      console.log(`[Grove BioFetcher] No CSRF token found for @${username}`);
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
          'authorization': `Bearer ${decodeURIComponent(this.BEARER_TOKEN)}`,
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
        console.log(`[Grove BioFetcher] API response for @${username}: ${response.status} - ${errorText.substring(0, 200)}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Extract user data from GraphQL response
      const user = data?.data?.user?.result;
      if (!user || user.__typename === 'UserUnavailable') {
        return { displayName: null, bio: null, error: 'User not found' };
      }

      const legacy = user.legacy || {};
      console.log(`[Grove BioFetcher] Got bio for @${username}: "${legacy.description?.substring(0, 100)}..."`);
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
   * Process a single bio fetch
   * @param {string} username - Twitter username to fetch
   */
  async processSingleFetch(username) {
    this.activeCount++;

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
        console.log(`[Grove BioFetcher] Fetch failed for @${username}: ${response?.error || 'unknown error'}`);
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
   */
  processQueue() {
    while (this.activeCount < this.MAX_CONCURRENT && this.queue.size > 0) {
      const username = this.queue.values().next().value;
      if (!username) break;

      this.queue.delete(username);
      this.inProgress.add(username);

      // Start fetch (don't await - let it run in parallel)
      this.processSingleFetch(username);
    }

    if (this.queue.size > 0 && this.activeCount < this.MAX_CONCURRENT) {
      this.scheduleNextFetch();
    }
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
