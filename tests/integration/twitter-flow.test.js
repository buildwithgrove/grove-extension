import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from '../helpers/load-script.js';
import fs from 'fs';
import path from 'path';

let context;

function createContext(url = 'https://x.com/olshansky') {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="placement"></div></body></html>', { url });

  const ctx = {
    window: dom.window,
    document: dom.window.document,
    console: console,
    location: dom.window.location,
    URL: dom.window.URL,
    MutationObserver: dom.window.MutationObserver,
    Node: dom.window.Node,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    getComputedStyle: vi.fn(() => ({ backgroundColor: 'rgb(255, 255, 255)' })),
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    chrome: {
      runtime: { id: 'test-extension-id' },
      storage: {
        local: {
          get: vi.fn((keys, cb) => cb({})),
          set: vi.fn((data, cb) => cb && cb())
        }
      }
    },
    // Mock classes/objects that are normally global
    GROVE_COLORS: { primary: '#389f58', shadow: 'rgba(56, 159, 88, 0.3)' },
    STORAGE_KEYS: {
      JWT_PRODUCTION: 'grove_jwt_production',
      ENVIRONMENT: 'grove_environment',
      ENDPOINT: 'grove_endpoint'
    },
    AddressCache: class {
      constructor() { this.cache = new Map(); }
      get(k) { return this.cache.get(k); }
      set(k, v) { this.cache.set(k, { data: v, timestamp: Date.now() }); }
    },
    AddressParser: {
      hasAddresses: vi.fn(() => true),
      resolveAddress: vi.fn(() => ({ address: '0x123', type: 'address' }))
    },
    GroveAPI: {
      resolveDestination: vi.fn(() => Promise.resolve({ tippable: true, addresses: [{ address: '0x123', source: 'api' }] })),
      sendTip: vi.fn(() => Promise.resolve({ success: true }))
    }
  };
  ctx.window = ctx;

  // Load scripts in order
  loadBrowserScript('src/adapters/base.js', ctx);
  loadBrowserScript('src/adapters/twitter.js', ctx);
  loadBrowserScript('src/ui/button.js', ctx);
  loadBrowserScript('src/content/profilePageHandler.js', ctx);
  loadBrowserScript('src/content/tweetTipHandler.js', ctx);
  loadBrowserScript('src/content/tweetProcessor.js', ctx);

  return ctx;
}

describe('Twitter Integration Flow', () => {
  it('should initialize and cache address on profile page', async () => {
    const ctx = createContext('https://x.com/olshansky');
    
    // Setup DOM for profile
    ctx.document.body.innerHTML = `
      <div data-testid="UserName"><span><span>Olshansky</span></span></div>
      <div data-testid="userActions"></div>
    `;

    const adapter = new ctx.TwitterAdapter();
    
    // Initialize ProfilePageHandler
    ctx.ProfilePageHandler.init({
      hasAddresses: ctx.AddressParser.hasAddresses,
      resolveAddress: ctx.AddressParser.resolveAddress,
      setCachedAddress: vi.fn(),
      onTipClick: vi.fn(),
      extractUsernameFromUrl: (url) => 'olshansky'
    });

    const result = await ctx.ProfilePageHandler.initialize(adapter);

    expect(ctx.GroveAPI.resolveDestination).toHaveBeenCalledWith('https://x.com/olshansky');
    expect(result).not.toBeNull();
    expect(result.address).toBe('0x123');
    
    // Verify button was injected
    const button = ctx.document.getElementById('grove-tip-button');
    expect(button).not.toBeNull();
  });

  it('should initialize and cache address on tweet page', async () => {
    const ctx = createContext('https://x.com/olshansky/status/123');
    
    // Setup DOM for tweet page
    ctx.document.body.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="Tweet-User-Avatar"><a href="/olshansky"></a></div>
        <div data-testid="User-Name"><a href="/olshansky"><span><span>Olshansky</span></span></a></div>
        <a href="/olshansky/status/123"><time datetime="2023-01-01T00:00:00.000Z"></time></a>
      </article>
    `;

    const adapter = new ctx.TwitterAdapter();
    
    // Mock the cache
    const cache = new Map();
    ctx.ProfilePageHandler.init({
      hasAddresses: ctx.AddressParser.hasAddresses,
      resolveAddress: ctx.AddressParser.resolveAddress,
      setCachedAddress: (k, v) => cache.set(k, v),
      onTipClick: vi.fn(),
      extractUsernameFromUrl: (url) => 'olshansky'
    });

    // Initialize ProfilePageHandler (should cache via API)
    await ctx.ProfilePageHandler.initialize(adapter);

    expect(ctx.GroveAPI.resolveDestination).toHaveBeenCalledWith('https://x.com/olshansky/status/123');
    expect(cache.get('olshansky')).toEqual(expect.objectContaining({ address: '0x123' }));

    // Now test TweetProcessor uses the cache
    ctx.TweetProcessor.init({
      getAdapter: () => adapter,
      getCachedAddress: (k) => cache.get(k),
      setCachedAddress: (k, v) => cache.set(k, v),
      hasAddresses: ctx.AddressParser.hasAddresses,
      resolveAddress: ctx.AddressParser.resolveAddress,
      injectTipButton: vi.fn(),
      queueBioFetch: vi.fn()
    });

    ctx.TweetProcessor.processExistingTweets();

    // Verify TweetTipHandler.injectButton was called
    expect(ctx.TweetProcessor.callbacks.injectTipButton).toHaveBeenCalled();
  });
});
