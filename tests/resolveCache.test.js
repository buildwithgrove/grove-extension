import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupChromeMock, resetChromeMock } from './mocks/chrome.js';
import { loadBrowserScript } from './helpers/load-script.js';

let ResolveCache;
let mockChrome;
let context;

beforeEach(() => {
  mockChrome = setupChromeMock();

  context = {
    window: {},
    console: console,
    chrome: mockChrome,
    Date,
  };
  context.window = context;

  loadBrowserScript('src/utils/resolveCache.js', context);
  ResolveCache = context.ResolveCache;
  ResolveCache.reset();
});

afterEach(() => {
  resetChromeMock(mockChrome);
  vi.restoreAllMocks();
});

describe('ResolveCache', () => {
  const tippableResult = {
    tippable: true,
    addresses: [{ address: '0x123', source: 'api' }],
    source: 'grove_profile',
    error: null,
  };

  const nonTippableResult = {
    tippable: false,
    addresses: [],
    error: null,
  };

  describe('get / set', () => {
    it('should return null for uncached destinations', async () => {
      const result = await ResolveCache.get('x.com/alice');
      expect(result).toBeNull();
    });

    it('should cache and retrieve a tippable result', async () => {
      await ResolveCache.set('x.com/alice', tippableResult);
      const cached = await ResolveCache.get('x.com/alice');

      expect(cached).toEqual(tippableResult);
    });

    it('should cache and retrieve a non-tippable result', async () => {
      await ResolveCache.set('example.com', nonTippableResult);
      const cached = await ResolveCache.get('example.com');

      expect(cached).toEqual(nonTippableResult);
    });

    it('should return different results for different destinations', async () => {
      await ResolveCache.set('x.com/alice', tippableResult);
      await ResolveCache.set('example.com', nonTippableResult);

      expect(await ResolveCache.get('x.com/alice')).toEqual(tippableResult);
      expect(await ResolveCache.get('example.com')).toEqual(nonTippableResult);
    });
  });

  describe('TTL expiration', () => {
    it('should expire tippable results after POSITIVE_TTL', async () => {
      await ResolveCache.set('x.com/alice', tippableResult);

      // Manually expire the entry
      const entry = ResolveCache.memCache.get('x.com/alice');
      entry.timestamp = Date.now() - ResolveCache.POSITIVE_TTL - 1000;

      const cached = await ResolveCache.get('x.com/alice');
      expect(cached).toBeNull();
    });

    it('should expire non-tippable results after NEGATIVE_TTL', async () => {
      await ResolveCache.set('example.com', nonTippableResult);

      // Manually expire the entry
      const entry = ResolveCache.memCache.get('example.com');
      entry.timestamp = Date.now() - ResolveCache.NEGATIVE_TTL - 1000;

      const cached = await ResolveCache.get('example.com');
      expect(cached).toBeNull();
    });

    it('should keep tippable results within POSITIVE_TTL', async () => {
      await ResolveCache.set('x.com/alice', tippableResult);

      // Set to just under the TTL
      const entry = ResolveCache.memCache.get('x.com/alice');
      entry.timestamp = Date.now() - ResolveCache.POSITIVE_TTL + 5000;

      const cached = await ResolveCache.get('x.com/alice');
      expect(cached).toEqual(tippableResult);
    });

    it('should use shorter TTL for negative results than positive', () => {
      expect(ResolveCache.NEGATIVE_TTL).toBeLessThan(ResolveCache.POSITIVE_TTL);
    });
  });

  describe('persistence', () => {
    it('should persist cache to chrome.storage.local on set', async () => {
      await ResolveCache.set('x.com/alice', tippableResult);

      expect(mockChrome.storage.local.set).toHaveBeenCalled();
      const storedData = mockChrome.storage.local._getData();
      expect(storedData[ResolveCache.STORAGE_KEY]).toBeDefined();
      expect(storedData[ResolveCache.STORAGE_KEY]['x.com/alice'].tippable).toBe(true);
    });

    it('should hydrate from chrome.storage.local on first get', async () => {
      // Pre-populate storage with cached data
      const storedEntry = {
        'x.com/bob': {
          tippable: true,
          result: tippableResult,
          timestamp: Date.now(),
        },
      };
      mockChrome.storage.local._setData({
        [ResolveCache.STORAGE_KEY]: storedEntry,
      });

      // Reset to force re-hydration
      ResolveCache.reset();

      const cached = await ResolveCache.get('x.com/bob');
      expect(cached).toEqual(tippableResult);
    });

    it('should not hydrate expired entries from storage', async () => {
      const storedEntry = {
        'x.com/expired': {
          tippable: true,
          result: tippableResult,
          timestamp: Date.now() - ResolveCache.POSITIVE_TTL - 1000,
        },
      };
      mockChrome.storage.local._setData({
        [ResolveCache.STORAGE_KEY]: storedEntry,
      });

      ResolveCache.reset();

      const cached = await ResolveCache.get('x.com/expired');
      expect(cached).toBeNull();
    });

    it('should only hydrate once per lifecycle', async () => {
      await ResolveCache.get('anything');
      const callCount = mockChrome.storage.local.get.mock.calls.length;

      await ResolveCache.get('anything-else');
      // Should not call storage.get again
      expect(mockChrome.storage.local.get.mock.calls.length).toBe(callCount);
    });
  });

  describe('prune / MAX_ENTRIES', () => {
    it('should evict oldest entries when exceeding MAX_ENTRIES', async () => {
      // Temporarily lower MAX_ENTRIES for test
      const originalMax = ResolveCache.MAX_ENTRIES;
      ResolveCache.MAX_ENTRIES = 3;

      try {
        await ResolveCache.set('dest-1', tippableResult);
        await ResolveCache.set('dest-2', tippableResult);
        await ResolveCache.set('dest-3', tippableResult);

        // Make dest-1 the oldest
        ResolveCache.memCache.get('dest-1').timestamp = Date.now() - 10000;
        ResolveCache.memCache.get('dest-2').timestamp = Date.now() - 5000;

        // Adding a 4th entry should evict dest-1
        await ResolveCache.set('dest-4', tippableResult);

        expect(await ResolveCache.get('dest-1')).toBeNull();
        expect(await ResolveCache.get('dest-2')).not.toBeNull();
        expect(await ResolveCache.get('dest-4')).not.toBeNull();
        expect(ResolveCache.memCache.size).toBeLessThanOrEqual(3);
      } finally {
        ResolveCache.MAX_ENTRIES = originalMax;
      }
    });

    it('should remove expired entries during prune', async () => {
      await ResolveCache.set('fresh', tippableResult);
      await ResolveCache.set('stale', nonTippableResult);

      // Expire the stale entry
      ResolveCache.memCache.get('stale').timestamp =
        Date.now() - ResolveCache.NEGATIVE_TTL - 1000;

      ResolveCache.prune();

      expect(ResolveCache.memCache.has('fresh')).toBe(true);
      expect(ResolveCache.memCache.has('stale')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear a specific destination', async () => {
      await ResolveCache.set('x.com/alice', tippableResult);
      await ResolveCache.set('x.com/bob', tippableResult);

      await ResolveCache.clear('x.com/alice');

      expect(await ResolveCache.get('x.com/alice')).toBeNull();
      expect(await ResolveCache.get('x.com/bob')).toEqual(tippableResult);
    });

    it('should clear all entries when called without argument', async () => {
      await ResolveCache.set('x.com/alice', tippableResult);
      await ResolveCache.set('x.com/bob', tippableResult);

      await ResolveCache.clear();

      expect(ResolveCache.memCache.size).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear memory cache and hydration flag', async () => {
      await ResolveCache.set('x.com/alice', tippableResult);
      expect(ResolveCache.memCache.size).toBe(1);
      expect(ResolveCache.hydrated).toBe(true);

      ResolveCache.reset();

      expect(ResolveCache.memCache.size).toBe(0);
      expect(ResolveCache.hydrated).toBe(false);
    });
  });

  describe('graceful degradation', () => {
    it('should work when chrome.storage is unavailable', async () => {
      // Simulate no chrome.storage
      const savedChrome = context.chrome;
      context.chrome = undefined;
      global.chrome = undefined;

      ResolveCache.reset();

      // Should not throw — just operates with in-memory only
      await ResolveCache.set('x.com/alice', tippableResult);
      const cached = await ResolveCache.get('x.com/alice');
      expect(cached).toEqual(tippableResult);

      // Restore
      context.chrome = savedChrome;
      global.chrome = savedChrome;
    });
  });
});
