import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

/**
 * Tests for bio fetch functionality in content.js
 *
 * Since content.js is wrapped in an IIFE, we test the logic by:
 * 1. Testing the helper functions that can be extracted
 * 2. Testing the address caching behavior
 * 3. Testing the tip destination resolution
 */

describe('Bio Fetch - Address Caching', () => {
  let AddressParser;

  beforeEach(() => {
    const context = loadBrowserScript('src/parsers/addressMatchers.js');
    loadBrowserScript('src/parsers/address.js', context);
    AddressParser = context.AddressParser;
  });

  describe('Address detection from bio text', () => {
    it('should detect 0x address in bio', () => {
      const bio = 'Crypto enthusiast | 0x043797f835f8d1061102ca09960c7Ae76aC83489';
      expect(AddressParser.hasAddresses(bio)).toBe(true);
      const result = AddressParser.resolveAddress(bio);
      expect(result.type).toBe('raw');
      expect(result.address).toBe('0x043797f835f8d1061102ca09960c7Ae76aC83489');
    });

    it('should detect ENS name in bio', () => {
      const bio = 'Building the future | vitalik.eth';
      expect(AddressParser.hasAddresses(bio)).toBe(true);
      const result = AddressParser.resolveAddress(bio);
      expect(result.type).toBe('ens');
      expect(result.address).toBe('vitalik.eth');
    });

    it('should detect basename in bio', () => {
      const bio = 'Onchain | jesse.base.eth';
      expect(AddressParser.hasAddresses(bio)).toBe(true);
      const result = AddressParser.resolveAddress(bio);
      expect(result.type).toBe('ens');
      expect(result.address).toBe('jesse.base.eth');
    });

    it('should detect address with surrounding text', () => {
      const bio = 'Send tips to 0x1234567890abcdef1234567890abcdef12345678 - DMs open';
      expect(AddressParser.hasAddresses(bio)).toBe(true);
    });

    it('should return false for bio without address', () => {
      const bio = 'Just a regular user with no crypto address';
      expect(AddressParser.hasAddresses(bio)).toBe(false);
    });

    it('should handle empty bio', () => {
      expect(AddressParser.hasAddresses('')).toBe(false);
      expect(AddressParser.hasAddresses(null)).toBe(false);
    });
  });

  describe('Combined display name and bio check', () => {
    it('should find address when only in bio', () => {
      const displayName = 'Regular Name';
      const bio = 'My address: 0x1234567890abcdef1234567890abcdef12345678';
      const combinedText = [displayName, bio].filter(Boolean).join(' ');

      expect(AddressParser.hasAddresses(combinedText)).toBe(true);
      const result = AddressParser.resolveAddress(combinedText);
      expect(result.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should find address when only in display name', () => {
      const displayName = 'vitalik.eth';
      const bio = 'Just building stuff';
      const combinedText = [displayName, bio].filter(Boolean).join(' ');

      expect(AddressParser.hasAddresses(combinedText)).toBe(true);
      const result = AddressParser.resolveAddress(combinedText);
      expect(result.address).toBe('vitalik.eth');
    });

    it('should prioritize 0x over ENS when both present', () => {
      const displayName = 'vitalik.eth';
      const bio = '0x1234567890abcdef1234567890abcdef12345678';
      const combinedText = [displayName, bio].filter(Boolean).join(' ');

      const result = AddressParser.resolveAddress(combinedText);
      expect(result.type).toBe('raw');
    });
  });
});

describe('Bio Fetch - Username Extraction', () => {
  // Test the username extraction logic used in content.js

  function extractUsernameFromUrl(url) {
    const match = url.match(/^https:\/\/(twitter|x)\.com\/([^\/\?]+)\/?/);
    if (match && match[2] && !['home', 'explore', 'search', 'notifications', 'messages', 'settings', 'i'].includes(match[2])) {
      return match[2];
    }
    return null;
  }

  it('should extract username from x.com profile URL', () => {
    expect(extractUsernameFromUrl('https://x.com/vitalikbuterin')).toBe('vitalikbuterin');
  });

  it('should extract username from twitter.com profile URL', () => {
    expect(extractUsernameFromUrl('https://twitter.com/vitalikbuterin')).toBe('vitalikbuterin');
  });

  it('should extract username from tweet URL', () => {
    expect(extractUsernameFromUrl('https://x.com/jessepollak/status/1234567890')).toBe('jessepollak');
  });

  it('should handle trailing slash', () => {
    expect(extractUsernameFromUrl('https://x.com/username/')).toBe('username');
  });

  it('should return null for reserved paths', () => {
    expect(extractUsernameFromUrl('https://x.com/home')).toBe(null);
    expect(extractUsernameFromUrl('https://x.com/explore')).toBe(null);
    expect(extractUsernameFromUrl('https://x.com/search')).toBe(null);
    expect(extractUsernameFromUrl('https://x.com/notifications')).toBe(null);
    expect(extractUsernameFromUrl('https://x.com/messages')).toBe(null);
    expect(extractUsernameFromUrl('https://x.com/settings')).toBe(null);
    expect(extractUsernameFromUrl('https://x.com/i')).toBe(null);
  });

  it('should return null for invalid URLs', () => {
    expect(extractUsernameFromUrl('https://google.com/user')).toBe(null);
    expect(extractUsernameFromUrl('not a url')).toBe(null);
  });
});

describe('Bio Fetch - Tip Destination Resolution', () => {
  /**
   * Tests the logic for determining tip destination
   * When a user has a cached address from bio fetch, that address should be used directly
   */

  // Simulates the address cache
  class MockAddressCache {
    constructor() {
      this.cache = new Map();
      this.ADDRESS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
    }

    get(username) {
      const cached = this.cache.get(username);
      if (!cached) return null;
      if (Date.now() - cached.timestamp > this.ADDRESS_CACHE_TTL) {
        this.cache.delete(username);
        return null;
      }
      return cached.data;
    }

    set(username, data) {
      this.cache.set(username, {
        data,
        timestamp: Date.now()
      });
    }
  }

  let addressCache;

  beforeEach(() => {
    addressCache = new MockAddressCache();
  });

  it('should return cached 0x address as tip destination', () => {
    const username = 'testuser';
    const tweetUrl = 'https://x.com/testuser/status/123';

    // Cache a 0x address (simulating bio fetch result)
    addressCache.set(username, {
      address: '0x043797f835f8d1061102ca09960c7Ae76aC83489',
      type: 'raw',
      original: '0x043797f835f8d1061102ca09960c7Ae76aC83489'
    });

    // Simulate the tip destination logic from sendTweetTip
    let tipDestination = tweetUrl;
    const cached = addressCache.get(username);
    if (cached && cached.address) {
      tipDestination = cached.address;
    }

    expect(tipDestination).toBe('0x043797f835f8d1061102ca09960c7Ae76aC83489');
  });

  it('should return cached ENS name as tip destination', () => {
    const username = 'vitalikbuterin';
    const tweetUrl = 'https://x.com/vitalikbuterin/status/456';

    addressCache.set(username, {
      address: 'vitalik.eth',
      type: 'ens',
      original: 'vitalik.eth'
    });

    let tipDestination = tweetUrl;
    const cached = addressCache.get(username);
    if (cached && cached.address) {
      tipDestination = cached.address;
    }

    expect(tipDestination).toBe('vitalik.eth');
  });

  it('should return tweet URL when no cached address', () => {
    const username = 'someuser';
    const tweetUrl = 'https://x.com/someuser/status/789';

    let tipDestination = tweetUrl;
    const cached = addressCache.get(username);
    if (cached && cached.address) {
      tipDestination = cached.address;
    }

    expect(tipDestination).toBe(tweetUrl);
  });

  it('should return tweet URL when cache indicates no-address', () => {
    const username = 'noaddressuser';
    const tweetUrl = 'https://x.com/noaddressuser/status/101';

    // Cache negative result
    addressCache.set(username, 'no-address');

    let tipDestination = tweetUrl;
    const cached = addressCache.get(username);
    // 'no-address' is a string, not an object with .address
    if (cached && typeof cached === 'object' && cached.address) {
      tipDestination = cached.address;
    }

    expect(tipDestination).toBe(tweetUrl);
  });

  it('should expire cached addresses after TTL', () => {
    const username = 'expireduser';

    // Set cache with old timestamp
    addressCache.cache.set(username, {
      data: { address: '0x123', type: 'raw' },
      timestamp: Date.now() - (11 * 60 * 1000) // 11 minutes ago
    });

    const cached = addressCache.get(username);
    expect(cached).toBe(null);
  });
});

describe('Bio Fetch - Queue Management', () => {
  /**
   * Tests the bio fetch queue logic
   */

  class MockBioFetchQueue {
    constructor() {
      this.queue = new Set();
      this.inProgress = new Set();
      this.pendingButtons = new Map();
    }

    shouldQueue(username, addressCache) {
      // Don't queue if already cached
      const cached = addressCache.get(username);
      if (cached !== null) return false;

      // Don't queue if already in progress or queued
      if (this.inProgress.has(username)) return false;
      if (this.queue.has(username)) return false;

      return true;
    }

    queue(username) {
      this.queue.add(username);
    }

    trackPendingButton(username, tweetData) {
      if (!this.pendingButtons.has(username)) {
        this.pendingButtons.set(username, new Set());
      }
      this.pendingButtons.get(username).add(tweetData);
    }
  }

  let fetchQueue;
  let addressCache;

  beforeEach(() => {
    fetchQueue = new MockBioFetchQueue();
    addressCache = new Map();
  });

  it('should queue new username', () => {
    expect(fetchQueue.shouldQueue('newuser', { get: () => null })).toBe(true);
  });

  it('should not queue already cached username', () => {
    const cache = { get: (u) => u === 'cacheduser' ? { address: '0x123' } : null };
    expect(fetchQueue.shouldQueue('cacheduser', cache)).toBe(false);
  });

  it('should not queue username already in progress', () => {
    fetchQueue.inProgress.add('progressuser');
    expect(fetchQueue.shouldQueue('progressuser', { get: () => null })).toBe(false);
  });

  it('should not queue username already in queue', () => {
    fetchQueue.queue.add('queueduser');
    expect(fetchQueue.shouldQueue('queueduser', { get: () => null })).toBe(false);
  });

  it('should track pending buttons for multiple tweets from same user', () => {
    fetchQueue.trackPendingButton('multiuser', { tweetUrl: 'url1' });
    fetchQueue.trackPendingButton('multiuser', { tweetUrl: 'url2' });

    expect(fetchQueue.pendingButtons.get('multiuser').size).toBe(2);
  });
});

describe('Bio Fetch - Twitter API Response Parsing', () => {
  /**
   * Tests parsing of Twitter GraphQL API responses
   */

  function parseTwitterUserResponse(data) {
    const user = data?.data?.user?.result;
    if (!user || user.__typename === 'UserUnavailable') {
      return { displayName: null, bio: null, error: 'User not found' };
    }

    const legacy = user.legacy || {};
    return {
      displayName: legacy.name || null,
      bio: legacy.description || null
    };
  }

  it('should parse valid user response', () => {
    const response = {
      data: {
        user: {
          result: {
            __typename: 'User',
            legacy: {
              name: 'Test User',
              description: 'My bio with 0x1234567890abcdef1234567890abcdef12345678'
            }
          }
        }
      }
    };

    const result = parseTwitterUserResponse(response);
    expect(result.displayName).toBe('Test User');
    expect(result.bio).toBe('My bio with 0x1234567890abcdef1234567890abcdef12345678');
  });

  it('should handle unavailable user', () => {
    const response = {
      data: {
        user: {
          result: {
            __typename: 'UserUnavailable'
          }
        }
      }
    };

    const result = parseTwitterUserResponse(response);
    expect(result.error).toBe('User not found');
  });

  it('should handle missing user data', () => {
    const response = { data: { user: null } };
    const result = parseTwitterUserResponse(response);
    expect(result.error).toBe('User not found');
  });

  it('should handle empty response', () => {
    const result = parseTwitterUserResponse({});
    expect(result.error).toBe('User not found');
  });

  it('should handle user with empty bio', () => {
    const response = {
      data: {
        user: {
          result: {
            __typename: 'User',
            legacy: {
              name: 'User Without Bio',
              description: ''
            }
          }
        }
      }
    };

    const result = parseTwitterUserResponse(response);
    expect(result.displayName).toBe('User Without Bio');
    // Empty string is falsy, so || null returns null
    expect(result.bio).toBe(null);
  });
});

describe('Bio Fetch - CSRF Token Extraction', () => {
  /**
   * Tests CSRF token extraction from cookies
   */

  function getTwitterCsrfToken(cookieString) {
    const cookies = cookieString.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'ct0') {
        return value;
      }
    }
    return null;
  }

  it('should extract ct0 token from cookies', () => {
    const cookies = 'other=value; ct0=abc123def456; another=test';
    expect(getTwitterCsrfToken(cookies)).toBe('abc123def456');
  });

  it('should return null when ct0 not present', () => {
    const cookies = 'other=value; session=xyz';
    expect(getTwitterCsrfToken(cookies)).toBe(null);
  });

  it('should handle empty cookie string', () => {
    expect(getTwitterCsrfToken('')).toBe(null);
  });

  it('should handle ct0 as first cookie', () => {
    const cookies = 'ct0=firsttoken; other=value';
    expect(getTwitterCsrfToken(cookies)).toBe('firsttoken');
  });

  it('should handle ct0 as only cookie', () => {
    const cookies = 'ct0=onlytoken';
    expect(getTwitterCsrfToken(cookies)).toBe('onlytoken');
  });
});
