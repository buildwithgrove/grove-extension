import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupFetchMock } from './mocks/fetch.js';

let MetadataFetcher;
let AddressParser;
let mockFetch;

beforeEach(() => {
  mockFetch = setupFetchMock();

  // Mock AddressParser
  AddressParser = {
    hasAddresses: vi.fn((content) => {
      // Check for ETH addresses or ENS names
      return /0x[a-fA-F0-9]{40}/.test(content) || /[\w-]+\.eth/.test(content);
    }),
    resolveAddress: vi.fn((content) => {
      const ethMatch = content.match(/0x[a-fA-F0-9]{40}/);
      if (ethMatch) {
        return { address: ethMatch[0], type: 'eth' };
      }
      const ensMatch = content.match(/([\w-]+\.eth)/);
      if (ensMatch) {
        return { address: ensMatch[1], type: 'ens' };
      }
      return { address: null };
    })
  };

  global.AddressParser = AddressParser;

  // Create MetadataFetcher class for testing
  class TestMetadataFetcher {
    static cache = new Map();
    static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    static async fetchAndCheck(origin) {
      if (!origin) {
        origin = window?.location?.origin || '';
      }

      const cached = this.getCached(origin);
      if (cached !== null) {
        return cached;
      }

      const filesToTry = [
        '/llms.txt',
        '/ai.txt',
        '/.well-known/llms.txt',
        '/.well-known/ai.txt'
      ];

      for (const file of filesToTry) {
        try {
          const url = origin + file;
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'text/plain' },
            signal: AbortSignal.timeout(3000)
          });

          if (response.ok) {
            const content = await response.text();

            if (AddressParser.hasAddresses(content)) {
              const addressResult = AddressParser.resolveAddress(content);

              if (addressResult.address) {
                const result = {
                  found: true,
                  source: file,
                  content: content,
                  address: addressResult
                };
                this.setCache(origin, result);
                return result;
              }
            }
          }
        } catch (error) {
          continue;
        }
      }

      const result = {
        found: false,
        source: null,
        content: null,
        address: null
      };
      this.setCache(origin, result);
      return result;
    }

    static getCached(origin) {
      const cached = this.cache.get(origin);
      if (!cached) return null;

      if (Date.now() - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(origin);
        return null;
      }

      return cached.data;
    }

    static setCache(origin, data) {
      this.cache.set(origin, {
        data,
        timestamp: Date.now()
      });
    }

    static clearCache(origin) {
      if (origin) {
        this.cache.delete(origin);
      } else {
        this.cache.clear();
      }
    }
  }

  MetadataFetcher = TestMetadataFetcher;

  // Mock AbortSignal.timeout
  global.AbortSignal = {
    timeout: vi.fn(() => ({}))
  };
});

afterEach(() => {
  mockFetch.reset();
  MetadataFetcher.clearCache();
  delete global.AddressParser;
  delete global.AbortSignal;
});

describe('MetadataFetcher', () => {
  const testOrigin = 'https://example.com';

  describe('fetchAndCheck', () => {
    it('should find address in llms.txt', async () => {
      const content = 'Tip me at 0x1234567890123456789012345678901234567890';
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, content);

      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(true);
      expect(result.source).toBe('/llms.txt');
      expect(result.content).toBe(content);
      expect(result.address.address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should find address in ai.txt if llms.txt not found', async () => {
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, { error: 'Not found' }, { status: 404 });
      const content = 'Contact: vitalik.eth';
      mockFetch.mockResponse('GET', `${testOrigin}/ai.txt`, content);

      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(true);
      expect(result.source).toBe('/ai.txt');
      expect(result.address.address).toBe('vitalik.eth');
    });

    it('should try .well-known paths', async () => {
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, {}, { status: 404 });
      mockFetch.mockResponse('GET', `${testOrigin}/ai.txt`, {}, { status: 404 });
      const content = 'Wallet: 0xabcdef1234567890123456789012345678901234';
      mockFetch.mockResponse('GET', `${testOrigin}/.well-known/llms.txt`, content);

      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(true);
      expect(result.source).toBe('/.well-known/llms.txt');
    });

    it('should return not found if no files have addresses', async () => {
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, 'No addresses here');
      mockFetch.mockResponse('GET', `${testOrigin}/ai.txt`, 'Also no addresses');
      mockFetch.mockResponse('GET', `${testOrigin}/.well-known/llms.txt`, 'Nothing');
      mockFetch.mockResponse('GET', `${testOrigin}/.well-known/ai.txt`, 'Nope');

      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(false);
      expect(result.source).toBeNull();
      expect(result.address).toBeNull();
    });

    it('should return not found if all files return 404', async () => {
      mockFetch.setDefault({ error: 'Not found' }, { status: 404 });

      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockError('GET', `${testOrigin}/llms.txt`, 'Network error');
      mockFetch.mockError('GET', `${testOrigin}/ai.txt`, 'Network error');
      mockFetch.mockError('GET', `${testOrigin}/.well-known/llms.txt`, 'Network error');
      mockFetch.mockError('GET', `${testOrigin}/.well-known/ai.txt`, 'Network error');

      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(false);
    });

    it('should skip files with addresses that cannot be resolved', async () => {
      const contentWithFakeAddress = 'Contact us';
      AddressParser.hasAddresses.mockReturnValueOnce(true);
      AddressParser.resolveAddress.mockReturnValueOnce({ address: null });
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, contentWithFakeAddress);

      // Second file has real address
      const contentWithRealAddress = 'Pay: 0x1234567890123456789012345678901234567890';
      mockFetch.mockResponse('GET', `${testOrigin}/ai.txt`, contentWithRealAddress);

      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(true);
      expect(result.source).toBe('/ai.txt');
    });
  });

  describe('caching', () => {
    it('should cache successful results', async () => {
      const content = 'Address: 0x1234567890123456789012345678901234567890';
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, content);

      // First call
      await MetadataFetcher.fetchAndCheck(testOrigin);

      // Clear mock to ensure cache is used
      mockFetch.reset();

      // Second call should use cache
      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(true);
      expect(mockFetch.getCalls()).toHaveLength(0);
    });

    it('should cache not-found results', async () => {
      mockFetch.setDefault({}, { status: 404 });

      // First call
      await MetadataFetcher.fetchAndCheck(testOrigin);

      // Clear mock
      mockFetch.reset();

      // Second call should use cache
      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(false);
      expect(mockFetch.getCalls()).toHaveLength(0);
    });

    it('should expire cache after TTL', async () => {
      const content = 'Address: 0x1234567890123456789012345678901234567890';
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, content);

      // First call
      await MetadataFetcher.fetchAndCheck(testOrigin);

      // Manually expire cache
      const cached = MetadataFetcher.cache.get(testOrigin);
      cached.timestamp = Date.now() - MetadataFetcher.CACHE_TTL - 1000;

      // Re-mock the response
      mockFetch.reset();
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, content);

      // Should make new request
      await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(mockFetch.getCalls()).toHaveLength(1);
    });
  });

  describe('getCached', () => {
    it('should return null for non-existent origin', () => {
      const result = MetadataFetcher.getCached('https://unknown.com');
      expect(result).toBeNull();
    });

    it('should return cached data within TTL', async () => {
      const content = '0x1234567890123456789012345678901234567890';
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, content);

      await MetadataFetcher.fetchAndCheck(testOrigin);

      const cached = MetadataFetcher.getCached(testOrigin);
      expect(cached.found).toBe(true);
    });

    it('should return null and delete expired cache', async () => {
      const content = '0x1234567890123456789012345678901234567890';
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, content);

      await MetadataFetcher.fetchAndCheck(testOrigin);

      // Expire cache
      const cached = MetadataFetcher.cache.get(testOrigin);
      cached.timestamp = Date.now() - MetadataFetcher.CACHE_TTL - 1000;

      const result = MetadataFetcher.getCached(testOrigin);
      expect(result).toBeNull();
      expect(MetadataFetcher.cache.has(testOrigin)).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear specific origin', async () => {
      const content = '0x1234567890123456789012345678901234567890';
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, content);
      mockFetch.mockResponse('GET', 'https://other.com/llms.txt', content);

      await MetadataFetcher.fetchAndCheck(testOrigin);
      await MetadataFetcher.fetchAndCheck('https://other.com');

      MetadataFetcher.clearCache(testOrigin);

      expect(MetadataFetcher.cache.has(testOrigin)).toBe(false);
      expect(MetadataFetcher.cache.has('https://other.com')).toBe(true);
    });

    it('should clear all origins when called without argument', async () => {
      const content = '0x1234567890123456789012345678901234567890';
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, content);
      mockFetch.mockResponse('GET', 'https://other.com/llms.txt', content);

      await MetadataFetcher.fetchAndCheck(testOrigin);
      await MetadataFetcher.fetchAndCheck('https://other.com');

      MetadataFetcher.clearCache();

      expect(MetadataFetcher.cache.size).toBe(0);
    });
  });

  describe('address detection', () => {
    it('should detect ETH addresses', async () => {
      const content = 'Send tips to 0x742d35Cc6634C0532925a3b844Bc9e7595f0fAb3';
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, content);

      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(true);
      expect(result.address.type).toBe('eth');
    });

    it('should detect ENS names', async () => {
      const content = 'Contact: vitalik.eth for donations';
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, content);

      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(true);
      expect(result.address.address).toBe('vitalik.eth');
      expect(result.address.type).toBe('ens');
    });

    it('should handle multiple addresses by returning first', async () => {
      const content = '0x1111111111111111111111111111111111111111 and 0x2222222222222222222222222222222222222222';
      mockFetch.mockResponse('GET', `${testOrigin}/llms.txt`, content);

      const result = await MetadataFetcher.fetchAndCheck(testOrigin);

      expect(result.found).toBe(true);
      expect(result.address.address).toBe('0x1111111111111111111111111111111111111111');
    });
  });
});
