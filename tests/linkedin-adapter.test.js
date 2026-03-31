import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let document;
let LinkedInAdapter;
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
  loadBrowserScript('src/adapters/linkedin.js', context);

  LinkedInAdapter = context.LinkedInAdapter;
}

beforeEach(() => {
  setupContext('https://www.linkedin.com/in/artsabintsev/');
});

describe('LinkedInAdapter', () => {
  describe('detectTippablePage', () => {
    it('should return true for profile pages (/in/username)', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for profile pages without trailing slash', () => {
      setupContext('https://www.linkedin.com/in/artsabintsev');
      const adapter = new LinkedInAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for individual post pages', () => {
      setupContext('https://www.linkedin.com/feed/update/urn:li:activity:7444441564216614912/');
      const adapter = new LinkedInAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return false for the feed page', () => {
      setupContext('https://www.linkedin.com/feed/');
      const adapter = new LinkedInAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });

    it('should return false for the homepage', () => {
      setupContext('https://www.linkedin.com/');
      const adapter = new LinkedInAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });

    it('should return false for messaging', () => {
      setupContext('https://www.linkedin.com/messaging/');
      const adapter = new LinkedInAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });

    it('should return false for jobs', () => {
      setupContext('https://www.linkedin.com/jobs/');
      const adapter = new LinkedInAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });

    it('should return false for company pages', () => {
      setupContext('https://www.linkedin.com/company/grove-city/');
      const adapter = new LinkedInAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });

    it('should return false for search', () => {
      setupContext('https://www.linkedin.com/search/results/all/');
      const adapter = new LinkedInAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });
  });

  describe('isProfilePage', () => {
    it('should return true for /in/username', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.isProfilePage()).toBe(true);
    });

    it('should return false for feed', () => {
      setupContext('https://www.linkedin.com/feed/');
      const adapter = new LinkedInAdapter();
      expect(adapter.isProfilePage()).toBe(false);
    });
  });

  describe('isPostPage', () => {
    it('should return true for /feed/update/ URLs', () => {
      setupContext('https://www.linkedin.com/feed/update/urn:li:activity:7444441564216614912/');
      const adapter = new LinkedInAdapter();
      expect(adapter.isPostPage()).toBe(true);
    });

    it('should return false for regular feed', () => {
      setupContext('https://www.linkedin.com/feed/');
      const adapter = new LinkedInAdapter();
      expect(adapter.isPostPage()).toBe(false);
    });
  });

  describe('isFeedPage', () => {
    it('should return true for /feed/', () => {
      setupContext('https://www.linkedin.com/feed/');
      const adapter = new LinkedInAdapter();
      expect(adapter.isFeedPage()).toBe(true);
    });

    it('should return true for /feed (no trailing slash)', () => {
      setupContext('https://www.linkedin.com/feed');
      const adapter = new LinkedInAdapter();
      expect(adapter.isFeedPage()).toBe(true);
    });

    it('should return true for homepage /', () => {
      setupContext('https://www.linkedin.com/');
      const adapter = new LinkedInAdapter();
      expect(adapter.isFeedPage()).toBe(true);
    });

    it('should return false for profile pages', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.isFeedPage()).toBe(false);
    });
  });

  describe('extractDisplayName', () => {
    it('should extract name from h1.text-heading-xlarge', () => {
      const h1 = document.createElement('h1');
      h1.className = 'text-heading-xlarge';
      h1.textContent = 'Arthur Sabintsev';
      document.body.appendChild(h1);

      const adapter = new LinkedInAdapter();
      expect(adapter.extractDisplayName()).toBe('Arthur Sabintsev');
    });

    it('should return null when no name element found', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.extractDisplayName()).toBeNull();
    });
  });

  describe('extractBio', () => {
    it('should combine display name and headline', () => {
      const h1 = document.createElement('h1');
      h1.className = 'text-heading-xlarge';
      h1.textContent = 'Arthur Sabintsev';
      document.body.appendChild(h1);

      const headline = document.createElement('div');
      headline.className = 'text-body-medium break-words';
      headline.textContent = 'CEO at Grove | Getting content creators paid';
      document.body.appendChild(headline);

      const adapter = new LinkedInAdapter();
      const bio = adapter.extractBio();
      expect(bio).toContain('Arthur Sabintsev');
      expect(bio).toContain('CEO at Grove');
    });

    it('should return null when nothing found', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.extractBio()).toBeNull();
    });
  });

  describe('getButtonPlacement', () => {
    it('should find pvs-profile-actions container', () => {
      const container = document.createElement('div');
      container.className = 'pvs-profile-actions';
      document.body.appendChild(container);

      const adapter = new LinkedInAdapter();
      expect(adapter.getButtonPlacement()).toBe(container);
    });

    it('should return null when no placement found', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.getButtonPlacement()).toBeNull();
    });
  });

  describe('getPlatformName', () => {
    it('should return linkedin', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.getPlatformName()).toBe('linkedin');
    });
  });

  describe('extractUsernameFromUrl', () => {
    it('should extract username from /in/username', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.extractUsernameFromUrl('https://www.linkedin.com/in/artsabintsev')).toBe('artsabintsev');
    });

    it('should extract username with trailing slash', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.extractUsernameFromUrl('https://www.linkedin.com/in/artsabintsev/')).toBe('artsabintsev');
    });

    it('should handle usernames with hyphens', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.extractUsernameFromUrl('https://www.linkedin.com/in/john-doe-123')).toBe('john-doe-123');
    });

    it('should return null for non-profile URLs', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.extractUsernameFromUrl('https://www.linkedin.com/feed/')).toBeNull();
    });

    it('should return null for company URLs', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.extractUsernameFromUrl('https://www.linkedin.com/company/grove')).toBeNull();
    });
  });

  describe('getProfileUrl', () => {
    it('should build correct profile URL', () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.getProfileUrl('artsabintsev')).toBe('https://www.linkedin.com/in/artsabintsev');
    });
  });
});
