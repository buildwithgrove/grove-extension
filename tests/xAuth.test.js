import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupChromeMock, resetChromeMock } from './mocks/chrome.js';
import { setupFetchMock } from './mocks/fetch.js';
import { loadBrowserScript } from './helpers/load-script.js';

let XAuth;
let mockChrome;
let mockFetch;
let context;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'GROVE_X_ACCESS_TOKEN',
  REFRESH_TOKEN: 'GROVE_X_REFRESH_TOKEN',
  USER_INFO: 'GROVE_X_USER_INFO',
  TOKEN_EXPIRY: 'GROVE_X_TOKEN_EXPIRY',
};

beforeEach(() => {
  mockChrome = setupChromeMock();
  mockFetch = setupFetchMock();

  // Mock crypto API
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

  // Create context
  context = {
    window: {},
    console: console,
    chrome: mockChrome,
    fetch: mockFetch.fetch,
    crypto: mockCrypto,
    btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
    TextEncoder: TextEncoder,
    URL: URL,
    URLSearchParams: URLSearchParams,
    Uint8Array: Uint8Array,
    Array: Array,
  };
  context.window = context;

  // Load script
  loadBrowserScript('src/auth/xAuth.js', context);

  XAuth = context.XAuth;
});

afterEach(() => {
  resetChromeMock(mockChrome);
  mockFetch.reset();
});

describe('XAuth', () => {
  // Note: PKCE functions (generateCodeVerifier, generateCodeChallenge, generateState)
  // and exchangeCodeForTokens have been moved to background.js to survive popup closure

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