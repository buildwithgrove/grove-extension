import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let document;
let SubstackAdapter;
let context;

function createContext(url) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url });
  const ctx = {
    window: dom.window,
    document: dom.window.document,
    console: console,
    MutationObserver: dom.window.MutationObserver,
    URL: dom.window.URL,
    NodeList: dom.window.NodeList,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  ctx.window = ctx;
  ctx.location = dom.window.location;
  loadBrowserScript('src/adapters/base.js', ctx);
  loadBrowserScript('src/adapters/substack.js', ctx);
  return ctx;
}

beforeEach(() => {
  context = createContext('https://olshansky.substack.com/p/an-incentive-to-label');
  document = context.document;
  SubstackAdapter = context.SubstackAdapter;
});

describe('SubstackAdapter', () => {
  describe('detectProfilePage', () => {
    it('should return true for post pages with /p/ in URL', () => {
      const adapter = new SubstackAdapter();
      expect(adapter.detectProfilePage()).toBe(true);
    });

    it('should return true for bare domain reader view (/@user/p-digits)', () => {
      const ctx = createContext('https://substack.com/@timour/p-184358935');
      const adapter = new ctx.SubstackAdapter();
      expect(adapter.detectProfilePage()).toBe(true);
    });

    it('should return true for bare domain home post view (/home/post/p-digits)', () => {
      const ctx = createContext('https://substack.com/home/post/p-184358935');
      const adapter = new ctx.SubstackAdapter();
      expect(adapter.detectProfilePage()).toBe(true);
    });

    it('should return false for non-post pages', () => {
      const ctx = createContext('https://olshansky.substack.com/');
      const adapter = new ctx.SubstackAdapter();
      expect(adapter.detectProfilePage()).toBe(false);
    });

    it('should return false for archive pages', () => {
      const ctx = createContext('https://olshansky.substack.com/archive');
      const adapter = new ctx.SubstackAdapter();
      expect(adapter.detectProfilePage()).toBe(false);
    });

    it('should return false for bare domain profile page (/@user)', () => {
      const ctx = createContext('https://substack.com/@timour');
      const adapter = new ctx.SubstackAdapter();
      expect(adapter.detectProfilePage()).toBe(false);
    });

    it('should return false for bare domain posts list (/@user/posts)', () => {
      const ctx = createContext('https://substack.com/@timour/posts');
      const adapter = new ctx.SubstackAdapter();
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

  describe('reader view (bare domain)', () => {
    it('should find restack button via aria-label when no .post-ufi exists', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="pencraft pc-display-flex pc-gap-8">
          <button aria-label="Like"><svg></svg>16</button>
          <button aria-label="Comment"><svg></svg>3</button>
          <button aria-label="Restack"><svg></svg></button>
        </div>
      `;
      const restackBtn = adapter.getRestackButton();
      expect(restackBtn).not.toBeNull();
      expect(restackBtn.getAttribute('aria-label')).toBe('Restack');
    });

    it('should find action bars via Restack buttons when no .post-ufi exists', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="pencraft pc-display-flex pc-gap-8" id="bar1">
          <button aria-label="Like"><svg></svg></button>
          <button aria-label="Restack"><svg></svg></button>
        </div>
        <div class="pencraft pc-display-flex pc-gap-8" id="bar2">
          <button aria-label="Like"><svg></svg></button>
          <button aria-label="Restack"><svg></svg></button>
        </div>
      `;
      const bars = adapter.getAllActionBars();
      expect(bars.length).toBe(2);
      expect(bars[0].id).toBe('bar1');
      expect(bars[1].id).toBe('bar2');
    });

    it('should return action bar as button placement when no inner div.pencraft', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div id="action-bar">
          <button aria-label="Like"><svg></svg></button>
          <button aria-label="Restack"><svg></svg></button>
        </div>
      `;
      const bars = adapter.getAllActionBars();
      expect(bars.length).toBe(1);
      const placement = adapter.getButtonPlacementInActionBar(bars[0]);
      expect(placement).not.toBeNull();
      expect(placement.id).toBe('action-bar');
    });

    it('should prefer .post-ufi when both DOM structures exist', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="post-ufi" id="ufi">
          <div class="pencraft">
            <button class="post-ufi-button" aria-label="Restack"><svg></svg></button>
          </div>
        </div>
        <div id="reader-bar">
          <button aria-label="Restack"><svg></svg></button>
        </div>
      `;
      const bars = adapter.getAllActionBars();
      expect(bars.length).toBe(1);
      expect(bars[0].id).toBe('ufi');
    });
  });

  describe('getPlatformName', () => {
    it('should return "substack"', () => {
      const adapter = new SubstackAdapter();
      expect(adapter.getPlatformName()).toBe('substack');
    });
  });
});
