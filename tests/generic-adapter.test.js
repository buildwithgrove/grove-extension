import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';
import { setupFetchMock } from './mocks/fetch.js';

/**
 * Tests for the generic adapter and API resolve fallback (grove-extension#124).
 *
 * The generic website flow in content.js:
 *   1. Try llms.txt / ai.txt via MetadataFetcher
 *   2. If not found → call GroveAPI.resolveDestination(origin) as fallback
 *   3. Validate returned address client-side
 *   4. Show floating tip button if valid
 *
 * Because content.js is an IIFE that auto-executes, these tests exercise the
 * individual components and the orchestration logic they depend on.
 */

let context;
let mockFetch;

function createContext(url = 'https://example.com') {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url });

  mockFetch = setupFetchMock();

  context = {
    window: dom.window,
    document: dom.window.document,
    console,
    fetch: global.fetch,
    AbortSignal: { timeout: vi.fn(() => ({})) },
    Map: Map,
  };
  context.window = context;
  context.window.location = dom.window.location;

  // Mock AddressParser
  context.AddressParser = {
    hasAddresses: vi.fn((content) => {
      return /0x[a-fA-F0-9]{40}/.test(content) || /[\w-]+\.eth/.test(content);
    }),
    resolveAddress: vi.fn((content) => {
      const ethMatch = content.match(/0x[a-fA-F0-9]{40}/);
      if (ethMatch) return { address: ethMatch[0], type: 'eth' };
      const ensMatch = content.match(/([\w-]+\.eth)/);
      if (ensMatch) return { address: ensMatch[1], type: 'ens' };
      return { address: null };
    }),
  };

  // Load MetadataFetcher (real implementation)
  loadBrowserScript('src/utils/metadata.js', context);

  // Load GenericAdapter base class + adapter
  loadBrowserScript('src/adapters/base.js', context);
  loadBrowserScript('src/adapters/generic.js', context);

  return context;
}

afterEach(() => {
  if (mockFetch) mockFetch.reset();
  if (context?.MetadataFetcher) context.MetadataFetcher.clearCache();
  vi.restoreAllMocks();
});

describe('GenericAdapter', () => {
  beforeEach(() => {
    createContext('https://example.com');
  });

  it('should detect metadata from llms.txt', async () => {
    const content = 'Tip me at 0x1234567890123456789012345678901234567890';
    mockFetch.mockResponse('GET', 'https://example.com/llms.txt', content);

    const adapter = new context.GenericAdapter();
    const metadata = await adapter.fetchMetadata();

    expect(metadata.found).toBe(true);
    expect(metadata.source).toBe('/llms.txt');
    expect(metadata.address.address).toBe('0x1234567890123456789012345678901234567890');
  });

  it('should return not found when no metadata files exist', async () => {
    mockFetch.setDefault({}, { status: 404 });

    const adapter = new context.GenericAdapter();
    const metadata = await adapter.fetchMetadata();

    expect(metadata.found).toBe(false);
    expect(metadata.address).toBeNull();
  });

  it('should always return true for detectTippablePage', () => {
    const adapter = new context.GenericAdapter();
    expect(adapter.detectTippablePage()).toBe(true);
  });

  it('should return null for getButtonPlacement (uses floating button)', () => {
    const adapter = new context.GenericAdapter();
    expect(adapter.getButtonPlacement()).toBeNull();
  });
});

describe('Generic website API resolve fallback (#124)', () => {
  /**
   * Simulates the initializeGenericWebsite() flow from content.js.
   * This reproduces the exact logic without needing to load the full IIFE.
   */
  async function simulateGenericWebsiteInit(adapter, mockGroveAPI) {
    const metadata = await adapter.fetchMetadata();

    if (metadata.found) {
      return {
        resolved: true,
        source: 'metadata',
        address: metadata.address,
      };
    }

    // API fallback (new code path from #124)
    if (!mockGroveAPI || typeof mockGroveAPI.resolveDestination !== 'function') {
      return { resolved: false, reason: 'no_api' };
    }

    const result = await mockGroveAPI.resolveDestination(context.window.location.origin);

    if (!result.tippable || !result.addresses || result.addresses.length === 0) {
      return { resolved: false, reason: 'not_tippable' };
    }

    const primaryAddress = result.addresses[0];
    if (!primaryAddress?.address) {
      return { resolved: false, reason: 'empty_address' };
    }

    const validation = context.AddressParser.resolveAddress(primaryAddress.address);
    if (!validation?.address) {
      return { resolved: false, reason: 'invalid_address' };
    }

    return {
      resolved: true,
      source: 'api',
      address: {
        address: validation.address,
        type: primaryAddress.source || validation.type || 'grove_profile',
        token: primaryAddress.token,
        chain: primaryAddress.chain,
      },
    };
  }

  beforeEach(() => {
    createContext('https://personalsite.com');
    // All metadata files return 404
    mockFetch.setDefault({}, { status: 404 });
  });

  it('should resolve via API when metadata not found and API returns tippable', async () => {
    const adapter = new context.GenericAdapter();
    const mockAPI = {
      resolveDestination: vi.fn().mockResolvedValue({
        tippable: true,
        addresses: [{ address: 'creator.eth', source: 'grove_profile', token: 'USDC', chain: 'base' }],
        error: null,
      }),
    };

    const result = await simulateGenericWebsiteInit(adapter, mockAPI);

    expect(result.resolved).toBe(true);
    expect(result.source).toBe('api');
    expect(result.address.address).toBe('creator.eth');
    expect(result.address.type).toBe('grove_profile');
    expect(result.address.token).toBe('USDC');
    expect(result.address.chain).toBe('base');
    expect(mockAPI.resolveDestination).toHaveBeenCalledWith('https://personalsite.com');
  });

  it('should resolve via API with 0x address', async () => {
    const adapter = new context.GenericAdapter();
    const addr = '0xabcdef1234567890123456789012345678901234';
    const mockAPI = {
      resolveDestination: vi.fn().mockResolvedValue({
        tippable: true,
        addresses: [{ address: addr, source: 'identity_graph' }],
        error: null,
      }),
    };

    const result = await simulateGenericWebsiteInit(adapter, mockAPI);

    expect(result.resolved).toBe(true);
    expect(result.address.address).toBe(addr);
  });

  it('should not resolve when API returns not tippable', async () => {
    const adapter = new context.GenericAdapter();
    const mockAPI = {
      resolveDestination: vi.fn().mockResolvedValue({
        tippable: false,
        addresses: [],
        error: 'No destination found',
      }),
    };

    const result = await simulateGenericWebsiteInit(adapter, mockAPI);

    expect(result.resolved).toBe(false);
    expect(result.reason).toBe('not_tippable');
  });

  it('should not resolve when API returns empty addresses array', async () => {
    const adapter = new context.GenericAdapter();
    const mockAPI = {
      resolveDestination: vi.fn().mockResolvedValue({
        tippable: true,
        addresses: [],
        error: null,
      }),
    };

    const result = await simulateGenericWebsiteInit(adapter, mockAPI);

    expect(result.resolved).toBe(false);
    expect(result.reason).toBe('not_tippable');
  });

  it('should not resolve when API returns address that fails client-side validation', async () => {
    const adapter = new context.GenericAdapter();
    const mockAPI = {
      resolveDestination: vi.fn().mockResolvedValue({
        tippable: true,
        addresses: [{ address: 'not-a-valid-address', source: 'api' }],
        error: null,
      }),
    };

    const result = await simulateGenericWebsiteInit(adapter, mockAPI);

    expect(result.resolved).toBe(false);
    expect(result.reason).toBe('invalid_address');
  });

  it('should gracefully handle API errors', async () => {
    const adapter = new context.GenericAdapter();
    const mockAPI = {
      resolveDestination: vi.fn().mockRejectedValue(new Error('Network error')),
    };

    await expect(simulateGenericWebsiteInit(adapter, mockAPI)).rejects.toThrow('Network error');
  });

  it('should prefer metadata over API when metadata is found', async () => {
    // Override: llms.txt has an address
    mockFetch.reset();
    const content = 'Tip: 0x1111111111111111111111111111111111111111';
    mockFetch.mockResponse('GET', 'https://personalsite.com/llms.txt', content);

    const adapter = new context.GenericAdapter();
    const mockAPI = {
      resolveDestination: vi.fn().mockResolvedValue({
        tippable: true,
        addresses: [{ address: '0x2222222222222222222222222222222222222222', source: 'api' }],
      }),
    };

    const result = await simulateGenericWebsiteInit(adapter, mockAPI);

    expect(result.resolved).toBe(true);
    expect(result.source).toBe('metadata');
    expect(result.address.address).toBe('0x1111111111111111111111111111111111111111');
    // API should never be called when metadata is found
    expect(mockAPI.resolveDestination).not.toHaveBeenCalled();
  });

  it('should handle missing GroveAPI gracefully', async () => {
    const adapter = new context.GenericAdapter();

    const result = await simulateGenericWebsiteInit(adapter, undefined);

    expect(result.resolved).toBe(false);
    expect(result.reason).toBe('no_api');
  });
});

describe('Generic website API-first resolution order', () => {
  /**
   * Simulates the NEW initializeGenericWebsite() flow from content.js:
   *   Stage 1: API resolve first
   *   Stage 2: Metadata file fallback (if API fails or returns non-tippable)
   */
  async function simulateApiFirstInit(adapter, mockGroveAPI) {
    // Stage 1: Try API resolve first
    if (mockGroveAPI && typeof mockGroveAPI.resolveDestination === 'function') {
      try {
        const result = await mockGroveAPI.resolveDestination(context.window.location.origin);

        if (result.tippable && result.addresses && result.addresses.length > 0) {
          const primaryAddress = result.addresses[0];
          if (primaryAddress?.address) {
            const validation = context.AddressParser.resolveAddress(primaryAddress.address);
            if (validation?.address) {
              return {
                resolved: true,
                source: 'api',
                address: {
                  address: validation.address,
                  type: primaryAddress.source || validation.type || 'grove_profile',
                  token: primaryAddress.token,
                  chain: primaryAddress.chain,
                },
              };
            }
          }
        }

        // API returned non-tippable — fall through to metadata (NOT early return)
      } catch (_error) {
        // API unreachable — fall through to metadata
      }
    }

    // Stage 2: Fallback — probe metadata files
    try {
      const metadata = await adapter.fetchMetadata();
      if (metadata.found) {
        return { resolved: true, source: 'metadata', address: metadata.address };
      }
    } catch (_error) {
      // metadata probe failed
    }

    return { resolved: false, reason: 'no_address_found' };
  }

  beforeEach(() => {
    createContext('https://personalsite.com');
  });

  afterEach(() => {
    if (mockFetch) mockFetch.reset();
  });

  it('should resolve via API when API returns tippable (no metadata probe needed)', async () => {
    mockFetch.setDefault({}, { status: 404 });

    const adapter = new context.GenericAdapter();
    const mockAPI = {
      resolveDestination: vi.fn().mockResolvedValue({
        tippable: true,
        addresses: [{ address: 'creator.eth', source: 'grove_profile', token: 'USDC', chain: 'base' }],
      }),
    };

    const result = await simulateApiFirstInit(adapter, mockAPI);

    expect(result.resolved).toBe(true);
    expect(result.source).toBe('api');
    expect(result.address.address).toBe('creator.eth');
    expect(mockAPI.resolveDestination).toHaveBeenCalledWith('https://personalsite.com');
  });

  it('should fall back to metadata when API returns non-tippable', async () => {
    const content = 'Tip me at 0x1234567890123456789012345678901234567890';
    mockFetch.mockResponse('GET', 'https://personalsite.com/llms.txt', content);

    const adapter = new context.GenericAdapter();
    const mockAPI = {
      resolveDestination: vi.fn().mockResolvedValue({
        tippable: false,
        addresses: [],
        error: 'No destination found',
      }),
    };

    const result = await simulateApiFirstInit(adapter, mockAPI);

    expect(result.resolved).toBe(true);
    expect(result.source).toBe('metadata');
    expect(result.address.address).toBe('0x1234567890123456789012345678901234567890');
    expect(mockAPI.resolveDestination).toHaveBeenCalled();
  });

  it('should fall back to metadata when API throws error', async () => {
    const content = 'Tip me at 0xabcdef1234567890123456789012345678901234';
    mockFetch.mockResponse('GET', 'https://personalsite.com/llms.txt', content);

    const adapter = new context.GenericAdapter();
    const mockAPI = {
      resolveDestination: vi.fn().mockRejectedValue(new Error('Network error')),
    };

    const result = await simulateApiFirstInit(adapter, mockAPI);

    expect(result.resolved).toBe(true);
    expect(result.source).toBe('metadata');
    expect(result.address.address).toBe('0xabcdef1234567890123456789012345678901234');
  });

  it('should fall back to metadata when GroveAPI is undefined', async () => {
    const content = 'Tip: 0x1111111111111111111111111111111111111111';
    mockFetch.mockResponse('GET', 'https://personalsite.com/llms.txt', content);

    const adapter = new context.GenericAdapter();

    const result = await simulateApiFirstInit(adapter, undefined);

    expect(result.resolved).toBe(true);
    expect(result.source).toBe('metadata');
    expect(result.address.address).toBe('0x1111111111111111111111111111111111111111');
  });

  it('should return not resolved when both API and metadata fail', async () => {
    mockFetch.setDefault({}, { status: 404 });

    const adapter = new context.GenericAdapter();
    const mockAPI = {
      resolveDestination: vi.fn().mockResolvedValue({
        tippable: false,
        addresses: [],
      }),
    };

    const result = await simulateApiFirstInit(adapter, mockAPI);

    expect(result.resolved).toBe(false);
    expect(result.reason).toBe('no_address_found');
  });
});
