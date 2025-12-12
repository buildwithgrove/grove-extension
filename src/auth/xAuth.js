/**
 * X (Twitter) OAuth 2.0 Authentication
 * Login flow is handled by background.js to survive popup closure
 * This class handles token management and API calls for auto-reply/like functionality
 */

class XAuth {
  static CLIENT_ID = 'UHQwQXlCRFZHY1F1VmZ3RmVXU0Y6MTpjaQ';

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

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      // Refresh token invalid - user needs to re-login
      await this.logout();
      throw new Error('Session expired - please login again');
    }

    const tokens = await response.json();

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
   * Get user info from Twitter API
   */
  static async getUserInfo(accessToken) {
    console.log('[Grove X Auth] Fetching user info...');

    const response = await fetch('https://api.twitter.com/2/users/me', {
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
    console.log('[Grove X Auth] User info received:', data.data?.username);
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
   * Check if user is logged in
   */
  static async isLoggedIn() {
    const token = await this.getAccessToken();
    return !!token;
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
   * Post a reply to a tweet
   * @param {string} tweetId - The ID of the tweet to reply to
   * @param {string} text - The reply text
   * @returns {Promise<Object>} - The created tweet data
   */
  static async postReply(tweetId, text) {
    const accessToken = await this.getAccessToken();

    if (!accessToken) {
      throw new Error('Not logged in to X');
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        reply: {
          in_reply_to_tweet_id: tweetId,
        },
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
    const accessToken = await this.getAccessToken();

    if (!accessToken) {
      throw new Error('Not logged in to X');
    }

    // Get user info to get the user ID
    let userInfo = await this.getStoredUserInfo();

    // If user ID is missing, try to fetch it now
    if (!userInfo || !userInfo.id || userInfo.id === 'unknown') {
      try {
        userInfo = await this.getUserInfo(accessToken);
        // Update stored user info with the fetched data
        const result = await chrome.storage.local.get([
          this.STORAGE_KEYS.ACCESS_TOKEN,
          this.STORAGE_KEYS.REFRESH_TOKEN,
          this.STORAGE_KEYS.TOKEN_EXPIRY
        ]);
        await chrome.storage.local.set({
          [this.STORAGE_KEYS.USER_INFO]: userInfo
        });
      } catch (fetchError) {
        console.error('[Grove X Auth] Could not fetch user info for like:', fetchError);
        throw new Error('User ID not available - try reconnecting X account');
      }
    }

    const response = await fetch(`https://api.twitter.com/2/users/${userInfo.id}/likes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
