import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let normalizeSocialUrl;
let socialDisplayLabel;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');

  context = {
    window: dom.window,
    document: dom.window.document,
    console: console,
    chrome: { storage: { local: { get: () => Promise.resolve({}) } } },
    URL: URL,
  };
  context.window = context;

  loadBrowserScript('src/utils/socialUtils.js', context);

  normalizeSocialUrl = context.normalizeSocialUrl;
  socialDisplayLabel = context.socialDisplayLabel;
});

describe('normalizeSocialUrl', () => {
  describe('full URL passthrough', () => {
    it('should return https URLs as-is', () => {
      expect(normalizeSocialUrl('x', 'https://x.com/olshansky')).toBe('https://x.com/olshansky');
    });

    it('should return http URLs as-is', () => {
      expect(normalizeSocialUrl('website', 'http://example.com')).toBe('http://example.com');
    });
  });

  describe('@ prefix stripping', () => {
    it('should strip @ prefix for X', () => {
      expect(normalizeSocialUrl('x', '@olshansky')).toBe('https://x.com/olshansky');
    });

    it('should strip @ prefix for YouTube', () => {
      expect(normalizeSocialUrl('youtube', '@channel')).toBe('https://youtube.com/@channel');
    });
  });

  describe('empty input', () => {
    it('should return empty string for empty input', () => {
      expect(normalizeSocialUrl('x', '')).toBe('');
    });

    it('should return @ for just @ input', () => {
      expect(normalizeSocialUrl('x', '@')).toBe('@');
    });
  });

  describe('platform-specific normalization', () => {
    it('should normalize X handle', () => {
      expect(normalizeSocialUrl('x', 'olshansky')).toBe('https://x.com/olshansky');
    });

    it('should normalize GitHub handle', () => {
      expect(normalizeSocialUrl('github', 'olshansky')).toBe('https://github.com/olshansky');
    });

    it('should normalize YouTube with @ prefix', () => {
      expect(normalizeSocialUrl('youtube', 'channel')).toBe('https://youtube.com/@channel');
    });

    it('should normalize Substack bare name to subdomain', () => {
      expect(normalizeSocialUrl('substack', 'olshansky')).toBe('https://olshansky.substack.com');
    });

    it('should normalize Substack with dot as custom domain', () => {
      expect(normalizeSocialUrl('substack', 'olshansky.com')).toBe('https://olshansky.com');
    });

    it('should normalize Instagram handle', () => {
      expect(normalizeSocialUrl('instagram', 'user123')).toBe('https://instagram.com/user123');
    });

    it('should normalize LinkedIn bare username to /in/ path', () => {
      expect(normalizeSocialUrl('linkedin', 'johndoe')).toBe('https://linkedin.com/in/johndoe');
    });

    it('should normalize LinkedIn with in/ prefix', () => {
      expect(normalizeSocialUrl('linkedin', 'in/johndoe')).toBe('https://linkedin.com/in/johndoe');
    });

    it('should normalize Medium with @ prefix', () => {
      expect(normalizeSocialUrl('medium', 'writer')).toBe('https://medium.com/@writer');
    });

    it('should normalize Reddit bare username to /u/ path', () => {
      expect(normalizeSocialUrl('reddit', 'redditor')).toBe('https://reddit.com/u/redditor');
    });

    it('should normalize Reddit with u/ prefix', () => {
      expect(normalizeSocialUrl('reddit', 'u/redditor')).toBe('https://reddit.com/u/redditor');
    });

    it('should normalize SoundCloud handle', () => {
      expect(normalizeSocialUrl('soundcloud', 'artist')).toBe('https://soundcloud.com/artist');
    });

    it('should normalize TikTok with @ prefix', () => {
      expect(normalizeSocialUrl('tiktok', 'creator')).toBe('https://tiktok.com/@creator');
    });

    it('should normalize Telegram handle', () => {
      expect(normalizeSocialUrl('telegram', 'user')).toBe('https://t.me/user');
    });

    it('should return Discord handle as-is (no normalization)', () => {
      expect(normalizeSocialUrl('discord', 'myname')).toBe('myname');
    });

    it('should pass through Discord URL starting with http', () => {
      expect(normalizeSocialUrl('discord', 'https://discord.gg/invite')).toBe('https://discord.gg/invite');
    });

    it('should normalize website with dot to https', () => {
      expect(normalizeSocialUrl('website', 'example.com')).toBe('https://example.com');
    });

    it('should return website without dot as-is', () => {
      expect(normalizeSocialUrl('website', 'localhost')).toBe('localhost');
    });
  });

  describe('unknown platform', () => {
    it('should return trimmed input for unknown platform', () => {
      expect(normalizeSocialUrl('foobar', '  handle  ')).toBe('handle');
    });
  });

  describe('whitespace handling', () => {
    it('should trim whitespace from input', () => {
      expect(normalizeSocialUrl('x', '  olshansky  ')).toBe('https://x.com/olshansky');
    });
  });
});

describe('socialDisplayLabel', () => {
  it('should extract X username from URL', () => {
    expect(socialDisplayLabel('x', 'https://x.com/olshansky')).toBe('olshansky');
  });

  it('should strip @ prefix from path', () => {
    expect(socialDisplayLabel('youtube', 'https://youtube.com/@channel')).toBe('channel');
  });

  it('should strip in/ prefix for LinkedIn', () => {
    expect(socialDisplayLabel('linkedin', 'https://linkedin.com/in/johndoe')).toBe('johndoe');
  });

  it('should strip u/ prefix for Reddit', () => {
    expect(socialDisplayLabel('reddit', 'https://reddit.com/u/redditor')).toBe('redditor');
  });

  it('should return hostname for website platform', () => {
    expect(socialDisplayLabel('website', 'https://example.com/page')).toBe('example.com');
  });

  it('should handle malformed URL by stripping protocol', () => {
    expect(socialDisplayLabel('x', 'not-a-url')).toBe('not-a-url');
  });

  it('should strip @ from non-URL input', () => {
    expect(socialDisplayLabel('x', '@olshansky')).toBe('olshansky');
  });

  it('should fall back to URL stripping for non-URL input', () => {
    expect(socialDisplayLabel('x', 'https://example')).toBe('example');
  });

  it('should handle empty path by falling back', () => {
    expect(socialDisplayLabel('x', 'https://x.com/')).toBe('x.com/');
  });
});
