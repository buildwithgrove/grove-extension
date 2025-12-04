/**
 * X (Twitter) OAuth 2.0 Authentication with PKCE
 * Handles login and API calls for auto-reply functionality
 */

class XAuth {
  static CLIENT_ID = 'UHQwQXlCRFZHY1F1VmZ3RmVXU0Y6MTpjaQ';
  static REDIRECT_URI = 'https://cailijeophmjabfnilbhajbegndlhelf.chromiumapp.org/callback';
  static SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'like.write', 'offline.access'];

  static STORAGE_KEYS = {
    ACCESS_TOKEN: 'GROVE_X_ACCESS_TOKEN',
    REFRESH_TOKEN: 'GROVE_X_REFRESH_TOKEN',
    USER_INFO: 'GROVE_X_USER_INFO',
    TOKEN_EXPIRY: 'GROVE_X_TOKEN_EXPIRY',
  };

  /**
   * Generate a random string for PKCE code verifier
   */
  static generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generate code challenge from verifier (SHA-256)
   */
  static async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generate random state for OAuth
   */
  static generateState() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Start OAuth 2.0 login flow
   * @returns {Promise<Object>} - User info on success
   */
  static async login() {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();

    // Build authorization URL
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI);
    authUrl.searchParams.set('scope', this.SCOPES.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive: true,
        },
        async (redirectUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!redirectUrl) {
            reject(new Error('No redirect URL received'));
            return;
          }

          try {
            const url = new URL(redirectUrl);
            const code = url.searchParams.get('code');
            const returnedState = url.searchParams.get('state');
            const error = url.searchParams.get('error');

            if (error) {
              reject(new Error(`OAuth error: ${error}`));
              return;
            }

            if (returnedState !== state) {
              reject(new Error('State mismatch - possible CSRF attack'));
              return;
            }

            if (!code) {
              reject(new Error('No authorization code received'));
              return;
            }

            // Exchange code for tokens
            const tokens = await this.exchangeCodeForTokens(code, codeVerifier);
            console.log('[Grove X Auth] Token response:', {
              hasAccessToken: !!tokens.access_token,
              tokenType: tokens.token_type,
              scope: tokens.scope,
              expiresIn: tokens.expires_in
            });

            // Try to get user info (optional - might fail on free tier)
            let userInfo = { id: 'unknown', username: 'Connected' };
            try {
              userInfo = await this.getUserInfo(tokens.access_token);
            } catch (userInfoError) {
              console.warn('[Grove X Auth] Could not fetch user info (this is OK for free tier):', userInfoError.message);
            }

            // Store tokens and user info
            await this.storeTokens(tokens, userInfo);

            resolve(userInfo);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code, codeVerifier) {
    console.log('[Grove X Auth] Exchanging code for tokens...');
    const tokenUrl = 'https://api.twitter.com/2/oauth2/token';

    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('redirect_uri', this.REDIRECT_URI);
    params.set('client_id', this.CLIENT_ID);
    params.set('code_verifier', codeVerifier);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Grove X Auth] Token exchange failed:', response.status, errorText);
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokens = await response.json();
    console.log('[Grove X Auth] Token exchange successful, scopes:', tokens.scope);
    return tokens;
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
    const userInfo = await this.getStoredUserInfo();
    if (!userInfo || !userInfo.id || userInfo.id === 'unknown') {
      throw new Error('User ID not available');
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
