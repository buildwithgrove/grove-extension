/**
 * X (Twitter) OAuth 2.0 Authentication
 * Login flow is handled by background.js to survive popup closure
 * This class handles token management and API calls for auto-reply/like functionality
 */

class XAuth {
  static CLIENT_ID = 'UHQwQXlCRFZHY1F1VmZ3RmVXU0Y6MTpjaQ';

  /**
   * Fetch wrapper that routes through background service worker in content script context
   * to avoid CORS blocks (same pattern as GroveAPI._fetch)
   */
  static async _fetch(url, options = {}) {
    // Popup or service worker context → direct fetch
    // credentials: 'omit' prevents sending twitter.com cookies which conflict with Bearer auth
    if (typeof window === 'undefined' || window.location?.protocol === 'chrome-extension:') {
      return fetch(url, { ...options, credentials: 'omit' });
    }

    // Content script context → relay through background service worker
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'API_FETCH', url, options },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response) {
            reject(new Error('No response from background service worker'));
            return;
          }
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          // Build a Response-like shim (matches GroveAPI._fetch pattern)
          const shim = {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers || {}),
            json: () => Promise.resolve(JSON.parse(response.body)),
            text: () => Promise.resolve(response.body),
          };
          resolve(shim);
        }
      );
    });
  }

  static STORAGE_KEYS = {
    ACCESS_TOKEN: 'GROVE_X_ACCESS_TOKEN',
    REFRESH_TOKEN: 'GROVE_X_REFRESH_TOKEN',
    USER_INFO: 'GROVE_X_USER_INFO',
    TOKEN_EXPIRY: 'GROVE_X_TOKEN_EXPIRY',
  };

  /**
   * Start OAuth 2.0 login flow
   * Delegates to background script to ensure the flow completes even if popup closes
   * @returns {Promise<Object>} - User info on success
   */
  static async login() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'X_LOGIN' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response) {
          reject(new Error('No response from background script'));
          return;
        }

        if (response.success) {
          resolve(response.userInfo);
        } else {
          reject(new Error(response.error || 'Login failed'));
        }
      });
    });
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken() {
    const result = await chrome.storage.local.get([this.STORAGE_KEYS.REFRESH_TOKEN]);
    const refreshToken = result[this.STORAGE_KEYS.REFRESH_TOKEN];

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokenUrl = 'https://api.twitter.com/2/oauth2/token';

    const params = new URLSearchParams();
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', refreshToken);
    params.set('client_id', this.CLIENT_ID);

    const response = await XAuth._fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '(unreadable)');
      console.error('[Grove X Auth] Refresh failed:', response.status, errorBody);
      // Refresh token invalid - user needs to re-login
      await this.logout();
      throw new Error('Session expired - please login again');
    }

    const tokens = await response.json();
    groveLog.log('[X Auth] Refresh successful, scopes:', tokens.scope, 'token length:', tokens.access_token?.length);

    // Update stored tokens
    const userResult = await chrome.storage.local.get([this.STORAGE_KEYS.USER_INFO]);
    await this.storeTokens(tokens, userResult[this.STORAGE_KEYS.USER_INFO]);

    return tokens.access_token;
  }

  /**
   * Get valid access token (refreshes if needed)
   */
  static async getAccessToken() {
    const result = await chrome.storage.local.get([
      this.STORAGE_KEYS.ACCESS_TOKEN,
      this.STORAGE_KEYS.TOKEN_EXPIRY,
    ]);

    const accessToken = result[this.STORAGE_KEYS.ACCESS_TOKEN];
    const expiry = result[this.STORAGE_KEYS.TOKEN_EXPIRY];

    if (!accessToken) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    if (expiry && Date.now() > expiry - 5 * 60 * 1000) {
      try {
        return await this.refreshAccessToken();
      } catch (error) {
        console.error('[Grove X Auth] Token refresh failed:', error);
        return null;
      }
    }

    return accessToken;
  }

  /**
   * Make an authenticated X API call with automatic retry on 401.
   * If the first attempt returns 401, refreshes the token and retries once.
   * @param {string} url - API URL
   * @param {Object} options - fetch options (Authorization header will be set)
   * @returns {Promise<Object>} - Response-like object
   */
  static async _authenticatedFetch(url, options = {}) {
    let accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('Not logged in to X');
    }

    const buildOptions = (token) => ({
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });

    const response = await XAuth._fetch(url, buildOptions(accessToken));

    if (response.status === 401) {
      // Log what Twitter actually says for debugging
      try {
        const body = await response.text();
        console.error('[Grove X Auth] 401 response body:', body);
      } catch (_) { /* ignore */ }

      // Token rejected server-side — try refreshing once
      groveLog.log('[X Auth] Got 401, attempting token refresh...');
      try {
        accessToken = await this.refreshAccessToken();
      } catch (refreshError) {
        console.error('[Grove X Auth] Token refresh failed after 401:', refreshError);
        await this.logout();
        throw new Error('Session expired - please reconnect X account');
      }
      const retryResponse = await XAuth._fetch(url, buildOptions(accessToken));
      if (retryResponse.status === 401) {
        // Fresh token also rejected — log but don't logout (refresh token still works)
        try {
          const retryBody = await retryResponse.text();
          console.error('[Grove X Auth] Retry 401 response body:', retryBody);
        } catch (_) { /* ignore */ }
        console.error('[Grove X Auth] Retry with fresh token still 401 — API may be rejecting requests');
        throw new Error('X API request failed (401) - check app permissions');
      }
      return retryResponse;
    }

    return response;
  }

  /**
   * Get user info from Twitter API
   */
  static async getUserInfo(accessToken) {
    groveLog.log('[X Auth] Fetching user info...');

    const response = await XAuth._fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Grove X Auth] User info failed:', response.status, errorText);
      throw new Error(`Failed to get user info: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    groveLog.log('[X Auth] User info received:', data.data?.username);
    return data.data;
  }

  /**
   * Store tokens and user info
   */
  static async storeTokens(tokens, userInfo) {
    const expiry = Date.now() + (tokens.expires_in * 1000);

    await chrome.storage.local.set({
      [this.STORAGE_KEYS.ACCESS_TOKEN]: tokens.access_token,
      [this.STORAGE_KEYS.REFRESH_TOKEN]: tokens.refresh_token,
      [this.STORAGE_KEYS.USER_INFO]: userInfo,
      [this.STORAGE_KEYS.TOKEN_EXPIRY]: expiry,
    });
  }

  /**
   * Get stored user info
   */
  static async getStoredUserInfo() {
    const result = await chrome.storage.local.get([this.STORAGE_KEYS.USER_INFO]);
    return result[this.STORAGE_KEYS.USER_INFO] || null;
  }

  /**
   * Check if user is logged in (just checks token exists)
   */
  static async isLoggedIn() {
    const token = await this.getAccessToken();
    return !!token;
  }

  /**
   * Verify token is actually valid by making API call
   * Clears tokens if invalid
   */
  static async verifyConnection() {
    try {
      const token = await this.getAccessToken();
      if (!token) return false;

      const response = await XAuth._fetch('https://api.twitter.com/2/users/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        // Only clear token if we know it's invalid (401/403)
        if (response.status === 401 || response.status === 403) {
          groveLog.log('[X Auth] Token invalid, clearing...');
          await this.logout();
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error('[Grove X Auth] Token verification failed:', error);
      // Don't logout on network errors
      return false;
    }
  }

  /**
   * Logout - clear all stored tokens
   */
  static async logout() {
    await chrome.storage.local.remove([
      this.STORAGE_KEYS.ACCESS_TOKEN,
      this.STORAGE_KEYS.REFRESH_TOKEN,
      this.STORAGE_KEYS.USER_INFO,
      this.STORAGE_KEYS.TOKEN_EXPIRY,
    ]);
  }

  /**
   * Post a new tweet (not a reply)
   * Used for profile tips where there's no tweet to reply to
   * @param {string} text - The tweet text
   * @returns {Promise<Object>} - The created tweet data
   */
  static async postTweet(text) {
    const response = await this._authenticatedFetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.title || 'Failed to post tweet');
    }

    return response.json();
  }

  /**
   * Post a tweet about a tip (standalone tweet with @mention).
   * NOTE: tweetId is intentionally ignored. X API blocked programmatic replies
   * since Feb 2026. We now post standalone tweets with @mentions instead.
   * Parameter kept in signature for call-site compatibility.
   * @param {string} _tweetId - Unused (kept for API compatibility)
   * @param {string} text - The tweet text (should include @mention of tippee)
   * @returns {Promise<Object>} - The created tweet data
   */
  static async postReply(_tweetId, text) {
    const response = await this._authenticatedFetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.title || 'Failed to post reply');
    }

    return response.json();
  }

  /**
   * Like a tweet
   * @param {string} tweetId - The ID of the tweet to like
   * @returns {Promise<Object>} - The like result
   */
  static async likeTweet(tweetId) {
    // Get user info to get the user ID
    let userInfo = await this.getStoredUserInfo();

    // If user ID is missing, try to fetch it now (uses _authenticatedFetch for retry-on-401)
    if (!userInfo || !userInfo.id || userInfo.id === 'unknown') {
      try {
        const response = await this._authenticatedFetch('https://api.twitter.com/2/users/me');
        if (!response.ok) {
          throw new Error(`Failed to get user info: ${response.status}`);
        }
        const data = await response.json();
        userInfo = data.data;
        await chrome.storage.local.set({
          [this.STORAGE_KEYS.USER_INFO]: userInfo
        });
      } catch (fetchError) {
        console.error('[Grove X Auth] Could not fetch user info for like:', fetchError);
        throw new Error('User ID not available - try reconnecting X account');
      }
    }

    const response = await this._authenticatedFetch(`https://api.twitter.com/2/users/${userInfo.id}/likes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tweet_id: tweetId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.title || 'Failed to like tweet');
    }

    return response.json();
  }

  /**
   * Extract tweet ID from a Twitter/X URL
   * @param {string} url - Tweet URL (e.g., "https://x.com/user/status/123456")
   * @returns {string|null} - Tweet ID or null if not found
   */
  static extractTweetId(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const statusIndex = pathParts.indexOf('status');

      if (statusIndex !== -1 && pathParts[statusIndex + 1]) {
        return pathParts[statusIndex + 1];
      }
      return null;
    } catch {
      return null;
    }
  }
}

// Export for use in popup and content scripts
if (typeof window !== 'undefined') {
  window.XAuth = XAuth;
}
