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
  describe('detectTippablePage', () => {
    it('should return true for post pages with /p/ in URL', () => {
      const adapter = new SubstackAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for bare domain reader view (/@user/p-digits)', () => {
      const ctx = createContext('https://substack.com/@timour/p-184358935');
      const adapter = new ctx.SubstackAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for bare domain home post view (/home/post/p-digits)', () => {
      const ctx = createContext('https://substack.com/home/post/p-184358935');
      const adapter = new ctx.SubstackAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for bare domain profile page (/@user)', () => {
      const ctx = createContext('https://substack.com/@timour');
      const adapter = new ctx.SubstackAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for subdomain profile page (root)', () => {
      const ctx = createContext('https://olshansky.substack.com/');
      const adapter = new ctx.SubstackAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for subdomain profile page (about)', () => {
      const ctx = createContext('https://olshansky.substack.com/about');
      const adapter = new ctx.SubstackAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for all subdomain pages', () => {
      const ctx = createContext('https://olshansky.substack.com/archive');
      const adapter = new ctx.SubstackAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
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

    it('should extract bio from preloads.profile.bio (bare domain profile)', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <script>
          window._preloads = {
            "profile": {
              "id": 123,
              "name": "Timour",
              "bio": "Building Edge City. timour.eth"
            }
          };
        </script>
      `;
      const bio = adapter.extractBio();
      expect(bio).toContain('timour.eth');
    });

    it('should extract bio from preloads.pub.author_bio (subdomain profile)', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <script>
          window._preloads = {
            "pub": {
              "id": 456,
              "author_bio": "olshansky.eth"
            }
          };
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
    it('should return the left button group on post page', () => {
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

    it('should return null if no action bar found and no profile button found', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `<div></div>`;
      expect(adapter.getButtonPlacement()).toBeNull();
    });

    it('should return navbar items container on subdomain profile page and insert after About', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="overflow-items">
          <div class="menu-item" id="home"><a href="/">Home</a></div>
          <div class="menu-item" id="about"><a href="/about">About</a></div>
          <div class="menu-item" id="other"><a href="/other">Other</a></div>
        </div>
      `;
      const placement = adapter.getButtonPlacement();
      expect(placement).not.toBeNull();
      expect(placement.classList.contains('grove-navbar-item')).toBe(true);
      expect(placement.classList.contains('menu-item')).toBe(false);
      
      const aboutItem = document.getElementById('about');
      expect(aboutItem.nextSibling).toBe(placement);
    });

    it('should return subscribe widget wrapper on subdomain profile page as fallback', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="subscribe-widget">
          <div class="button-wrapper">
            <button>Subscribe</button>
          </div>
        </div>
      `;
      const placement = adapter.getButtonPlacement();
      expect(placement).not.toBeNull();
      expect(placement.classList.contains('button-wrapper')).toBe(true);
    });

    it('should return subscribe button container on bare domain profile page', () => {
      const adapter = new SubstackAdapter();
      document.body.innerHTML = `
        <div class="profile-header">
          <button>Subscribe</button>
        </div>
      `;
      const placement = adapter.getButtonPlacement();
      expect(placement).not.toBeNull();
      expect(placement.classList.contains('profile-header')).toBe(true);
    });
  });

  describe('getPlatformName', () => {
    it('should return "substack"', () => {
      const adapter = new SubstackAdapter();
      expect(adapter.getPlatformName()).toBe('substack');
    });
  });
});