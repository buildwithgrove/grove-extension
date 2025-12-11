import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupChromeMock, resetChromeMock } from './mocks/chrome.js';
import { setupFetchMock } from './mocks/fetch.js';

let XAuth;
let mockChrome;
let mockFetch;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'GROVE_X_ACCESS_TOKEN',
  REFRESH_TOKEN: 'GROVE_X_REFRESH_TOKEN',
  USER_INFO: 'GROVE_X_USER_INFO',
  TOKEN_EXPIRY: 'GROVE_X_TOKEN_EXPIRY',
};

beforeEach(() => {
  mockChrome = setupChromeMock();
  mockFetch = setupFetchMock();

  // Mock crypto API - use Object.defineProperty to override the getter
  const mockCrypto = {
    getRandomValues: vi.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
    subtle: {
      digest: vi.fn(async (algorithm, data) => {
        // Return mock hash
        return new Uint8Array(32).fill(42);
      })
    }
  };
  Object.defineProperty(global, 'crypto', {
    value: mockCrypto,
    writable: true,
    configurable: true
  });

  // Mock btoa
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');

  // Mock TextEncoder
  global.TextEncoder = class {
    encode(str) {
      return new Uint8Array(Buffer.from(str));
    }
  };

  // Create XAuth class for testing
  class TestXAuth {
    static CLIENT_ID = 'test-client-id';
    static get REDIRECT_URI() {
      return `https://${chrome.runtime.id}.chromiumapp.org/callback`;
    }
    static SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'like.write', 'offline.access'];
    static STORAGE_KEYS = STORAGE_KEYS;

    static generateCodeVerifier() {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    static async generateCodeChallenge(verifier) {
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    static generateState() {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    static async exchangeCodeForTokens(code, codeVerifier) {
      const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
      const params = new URLSearchParams();
      params.set('grant_type', 'authorization_code');
      params.set('code', code);
      params.set('redirect_uri', this.REDIRECT_URI);
      params.set('client_id', this.CLIENT_ID);
      params.set('code_verifier', codeVerifier);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      return response.json();
    }

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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        await this.logout();
        throw new Error('Session expired - please login again');
      }

      const tokens = await response.json();
      const userResult = await chrome.storage.local.get([this.STORAGE_KEYS.USER_INFO]);
      await this.storeTokens(tokens, userResult[this.STORAGE_KEYS.USER_INFO]);

      return tokens.access_token;
    }

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

      if (expiry && Date.now() > expiry - 5 * 60 * 1000) {
        try {
          return await this.refreshAccessToken();
        } catch (error) {
          return null;
        }
      }

      return accessToken;
    }

    static async getUserInfo(accessToken) {
      const response = await fetch('https://api.twitter.com/2/users/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get user info: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.data;
    }

    static async storeTokens(tokens, userInfo) {
      const expiry = Date.now() + (tokens.expires_in * 1000);

      await chrome.storage.local.set({
        [this.STORAGE_KEYS.ACCESS_TOKEN]: tokens.access_token,
        [this.STORAGE_KEYS.REFRESH_TOKEN]: tokens.refresh_token,
        [this.STORAGE_KEYS.USER_INFO]: userInfo,
        [this.STORAGE_KEYS.TOKEN_EXPIRY]: expiry,
      });
    }

    static async getStoredUserInfo() {
      const result = await chrome.storage.local.get([this.STORAGE_KEYS.USER_INFO]);
      return result[this.STORAGE_KEYS.USER_INFO] || null;
    }

    static async isLoggedIn() {
      const token = await this.getAccessToken();
      return !!token;
    }

    static async logout() {
      await chrome.storage.local.remove([
        this.STORAGE_KEYS.ACCESS_TOKEN,
        this.STORAGE_KEYS.REFRESH_TOKEN,
        this.STORAGE_KEYS.USER_INFO,
        this.STORAGE_KEYS.TOKEN_EXPIRY,
      ]);
    }

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
          reply: { in_reply_to_tweet_id: tweetId },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.title || 'Failed to post reply');
      }

      return response.json();
    }

    static async likeTweet(tweetId) {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Not logged in to X');
      }

      let userInfo = await this.getStoredUserInfo();
      if (!userInfo || !userInfo.id || userInfo.id === 'unknown') {
        throw new Error('User ID not available - try reconnecting X account');
      }

      const response = await fetch(`https://api.twitter.com/2/users/${userInfo.id}/likes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tweet_id: tweetId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.title || 'Failed to like tweet');
      }

      return response.json();
    }

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

  XAuth = TestXAuth;
});

afterEach(() => {
  resetChromeMock(mockChrome);
  mockFetch.reset();
  delete global.crypto;
  delete global.btoa;
  delete global.TextEncoder;
});

describe('XAuth', () => {
  describe('generateCodeVerifier', () => {
    it('should generate a base64url encoded string', () => {
      const verifier = XAuth.generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(verifier.length).toBeGreaterThan(0);
      // Should not contain +, /, or =
      expect(verifier).not.toMatch(/[+/=]/);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate a code challenge from verifier', async () => {
      const verifier = 'test-verifier';
      const challenge = await XAuth.generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(challenge.length).toBeGreaterThan(0);
      // Should not contain +, /, or =
      expect(challenge).not.toMatch(/[+/=]/);
    });
  });

  describe('generateState', () => {
    it('should generate a hex string', () => {
      const state = XAuth.generateState();
      expect(state).toBeDefined();
      expect(state).toMatch(/^[0-9a-f]+$/);
      expect(state.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens successfully', async () => {
      const tokens = {
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expires_in: 7200,
        scope: 'tweet.read tweet.write'
      };
      mockFetch.mockResponse('POST', 'https://api.twitter.com/2/oauth2/token', tokens);

      const result = await XAuth.exchangeCodeForTokens('auth-code', 'verifier');

      expect(result.access_token).toBe('access-123');
      expect(result.refresh_token).toBe('refresh-456');
    });

    it('should throw error on token exchange failure', async () => {
      mockFetch.mockResponse('POST', 'https://api.twitter.com/2/oauth2/token',
        'Invalid code',
        { status: 400 }
      );

      await expect(XAuth.exchangeCodeForTokens('bad-code', 'verifier'))
        .rejects.toThrow('Token exchange failed');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      mockChrome.storage.local._setData({
        [STORAGE_KEYS.REFRESH_TOKEN]: 'old-refresh-token',
        [STORAGE_KEYS.USER_INFO]: { id: '123', username: 'testuser' }
      });

      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 7200
      };
      mockFetch.mockResponse('POST', 'https://api.twitter.com/2/oauth2/token', newTokens);

      const result = await XAuth.refreshAccessToken();

      expect(result).toBe('new-access-token');
      const data = mockChrome.storage.local._getData();
      expect(data[STORAGE_KEYS.ACCESS_TOKEN]).toBe('new-access-token');
    });

    it('should throw error when no refresh token', async () => {
      await expect(XAuth.refreshAccessToken())
        .rejects.toThrow('No refresh token available');
    });

    it('should logout and throw on refresh failure', async () => {
      mockChrome.storage.local._setData({
        [STORAGE_KEYS.REFRESH_TOKEN]: 'invalid-token'
      });
      mockFetch.mockResponse('POST', 'https://api.twitter.com/2/oauth2/token',
        { error: 'Invalid token' },
        { status: 401 }
      );

      await expect(XAuth.refreshAccessToken())
        .rejects.toThrow('Session expired');

      // Should have logged out
      const data = mockChrome.storage.local._getData();
      expect(data[STORAGE_KEYS.ACCESS_TOKEN]).toBeUndefined();
    });
  });

  describe('getAccessToken', () => {
    it('should return access token when valid', async () => {
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      mockChrome.storage.local._setData({
        [STORAGE_KEYS.ACCESS_TOKEN]: 'valid-token',
        [STORAGE_KEYS.TOKEN_EXPIRY]: futureExpiry
      });

      const token = await XAuth.getAccessToken();
      expect(token).toBe('valid-token');
    });

    it('should return null when no token stored', async () => {
      const token = await XAuth.getAccessToken();
      expect(token).toBeNull();
    });

    it('should refresh token when expired', async () => {
      const pastExpiry = Date.now() - 1000; // Expired
      mockChrome.storage.local._setData({
        [STORAGE_KEYS.ACCESS_TOKEN]: 'old-token',
        [STORAGE_KEYS.TOKEN_EXPIRY]: pastExpiry,
        [STORAGE_KEYS.REFRESH_TOKEN]: 'refresh-token'
      });

      mockFetch.mockResponse('POST', 'https://api.twitter.com/2/oauth2/token', {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_in: 7200
      });

      const token = await XAuth.getAccessToken();
      expect(token).toBe('new-token');
    });

    it('should return null when refresh fails', async () => {
      const pastExpiry = Date.now() - 1000;
      mockChrome.storage.local._setData({
        [STORAGE_KEYS.ACCESS_TOKEN]: 'old-token',
        [STORAGE_KEYS.TOKEN_EXPIRY]: pastExpiry,
        [STORAGE_KEYS.REFRESH_TOKEN]: 'bad-refresh-token'
      });

      mockFetch.mockResponse('POST', 'https://api.twitter.com/2/oauth2/token',
        { error: 'Invalid' },
        { status: 401 }
      );

      const token = await XAuth.getAccessToken();
      expect(token).toBeNull();
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user info successfully', async () => {
      mockFetch.mockResponse('GET', 'https://api.twitter.com/2/users/me', {
        data: { id: '123', username: 'testuser', name: 'Test User' }
      });

      const userInfo = await XAuth.getUserInfo('access-token');

      expect(userInfo.id).toBe('123');
      expect(userInfo.username).toBe('testuser');
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResponse('GET', 'https://api.twitter.com/2/users/me',
        'Unauthorized',
        { status: 401 }
      );

      await expect(XAuth.getUserInfo('bad-token'))
        .rejects.toThrow('Failed to get user info');
    });
  });

  describe('storeTokens', () => {
    it('should store all token data', async () => {
      const tokens = {
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expires_in: 7200
      };
      const userInfo = { id: '789', username: 'testuser' };

      await XAuth.storeTokens(tokens, userInfo);

      const data = mockChrome.storage.local._getData();
      expect(data[STORAGE_KEYS.ACCESS_TOKEN]).toBe('access-123');
      expect(data[STORAGE_KEYS.REFRESH_TOKEN]).toBe('refresh-456');
      expect(data[STORAGE_KEYS.USER_INFO]).toEqual(userInfo);
      expect(data[STORAGE_KEYS.TOKEN_EXPIRY]).toBeDefined();
    });
  });

  describe('getStoredUserInfo', () => {
    it('should return stored user info', async () => {
      mockChrome.storage.local._setData({
        [STORAGE_KEYS.USER_INFO]: { id: '123', username: 'test' }
      });

      const userInfo = await XAuth.getStoredUserInfo();
      expect(userInfo.username).toBe('test');
    });

    it('should return null when no user info stored', async () => {
      const userInfo = await XAuth.getStoredUserInfo();
      expect(userInfo).toBeNull();
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when valid token exists', async () => {
      mockChrome.storage.local._setData({
        [STORAGE_KEYS.ACCESS_TOKEN]: 'valid-token',
        [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now() + 3600000
      });

      const loggedIn = await XAuth.isLoggedIn();
      expect(loggedIn).toBe(true);
    });

    it('should return false when no token', async () => {
      const loggedIn = await XAuth.isLoggedIn();
      expect(loggedIn).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear all auth data', async () => {
      mockChrome.storage.local._setData({
        [STORAGE_KEYS.ACCESS_TOKEN]: 'token',
        [STORAGE_KEYS.REFRESH_TOKEN]: 'refresh',
        [STORAGE_KEYS.USER_INFO]: { id: '123' },
        [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now()
      });

      await XAuth.logout();

      const data = mockChrome.storage.local._getData();
      expect(data[STORAGE_KEYS.ACCESS_TOKEN]).toBeUndefined();
      expect(data[STORAGE_KEYS.REFRESH_TOKEN]).toBeUndefined();
      expect(data[STORAGE_KEYS.USER_INFO]).toBeUndefined();
      expect(data[STORAGE_KEYS.TOKEN_EXPIRY]).toBeUndefined();
    });
  });

  describe('postReply', () => {
    beforeEach(() => {
      mockChrome.storage.local._setData({
        [STORAGE_KEYS.ACCESS_TOKEN]: 'valid-token',
        [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now() + 3600000
      });
    });

    it('should post reply successfully', async () => {
      mockFetch.mockResponse('POST', 'https://api.twitter.com/2/tweets', {
        data: { id: 'new-tweet-123' }
      });

      const result = await XAuth.postReply('123456', 'Thanks for the tip!');

      expect(result.data.id).toBe('new-tweet-123');
    });

    it('should throw when not logged in', async () => {
      mockChrome.storage.local._setData({});

      await expect(XAuth.postReply('123', 'text'))
        .rejects.toThrow('Not logged in to X');
    });

    it('should throw on API error', async () => {
      mockFetch.mockResponse('POST', 'https://api.twitter.com/2/tweets',
        { detail: 'Rate limit exceeded' },
        { status: 429 }
      );

      await expect(XAuth.postReply('123', 'text'))
        .rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('likeTweet', () => {
    beforeEach(() => {
      mockChrome.storage.local._setData({
        [STORAGE_KEYS.ACCESS_TOKEN]: 'valid-token',
        [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now() + 3600000,
        [STORAGE_KEYS.USER_INFO]: { id: 'user-123', username: 'testuser' }
      });
    });

    it('should like tweet successfully', async () => {
      mockFetch.mockResponse('POST', 'https://api.twitter.com/2/users/user-123/likes', {
        data: { liked: true }
      });

      const result = await XAuth.likeTweet('tweet-456');

      expect(result.data.liked).toBe(true);
    });

    it('should throw when not logged in', async () => {
      mockChrome.storage.local._setData({});

      await expect(XAuth.likeTweet('123'))
        .rejects.toThrow('Not logged in to X');
    });

    it('should throw when user ID not available', async () => {
      mockChrome.storage.local._setData({
        [STORAGE_KEYS.ACCESS_TOKEN]: 'valid-token',
        [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now() + 3600000,
        [STORAGE_KEYS.USER_INFO]: { id: 'unknown' }
      });

      await expect(XAuth.likeTweet('123'))
        .rejects.toThrow('User ID not available');
    });
  });

  describe('extractTweetId', () => {
    it('should extract tweet ID from x.com URL', () => {
      const id = XAuth.extractTweetId('https://x.com/user/status/1234567890');
      expect(id).toBe('1234567890');
    });

    it('should extract tweet ID from twitter.com URL', () => {
      const id = XAuth.extractTweetId('https://twitter.com/user/status/9876543210');
      expect(id).toBe('9876543210');
    });

    it('should handle URL with query parameters', () => {
      const id = XAuth.extractTweetId('https://x.com/user/status/123?s=20');
      expect(id).toBe('123');
    });

    it('should return null for non-tweet URLs', () => {
      expect(XAuth.extractTweetId('https://x.com/user')).toBeNull();
      expect(XAuth.extractTweetId('https://x.com')).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(XAuth.extractTweetId('not a url')).toBeNull();
    });
  });
});
