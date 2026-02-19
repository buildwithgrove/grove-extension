import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let document;
let YouTubeAdapter;
let context;

function setupContext(url) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url });
  document = dom.window.document;

  context = {
    window: dom.window,
    document: document,
    console: console,
    MutationObserver: dom.window.MutationObserver,
    URL: dom.window.URL,
    NodeList: dom.window.NodeList,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  context.window = context;
  context.location = dom.window.location;

  loadBrowserScript('src/adapters/base.js', context);
  loadBrowserScript('src/adapters/youtube.js', context);

  YouTubeAdapter = context.YouTubeAdapter;
}

beforeEach(() => {
  setupContext('https://www.youtube.com/@MrBeast');
});

describe('YouTubeAdapter', () => {
  describe('detectTippablePage', () => {
    it('should return true for channel handle pages (/@username)', () => {
      const adapter = new YouTubeAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for /channel/ID pages', () => {
      setupContext('https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA');
      const adapter = new YouTubeAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for /c/customname pages', () => {
      setupContext('https://www.youtube.com/c/MrBeast6000');
      const adapter = new YouTubeAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for video pages (/watch?v=...)', () => {
      setupContext('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      const adapter = new YouTubeAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for shorts pages', () => {
      setupContext('https://www.youtube.com/shorts/abc123');
      const adapter = new YouTubeAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return false for the homepage', () => {
      setupContext('https://www.youtube.com/');
      const adapter = new YouTubeAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });

    it('should return false for feed pages', () => {
      setupContext('https://www.youtube.com/feed/subscriptions');
      const adapter = new YouTubeAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });

    it('should return false for search results', () => {
      setupContext('https://www.youtube.com/results?search_query=test');
      const adapter = new YouTubeAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });

    it('should return false for playlist pages', () => {
      setupContext('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
      const adapter = new YouTubeAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });

    it('should return false for trending pages', () => {
      setupContext('https://www.youtube.com/trending');
      const adapter = new YouTubeAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });
  });

  describe('extractDisplayName', () => {
    it('should extract channel name from ytd-channel-name', () => {
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = `
        <ytd-channel-name>
          <div id="text">MrBeast</div>
        </ytd-channel-name>
      `;
      expect(adapter.extractDisplayName()).toBe('MrBeast');
    });

    it('should extract channel name from video owner section', () => {
      setupContext('https://www.youtube.com/watch?v=test123');
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = `
        <div id="owner">
          <div id="channel-name">
            <div id="text"><a href="/@vitalik">vitalik.eth</a></div>
          </div>
        </div>
      `;
      expect(adapter.extractDisplayName()).toBe('vitalik.eth');
    });

    it('should fall back to og:title meta tag', () => {
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = '';
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:title');
      meta.setAttribute('content', 'Test Channel');
      document.head.appendChild(meta);
      expect(adapter.extractDisplayName()).toBe('Test Channel');
    });

    it('should return null when no name found', () => {
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = '<div></div>';
      expect(adapter.extractDisplayName()).toBeNull();
    });
  });

  describe('extractBio', () => {
    it('should combine channel name and description on channel pages', () => {
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = `
        <ytd-channel-name>
          <div id="text">vitalik.eth</div>
        </ytd-channel-name>
        <div id="description-container">Ethereum co-founder 0x1234567890abcdef1234567890abcdef12345678</div>
      `;
      const bio = adapter.extractBio();
      expect(bio).toContain('vitalik.eth');
      expect(bio).toContain('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should extract video description on watch pages', () => {
      setupContext('https://www.youtube.com/watch?v=test123');
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = `
        <div id="owner">
          <div id="channel-name">
            <div id="text"><a href="/@creator">Creator</a></div>
          </div>
        </div>
        <div id="description">
          <yt-formatted-string>Check out my ENS: creator.eth</yt-formatted-string>
        </div>
      `;
      const bio = adapter.extractBio();
      expect(bio).toContain('Creator');
      expect(bio).toContain('creator.eth');
    });

    it('should fall back to meta description', () => {
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = `
        <ytd-channel-name>
          <div id="text">SomeChannel</div>
        </ytd-channel-name>
      `;
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      meta.setAttribute('content', 'Check out channel.eth');
      document.head.appendChild(meta);

      const bio = adapter.extractBio();
      expect(bio).toContain('SomeChannel');
      expect(bio).toContain('channel.eth');
    });

    it('should return null when nothing found', () => {
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = '<div></div>';
      expect(adapter.extractBio()).toBeNull();
    });
  });

  describe('getButtonPlacement', () => {
    it('should return subscribe button on channel pages', () => {
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = `
        <div id="inner-header-container">
          <div id="subscribe-button">
            <button>Subscribe</button>
          </div>
        </div>
      `;
      const placement = adapter.getButtonPlacement();
      expect(placement).not.toBeNull();
      expect(placement.id).toBe('subscribe-button');
    });

    it('should return ytd-subscribe-button-renderer on new channel layout', () => {
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = `
        <ytd-subscribe-button-renderer>
          <button>Subscribe</button>
        </ytd-subscribe-button-renderer>
      `;
      const placement = adapter.getButtonPlacement();
      expect(placement).not.toBeNull();
      expect(placement.tagName.toLowerCase()).toBe('ytd-subscribe-button-renderer');
    });

    it('should return owner subscribe button on video pages', () => {
      setupContext('https://www.youtube.com/watch?v=test123');
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = `
        <div id="owner">
          <div id="subscribe-button">
            <button>Subscribe</button>
          </div>
        </div>
      `;
      const placement = adapter.getButtonPlacement();
      expect(placement).not.toBeNull();
      expect(placement.id).toBe('subscribe-button');
    });

    it('should return null when no placement found', () => {
      setupContext('https://www.youtube.com/feed/subscriptions');
      const adapter = new YouTubeAdapter();
      document.body.innerHTML = '<div></div>';
      expect(adapter.getButtonPlacement()).toBeNull();
    });
  });

  describe('extractUsernameFromUrl', () => {
    it('should extract handle from /@username URL', () => {
      const adapter = new YouTubeAdapter();
      expect(adapter.extractUsernameFromUrl('https://youtube.com/@MrBeast')).toBe('MrBeast');
    });

    it('should extract handle from www.youtube.com/@username URL', () => {
      const adapter = new YouTubeAdapter();
      expect(adapter.extractUsernameFromUrl('https://www.youtube.com/@vitalik')).toBe('vitalik');
    });

    it('should handle trailing slash', () => {
      const adapter = new YouTubeAdapter();
      expect(adapter.extractUsernameFromUrl('https://youtube.com/@MrBeast/')).toBe('MrBeast');
    });

    it('should handle subpaths after handle', () => {
      const adapter = new YouTubeAdapter();
      expect(adapter.extractUsernameFromUrl('https://youtube.com/@MrBeast/videos')).toBe('MrBeast');
    });

    it('should return null for non-handle URLs', () => {
      const adapter = new YouTubeAdapter();
      expect(adapter.extractUsernameFromUrl('https://youtube.com/watch?v=abc')).toBeNull();
    });

    it('should return null for channel ID URLs', () => {
      const adapter = new YouTubeAdapter();
      expect(adapter.extractUsernameFromUrl('https://youtube.com/channel/UCX6OQ3D')).toBeNull();
    });
  });

  describe('getProfileUrl', () => {
    it('should return correct YouTube profile URL', () => {
      const adapter = new YouTubeAdapter();
      expect(adapter.getProfileUrl('MrBeast')).toBe('https://youtube.com/@MrBeast');
    });
  });

  describe('getPlatformName', () => {
    it('should return youtube', () => {
      const adapter = new YouTubeAdapter();
      expect(adapter.getPlatformName()).toBe('youtube');
    });
  });
});
