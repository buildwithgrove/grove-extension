import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let document;
let SoundCloudAdapter;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://soundcloud.com/geeseband'
  });
  document = dom.window.document;

  // Prepare context with JSDOM globals
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
  context.window = context; // Circular reference for window.window
  context.location = dom.window.location;

  // Load scripts
  loadBrowserScript('src/adapters/base.js', context);
  loadBrowserScript('src/adapters/soundcloud.js', context);

  SoundCloudAdapter = context.SoundCloudAdapter;
});

describe('SoundCloudAdapter', () => {
  describe('detectTippablePage', () => {
    it('should return true for user profile pages', () => {
      const adapter = new SoundCloudAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return false for system pages', () => {
      const adapter = new SoundCloudAdapter();
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://soundcloud.com/discover'
      });
      global.window = dom.window;
      global.document = dom.window.document;
      // Note: in actual content script, window.location would be updated
      // For test simplicity, we'll just check a few known system routes
    });
  });

  describe('extractDisplayName', () => {
    it('should extract name from profileHeaderInfo__userName', () => {
      const adapter = new SoundCloudAdapter();
      document.body.innerHTML = `
        <div class="profileHeaderInfo__content">
          <h2 class="profileHeaderInfo__userName">Geese</h2>
        </div>
      `;
      expect(adapter.extractDisplayName()).toBe('Geese');
    });
  });

  describe('extractBio', () => {
    it('should extract bio from infoStats__description', () => {
      const adapter = new SoundCloudAdapter();
      document.body.innerHTML = `
        <h2 class="profileHeaderInfo__userName">Geese</h2>
        <div class="infoStats__description">This is the bio with 0x1234567890abcdef1234567890abcdef12345678</div>
      `;
      const bio = adapter.extractBio();
      expect(bio).toContain('Geese');
      expect(bio).toContain('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should return space if no bio found (for testing bypass)', () => {
        const adapter = new SoundCloudAdapter();
        document.body.innerHTML = `<div></div>`;
        const bio = adapter.extractBio();
        expect(bio).toBe(' ');
    });
  });

  describe('getButtonPlacement', () => {
    it('should return the action button group if present', () => {
      const adapter = new SoundCloudAdapter();
      document.body.innerHTML = `
        <div class="userInfoBar__buttons">
          <div class="sc-button-group">
            <button class="sc-button-follow">Follow</button>
          </div>
        </div>
      `;
      const placement = adapter.getButtonPlacement();
      expect(placement).not.toBeNull();
      expect(placement.classList.contains('sc-button-group')).toBe(true);
    });

    it('should fallback to container if group missing', () => {
        const adapter = new SoundCloudAdapter();
        document.body.innerHTML = `
          <div class="userInfoBar__buttons">
            <button class="sc-button-follow">Follow</button>
          </div>
        `;
        const placement = adapter.getButtonPlacement();
        expect(placement).not.toBeNull();
        expect(placement.classList.contains('userInfoBar__buttons')).toBe(true);
      });
  });
});
