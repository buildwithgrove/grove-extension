import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let context;
let mockAdapter;
let mockGroveAPI;

function createContext(url = 'https://x.com/olshansky') {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="placement"></div></body></html>', { url });

  // Create mock GroveAPI
  mockGroveAPI = {
    resolveDestination: vi.fn()
  };

  // Create mock button element
  const mockButtonEl = dom.window.document.createElement('button');
  mockButtonEl.classList.add = vi.fn();

  // Create mock TipButton constructor
  const MockTipButton = vi.fn(function() {
    this.button = mockButtonEl;
    this.create = vi.fn(() => mockButtonEl);
    this.inject = vi.fn();
  });

  const ctx = {
    window: dom.window,
    document: dom.window.document,
    console: console,
    GroveAPI: mockGroveAPI,
    TipButton: MockTipButton,
    location: dom.window.location,
  };
  ctx.window = ctx;
  ctx.window.location = dom.window.location;

  // Load the script
  loadBrowserScript('src/content/profilePageHandler.js', ctx);

  return ctx;
}

function createMockAdapter(options = {}) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="placement"></div></body></html>');
  return {
    waitForProfileLoad: vi.fn(() => Promise.resolve(options.loaded !== false)),
    extractBio: vi.fn(() => options.bio || null),
    getButtonPlacement: vi.fn(() => options.placement || dom.window.document.getElementById('placement') || dom.window.document.createElement('div')),
    getPlatformName: vi.fn(() => options.platform || 'twitter'),
    ...options.overrides
  };
}

describe('ProfilePageHandler', () => {
  beforeEach(() => {
    context = createContext();
  });

  describe('buildDestinationUrl', () => {
    it('should return current URL without trailing slash', () => {
      const ctx = createContext('https://x.com/olshansky/');
      expect(ctx.ProfilePageHandler.buildDestinationUrl()).toBe('https://x.com/olshansky');
    });

    it('should return URL as-is if no trailing slash', () => {
      const ctx = createContext('https://x.com/vitalik');
      expect(ctx.ProfilePageHandler.buildDestinationUrl()).toBe('https://x.com/vitalik');
    });
  });

  describe('initialize with API resolution', () => {
    beforeEach(() => {
      context.ProfilePageHandler.init({
        hasAddresses: (text) => text && (text.includes('.eth') || text.includes('0x')),
        resolveAddress: (text) => {
          if (text.includes('.eth')) {
            const match = text.match(/(\w+\.eth)/);
            return match ? { address: match[1], type: 'ens' } : null;
          }
          if (text.includes('0x')) {
            const match = text.match(/(0x[a-fA-F0-9]{40})/);
            return match ? { address: match[1], type: 'address' } : null;
          }
          return null;
        },
        setCachedAddress: vi.fn(),
        onTipClick: vi.fn(),
        extractUsernameFromUrl: (url) => {
          const match = url.match(/x\.com\/([^\/]+)/);
          return match ? match[1] : null;
        }
      });
    });

    it('should use API resolution when GroveAPI is available', async () => {
      mockGroveAPI.resolveDestination.mockResolvedValue({
        tippable: true,
        addresses: [{ address: 'vitalik.eth', source: 'bio', token: 'USDC', chain: 'base' }],
        error: null
      });

      mockAdapter = createMockAdapter();

      const result = await context.ProfilePageHandler.initialize(mockAdapter);

      expect(mockGroveAPI.resolveDestination).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result.address).toBe('vitalik.eth');
      expect(result.type).toBe('bio');
    });

    it('should cache address after API resolution', async () => {
      mockGroveAPI.resolveDestination.mockResolvedValue({
        tippable: true,
        addresses: [{ address: '0x1234567890abcdef1234567890abcdef12345678', source: 'api' }],
        error: null
      });

      mockAdapter = createMockAdapter();

      await context.ProfilePageHandler.initialize(mockAdapter);

      expect(context.ProfilePageHandler.callbacks.setCachedAddress).toHaveBeenCalledWith(
        'olshansky',
        expect.objectContaining({ address: '0x1234567890abcdef1234567890abcdef12345678' })
      );
    });

    it('should fall back to DOM parsing when API returns not tippable', async () => {
      mockGroveAPI.resolveDestination.mockResolvedValue({
        tippable: false,
        addresses: [],
        error: null
      });

      mockAdapter = createMockAdapter({
        bio: 'Check out vitalik.eth for tips!'
      });

      const result = await context.ProfilePageHandler.initialize(mockAdapter);

      expect(mockGroveAPI.resolveDestination).toHaveBeenCalled();
      expect(mockAdapter.extractBio).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result.address).toBe('vitalik.eth');
      expect(result.type).toBe('ens');
    });

    it('should fall back to DOM parsing when API throws error', async () => {
      mockGroveAPI.resolveDestination.mockRejectedValue(new Error('Network error'));

      mockAdapter = createMockAdapter({
        bio: 'Send tips to olshansky.eth'
      });

      const result = await context.ProfilePageHandler.initialize(mockAdapter);

      expect(result).not.toBeNull();
      expect(result.address).toBe('olshansky.eth');
    });
  });

  describe('initialize with DOM parsing fallback', () => {
    beforeEach(() => {
      context.ProfilePageHandler.init({
        hasAddresses: (text) => text && (text.includes('.eth') || text.includes('0x')),
        resolveAddress: (text) => {
          if (text.includes('.eth')) {
            const match = text.match(/(\w+\.eth)/);
            return match ? { address: match[1], type: 'ens' } : null;
          }
          if (text.includes('0x')) {
            const match = text.match(/(0x[a-fA-F0-9]{40})/);
            return match ? { address: match[1], type: 'address' } : null;
          }
          return null;
        },
        setCachedAddress: vi.fn(),
        onTipClick: vi.fn(),
        extractUsernameFromUrl: vi.fn()
      });
    });

    it('should return null when no bio is found', async () => {
      mockGroveAPI.resolveDestination.mockResolvedValue({
        tippable: false,
        addresses: [],
        error: null
      });

      mockAdapter = createMockAdapter({
        bio: null
      });

      const result = await context.ProfilePageHandler.initialize(mockAdapter);

      expect(result).toBeNull();
    });

    it('should return null when bio has no tippable address', async () => {
      mockGroveAPI.resolveDestination.mockResolvedValue({
        tippable: false,
        addresses: [],
        error: null
      });

      mockAdapter = createMockAdapter({
        bio: 'Just a regular bio with no crypto addresses'
      });

      const result = await context.ProfilePageHandler.initialize(mockAdapter);

      expect(result).toBeNull();
    });

    it('should detect 0x addresses in bio', async () => {
      mockGroveAPI.resolveDestination.mockResolvedValue({
        tippable: false,
        addresses: [],
        error: null
      });

      mockAdapter = createMockAdapter({
        bio: 'Send tips to 0x1234567890abcdef1234567890abcdef12345678'
      });

      const result = await context.ProfilePageHandler.initialize(mockAdapter);

      expect(result).not.toBeNull();
      expect(result.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(result.type).toBe('address');
    });
  });

  describe('initialize without adapter', () => {
    it('should return null when no adapter provided', async () => {
      const result = await context.ProfilePageHandler.initialize(null);
      expect(result).toBeNull();
    });
  });

  describe('initialize when profile does not load', () => {
    beforeEach(() => {
      context.ProfilePageHandler.init({
        hasAddresses: vi.fn(),
        resolveAddress: vi.fn(),
        setCachedAddress: vi.fn(),
        onTipClick: vi.fn(),
        extractUsernameFromUrl: vi.fn()
      });
    });

    it('should return null when waitForProfileLoad returns false', async () => {
      mockAdapter = createMockAdapter({ loaded: false });

      const result = await context.ProfilePageHandler.initialize(mockAdapter);

      expect(result).toBeNull();
      expect(mockGroveAPI.resolveDestination).not.toHaveBeenCalled();
    });
  });

  describe('getButton', () => {
    beforeEach(() => {
      context.ProfilePageHandler.init({
        hasAddresses: vi.fn(() => true),
        resolveAddress: vi.fn(() => ({ address: 'test.eth', type: 'ens' })),
        setCachedAddress: vi.fn(),
        onTipClick: vi.fn(),
        extractUsernameFromUrl: vi.fn(() => 'test')
      });
    });

    it('should return null before initialization', () => {
      context.ProfilePageHandler.reset();
      expect(context.ProfilePageHandler.getButton()).toBeNull();
    });

    it('should return button after successful initialization', async () => {
      mockGroveAPI.resolveDestination.mockResolvedValue({
        tippable: true,
        addresses: [{ address: 'test.eth', source: 'bio' }],
        error: null
      });

      mockAdapter = createMockAdapter();

      await context.ProfilePageHandler.initialize(mockAdapter);

      expect(context.ProfilePageHandler.getButton()).not.toBeNull();
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      context.ProfilePageHandler.init({
        hasAddresses: vi.fn(() => true),
        resolveAddress: vi.fn(() => ({ address: 'test.eth', type: 'ens' })),
        setCachedAddress: vi.fn(),
        onTipClick: vi.fn(),
        extractUsernameFromUrl: vi.fn(() => 'test')
      });
    });

    it('should clear state', async () => {
      mockGroveAPI.resolveDestination.mockResolvedValue({
        tippable: true,
        addresses: [{ address: 'test.eth', source: 'bio' }],
        error: null
      });

      mockAdapter = createMockAdapter();

      await context.ProfilePageHandler.initialize(mockAdapter);
      expect(context.ProfilePageHandler.getButton()).not.toBeNull();

      context.ProfilePageHandler.reset();

      expect(context.ProfilePageHandler.getButton()).toBeNull();
      expect(context.ProfilePageHandler.getResolvedAddress()).toBeNull();
    });
  });
});
