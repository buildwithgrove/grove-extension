import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let document;
let SubstackAdapter;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://olshansky.substack.com/p/an-incentive-to-label'
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
  loadBrowserScript('src/adapters/substack.js', context);

  SubstackAdapter = context.SubstackAdapter;
});

describe('SubstackAdapter', () => {
  describe('detectProfilePage', () => {
    it('should return true for post pages with /p/ in URL', () => {
      const adapter = new SubstackAdapter();
      expect(adapter.detectProfilePage()).toBe(true);
    });

    it('should return false for non-post pages', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://olshansky.substack.com/'
      });
      const newContext = {
        window: dom.window,
        document: dom.window.document,
        console: console,
        MutationObserver: dom.window.MutationObserver,
        URL: dom.window.URL,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
      };
      newContext.window = newContext;
      newContext.location = dom.window.location;

      loadBrowserScript('src/adapters/base.js', newContext);
      loadBrowserScript('src/adapters/substack.js', newContext);

      const adapter = new newContext.SubstackAdapter();
      expect(adapter.detectProfilePage()).toBe(false);
    });

    it('should return false for archive pages', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://olshansky.substack.com/archive'
      });
      const newContext = {
        window: dom.window,
        document: dom.window.document,
        console: console,
        MutationObserver: dom.window.MutationObserver,
        URL: dom.window.URL,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
      };
      newContext.window = newContext;
      newContext.location = dom.window.location;

      loadBrowserScript('src/adapters/base.js', newContext);
      loadBrowserScript('src/adapters/substack.js', newContext);

      const adapter = new newContext.SubstackAdapter();
      expect(adapter.detectProfilePage()).toBe(false);
    });
  });

  describe('extractDisplayName', () => {
    it('should extract name from byline with aria-label', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="byline-wrapper">
          <a href="https://substack.com/@olshansky" aria-label="View Daniel Olshansky's profile">
            <div title="Daniel Olshansky"></div>
          </a>
        </div>
      `;
      expect(adapter.extractDisplayName()).toBe('Daniel Olshansky');
    });

    it('should extract name from title attribute as fallback', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="byline-wrapper">
          <a href="https://substack.com/@vitalik">
            <div title="vitalik.eth"></div>
          </a>
        </div>
      `;
      expect(adapter.extractDisplayName()).toBe('vitalik.eth');
    });

    it('should fall back to author meta tag', () => {
      const adapter = new SubstackAdapter();
      document.head.innerHTML = `<meta name="author" content="Test Author">`;
      document.body.innerHTML = `<div></div>`;
      expect(adapter.extractDisplayName()).toBe('Test Author');
    });
  });

  describe('extractBio', () => {
    it('should return display name for address detection', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="byline-wrapper">
          <a href="https://substack.com/@vitalik" aria-label="View vitalik.eth's profile">
            <div title="vitalik.eth"></div>
          </a>
        </div>
      `;
      const bio = adapter.extractBio();
      expect(bio).toContain('vitalik.eth');
    });

    it('should return null if no author info found', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `<div></div>`;
      expect(adapter.extractBio()).toBeNull();
    });

    it('should extract bio from author_bio in preloads JSON', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <script>
          window._preloads = {"author_bio":"Testing bio with olshansky.eth address"};
        </script>
      `;
      const bio = adapter.extractBio();
      expect(bio).toContain('olshansky.eth');
    });
  });

  describe('getAuthorProfileUrl', () => {
    it('should return the author profile URL', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="byline-wrapper">
          <a href="https://substack.com/@olshansky" aria-label="View profile">
            Author
          </a>
        </div>
      `;
      expect(adapter.getAuthorProfileUrl()).toBe('https://substack.com/@olshansky');
    });

    it('should return null if no byline found', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `<div></div>`;
      expect(adapter.getAuthorProfileUrl()).toBeNull();
    });
  });

  describe('getPostUrl', () => {
    it('should return the current window location', () => {
      const adapter = new SubstackAdapter();
      expect(adapter.getPostUrl()).toBe('https://olshansky.substack.com/p/an-incentive-to-label');
    });
  });

  describe('getRestackButton', () => {
    it('should find the restack button with no-label class', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="post-ufi">
          <div class="pencraft pc-display-flex">
            <div class="like-button-container">
              <button class="post-ufi-button has-label" aria-label="Like this post"><svg></svg>Like</button>
            </div>
            <button class="post-ufi-button post-ufi-comment-button has-label" aria-label="View comments"><svg></svg>Comment</button>
            <button class="post-ufi-button no-label" aria-label="Restack"><svg><path d="restack-icon"></path></svg></button>
          </div>
        </div>
      `;
      const restackBtn = adapter.getRestackButton();
      expect(restackBtn).not.toBeNull();
      expect(restackBtn.classList.contains('no-label')).toBe(true);
    });

    it('should not return button inside edit-button-container', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="post-ufi">
          <div class="pencraft">
            <button class="post-ufi-button has-label">Like</button>
            <div class="edit-button-container">
              <button class="post-ufi-button no-label">Edit</button>
            </div>
          </div>
        </div>
      `;
      const restackBtn = adapter.getRestackButton();
      expect(restackBtn).toBeNull();
    });

    it('should return null if no post-ufi found', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `<div></div>`;
      expect(adapter.getRestackButton()).toBeNull();
    });
  });

  describe('getButtonPlacement', () => {
    it('should return the left button group', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="post-ufi">
          <div class="pencraft pc-display-flex pc-gap-8">
            <button class="post-ufi-button">Like</button>
          </div>
          <div class="pencraft pc-display-flex">
            <button class="post-ufi-button">Share</button>
          </div>
        </div>
      `;
      const placement = adapter.getButtonPlacement();
      expect(placement).not.toBeNull();
      expect(placement.classList.contains('pencraft')).toBe(true);
    });

    it('should return null if no action bar found', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `<div></div>`;
      expect(adapter.getButtonPlacement()).toBeNull();
    });
  });

  describe('getPlatformName', () => {
    it('should return "substack"', () => {
      const adapter = new SubstackAdapter();
      expect(adapter.getPlatformName()).toBe('substack');
    });
  });
});
