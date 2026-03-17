/**
 * Integration test: ResolveCache + GroveAPI.resolveDestination
 *
 * Verifies that the resolve cache layer correctly prevents redundant API calls
 * and that cached results are served when available.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupChromeMock, resetChromeMock } from '../mocks/chrome.js';
import { setupFetchMock } from '../mocks/fetch.js';
import { loadBrowserScript } from '../helpers/load-script.js';

let GroveAPI;
let ResolveCache;
let mockChrome;
let mockFetch;
let context;

beforeEach(() => {
  mockChrome = setupChromeMock();
  mockFetch = setupFetchMock();

  context = {
    window: {},
    location: { protocol: 'chrome-extension:', hostname: 'mock-extension-id' },
    console: console,
    chrome: mockChrome,
    fetch: mockFetch.fetch,
    URL: URL,
    URLSearchParams: URLSearchParams,
    BigInt: BigInt,
    AbortController: AbortController,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Date,
  };
  context.window = context;

  // Load in dependency order (mirrors manifest.json)
  loadBrowserScript('src/config/environments.js', context);
  loadBrowserScript('src/config/chains.js', context);
  loadBrowserScript('src/utils/resolveCache.js', context);
  loadBrowserScript('src/utils/api.js', context);

  GroveAPI = context.GroveAPI;
  ResolveCache = context.ResolveCache;
  ResolveCache.reset();
});

afterEach(() => {
  resetChromeMock(mockChrome);
  mockFetch.reset();
  vi.restoreAllMocks();
});

describe('resolveDestination with ResolveCache', () => {
  const resolveUrl = 'https://api.grove.city/v1/tip/resolve?destination=x.com%2Falice';
  const tippableApiResponse = {
    tippable: true,
    addresses: [{ address: '0xabc123', source: 'bio', token: 'USDC', chain: 'base' }],
    source: 'x',
  };
  const nonTippableApiResponse = {
    tippable: false,
    addresses: [],
  };

  it('should call API on first request (cache miss)', async () => {
    mockFetch.mockResponse('GET', resolveUrl, tippableApiResponse, { status: 200 });

    const result = await GroveAPI.resolveDestination('https://x.com/alice');

    expect(result.tippable).toBe(true);
    expect(result.addresses).toHaveLength(1);
    expect(mockFetch.getCalls()).toHaveLength(1);
  });

  it('should serve from cache on second request (no API call)', async () => {
    mockFetch.mockResponse('GET', resolveUrl, tippableApiResponse, { status: 200 });

    // First call — populates cache
    await GroveAPI.resolveDestination('https://x.com/alice');
    expect(mockFetch.getCalls()).toHaveLength(1);

    // Reset fetch mock to track new calls
    mockFetch.reset();

    // Second call — should use cache
    const result = await GroveAPI.resolveDestination('https://x.com/alice');

    expect(result.tippable).toBe(true);
    expect(result.addresses).toHaveLength(1);
    expect(mockFetch.getCalls()).toHaveLength(0); // No new API call
  });

  it('should cache non-tippable results', async () => {
    mockFetch.mockResponse('GET', resolveUrl, nonTippableApiResponse, { status: 200 });

    // First call
    await GroveAPI.resolveDestination('https://x.com/alice');

    mockFetch.reset();

    // Second call should use cache
    const result = await GroveAPI.resolveDestination('https://x.com/alice');

    expect(result.tippable).toBe(false);
    expect(mockFetch.getCalls()).toHaveLength(0);
  });

  it('should cache API error responses (non-2xx)', async () => {
    mockFetch.mockResponse('GET', resolveUrl,
      { message: 'Invalid destination format' },
      { status: 400 }
    );

    // First call — gets 400 error
    const result1 = await GroveAPI.resolveDestination('https://x.com/alice');
    expect(result1.tippable).toBe(false);
    expect(result1.error).toBe('Invalid destination format');

    mockFetch.reset();

    // Second call — should use cache (don't re-ping the API)
    const result2 = await GroveAPI.resolveDestination('https://x.com/alice');
    expect(result2.tippable).toBe(false);
    expect(mockFetch.getCalls()).toHaveLength(0);
  });

  it('should NOT cache network errors (allow retry)', async () => {
    mockFetch.mockError('GET', resolveUrl, 'Network failure');

    // First call — network error
    const result1 = await GroveAPI.resolveDestination('https://x.com/alice');
    expect(result1.error).toBe('Network failure');

    // Re-mock for second attempt (this time succeeding)
    mockFetch.reset();
    mockFetch.mockResponse('GET', resolveUrl, tippableApiResponse, { status: 200 });

    // Second call — should retry since network errors aren't cached
    const result2 = await GroveAPI.resolveDestination('https://x.com/alice');
    expect(result2.tippable).toBe(true);
    expect(mockFetch.getCalls()).toHaveLength(1);
  });

  it('should make new API call after cache expires', async () => {
    mockFetch.mockResponse('GET', resolveUrl, tippableApiResponse, { status: 200 });

    // First call — populates cache
    await GroveAPI.resolveDestination('https://x.com/alice');

    // Manually expire the cache entry
    const entry = ResolveCache.memCache.get('x.com/alice');
    entry.timestamp = Date.now() - ResolveCache.POSITIVE_TTL - 1000;

    mockFetch.reset();
    mockFetch.mockResponse('GET', resolveUrl, tippableApiResponse, { status: 200 });

    // Should make a new API call
    await GroveAPI.resolveDestination('https://x.com/alice');
    expect(mockFetch.getCalls()).toHaveLength(1);
  });

  it('should persist cache to chrome.storage.local', async () => {
    mockFetch.mockResponse('GET', resolveUrl, tippableApiResponse, { status: 200 });

    await GroveAPI.resolveDestination('https://x.com/alice');

    const storedData = mockChrome.storage.local._getData();
    const cache = storedData[ResolveCache.STORAGE_KEY];
    expect(cache).toBeDefined();
    expect(cache['x.com/alice']).toBeDefined();
    expect(cache['x.com/alice'].tippable).toBe(true);
  });

  it('should handle different destinations independently', async () => {
    const aliceUrl = 'https://api.grove.city/v1/tip/resolve?destination=x.com%2Falice';
    const bobUrl = 'https://api.grove.city/v1/tip/resolve?destination=x.com%2Fbob';

    mockFetch.mockResponse('GET', aliceUrl, tippableApiResponse, { status: 200 });
    mockFetch.mockResponse('GET', bobUrl, nonTippableApiResponse, { status: 200 });

    const alice = await GroveAPI.resolveDestination('https://x.com/alice');
    const bob = await GroveAPI.resolveDestination('https://x.com/bob');

    expect(alice.tippable).toBe(true);
    expect(bob.tippable).toBe(false);
    expect(mockFetch.getCalls()).toHaveLength(2);

    // Both should now be cached
    mockFetch.reset();

    const alice2 = await GroveAPI.resolveDestination('https://x.com/alice');
    const bob2 = await GroveAPI.resolveDestination('https://x.com/bob');

    expect(alice2.tippable).toBe(true);
    expect(bob2.tippable).toBe(false);
    expect(mockFetch.getCalls()).toHaveLength(0);
  });

  it('should survive hydration from storage after reset', async () => {
    mockFetch.mockResponse('GET', resolveUrl, tippableApiResponse, { status: 200 });

    // Populate cache
    await GroveAPI.resolveDestination('https://x.com/alice');

    // Simulate new content-script lifecycle (reset in-memory, hydrate from storage)
    ResolveCache.reset();
    mockFetch.reset();

    // Should hydrate from chrome.storage.local and serve from cache
    const result = await GroveAPI.resolveDestination('https://x.com/alice');
    expect(result.tippable).toBe(true);
    expect(mockFetch.getCalls()).toHaveLength(0);
  });
});
