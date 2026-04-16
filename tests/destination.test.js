import { describe, it, expect } from 'vitest';
import { loadBrowserScript } from './helpers/load-script.js';

const { parseDestination } = loadBrowserScript('src/parsers/destination.js');

describe('parseDestination', () => {
  describe('null/empty input', () => {
    it('should return nulls for null input', () => {
      expect(parseDestination(null)).toEqual({
        profileUrl: null,
        postUrl: null,
        profileHandle: null
      });
    });

    it('should return nulls for empty string', () => {
      expect(parseDestination('')).toEqual({
        profileUrl: null,
        postUrl: null,
        profileHandle: null
      });
    });
  });

  describe('Base names (.base.eth)', () => {
    it('should parse simple base names', () => {
      const result = parseDestination('jesse.base.eth');
      expect(result).toEqual({
        profileUrl: 'https://www.base.org/name/jesse',
        postUrl: null,
        profileHandle: 'jesse.base.eth'
      });
    });

    it('should URL-encode special characters in base names', () => {
      const result = parseDestination('$$$$$.base.eth');
      expect(result).toEqual({
        profileUrl: 'https://www.base.org/name/%24%24%24%24%24',
        postUrl: null,
        profileHandle: '$$$$$.base.eth'
      });
    });

    it('should URL-encode emoji in base names', () => {
      const result = parseDestination('🔥.base.eth');
      expect(result.profileUrl).toBe('https://www.base.org/name/%F0%9F%94%A5');
      expect(result.profileHandle).toBe('🔥.base.eth');
    });

    it('should URL-encode unicode characters', () => {
      const result = parseDestination('café.base.eth');
      expect(result.profileUrl).toBe('https://www.base.org/name/caf%C3%A9');
      expect(result.profileHandle).toBe('café.base.eth');
    });
  });

  describe('ENS names (.eth)', () => {
    it('should parse simple ENS names', () => {
      const result = parseDestination('vitalik.eth');
      expect(result).toEqual({
        profileUrl: 'https://app.ens.domains/vitalik.eth',
        postUrl: null,
        profileHandle: 'vitalik.eth'
      });
    });

    it('should URL-encode special characters in ENS names', () => {
      const result = parseDestination('$money.eth');
      expect(result).toEqual({
        profileUrl: 'https://app.ens.domains/%24money.eth',
        postUrl: null,
        profileHandle: '$money.eth'
      });
    });

    it('should not match .base.eth as plain .eth', () => {
      const result = parseDestination('name.base.eth');
      // Should be handled by base.eth branch, not plain .eth
      expect(result.profileUrl).toContain('base.org');
    });
  });

  describe('Twitter/X status URLs', () => {
    it('should parse x.com status URLs', () => {
      const result = parseDestination('x.com/username/status/123456789');
      expect(result).toEqual({
        profileUrl: 'https://x.com/username',
        postUrl: 'https://x.com/username/status/123456789',
        profileHandle: '@username'
      });
    });

    it('should parse twitter.com status URLs', () => {
      const result = parseDestination('twitter.com/someuser/status/987654321');
      expect(result).toEqual({
        profileUrl: 'https://twitter.com/someuser',
        postUrl: 'https://twitter.com/someuser/status/987654321',
        profileHandle: '@someuser'
      });
    });

    it('should handle full https URLs', () => {
      const result = parseDestination('https://x.com/user/status/111');
      expect(result.postUrl).toBe('https://x.com/user/status/111');
    });

    it('should be case-insensitive for domain', () => {
      const result = parseDestination('X.COM/user/status/123');
      expect(result.profileHandle).toBe('@user');
    });
  });

  describe('Twitter/X profile URLs', () => {
    it('should parse x.com profile URLs', () => {
      const result = parseDestination('x.com/username');
      expect(result).toEqual({
        profileUrl: 'https://x.com/username',
        postUrl: null,
        profileHandle: '@username'
      });
    });

    it('should parse profile URLs with trailing slash', () => {
      const result = parseDestination('x.com/username/');
      expect(result).toEqual({
        profileUrl: 'https://x.com/username/',
        postUrl: null,
        profileHandle: '@username'
      });
    });

    it('should parse twitter.com profile URLs', () => {
      const result = parseDestination('twitter.com/someuser');
      expect(result).toEqual({
        profileUrl: 'https://twitter.com/someuser',
        postUrl: null,
        profileHandle: '@someuser'
      });
    });
  });

  describe('YouTube URLs', () => {
    it('should parse @handle profile', () => {
      const result = parseDestination('https://youtube.com/@mkbhd');
      expect(result).toEqual({ profileUrl: 'https://youtube.com/@mkbhd', postUrl: null, profileHandle: '@mkbhd' });
    });

    it('should parse /c/name channel', () => {
      const result = parseDestination('https://youtube.com/c/LinusTechTips');
      expect(result).toEqual({ profileUrl: 'https://youtube.com/c/LinusTechTips', postUrl: null, profileHandle: 'LinusTechTips' });
    });

    it('should parse watch URL as postUrl', () => {
      const result = parseDestination('https://youtube.com/watch?v=abc123');
      expect(result).toEqual({ profileUrl: null, postUrl: 'https://youtube.com/watch?v=abc123', profileHandle: null });
    });
  });

  describe('Substack URLs', () => {
    it('should parse substack.com/@author profile', () => {
      const result = parseDestination('https://substack.com/@casey');
      expect(result).toEqual({ profileUrl: 'https://substack.com/@casey', postUrl: null, profileHandle: '@casey' });
    });

    it('should parse author.substack.com profile', () => {
      const result = parseDestination('casey.substack.com');
      expect(result.profileUrl).toBe('https://casey.substack.com');
      expect(result.profileHandle).toBe('casey');
      expect(result.postUrl).toBeNull();
    });

    it('should parse author.substack.com/p/slug as post', () => {
      const result = parseDestination('casey.substack.com/p/my-post');
      expect(result.profileUrl).toBe('https://casey.substack.com');
      expect(result.postUrl).toBe('https://casey.substack.com/p/my-post');
    });
  });

  describe('SoundCloud URLs', () => {
    it('should parse soundcloud.com/artist', () => {
      const result = parseDestination('https://soundcloud.com/deadmau5');
      expect(result).toEqual({ profileUrl: 'https://soundcloud.com/deadmau5', postUrl: null, profileHandle: 'deadmau5' });
    });

    it('should not parse reserved paths', () => {
      const result = parseDestination('https://soundcloud.com/stream');
      expect(result.profileHandle).toBeNull();
    });
  });

  describe('GitHub URLs', () => {
    it('should parse github.com/username', () => {
      const result = parseDestination('https://github.com/torvalds');
      expect(result).toEqual({ profileUrl: 'https://github.com/torvalds', postUrl: null, profileHandle: 'torvalds' });
    });
  });

  describe('TikTok URLs', () => {
    it('should parse tiktok.com/@handle', () => {
      const result = parseDestination('https://tiktok.com/@charlidamelio');
      expect(result).toEqual({ profileUrl: 'https://tiktok.com/@charlidamelio', postUrl: null, profileHandle: '@charlidamelio' });
    });
  });

  describe('Twitch URLs', () => {
    it('should parse twitch.tv/username', () => {
      const result = parseDestination('https://twitch.tv/ninja');
      expect(result).toEqual({ profileUrl: 'https://twitch.tv/ninja', postUrl: null, profileHandle: 'ninja' });
    });
  });

  describe('Telegram URLs', () => {
    it('should parse t.me/username', () => {
      const result = parseDestination('https://t.me/durov');
      expect(result).toEqual({ profileUrl: 'https://t.me/durov', postUrl: null, profileHandle: '@durov' });
    });
  });

  describe('Instagram URLs', () => {
    it('should parse instagram.com/username', () => {
      const result = parseDestination('https://instagram.com/cristiano');
      expect(result).toEqual({ profileUrl: 'https://instagram.com/cristiano', postUrl: null, profileHandle: '@cristiano' });
    });

    it('should not parse reserved paths', () => {
      const result = parseDestination('https://instagram.com/p/abc123');
      expect(result.profileHandle).toBeNull();
    });
  });

  describe('LinkedIn URLs', () => {
    it('should parse linkedin.com/in/username', () => {
      const result = parseDestination('https://linkedin.com/in/satyanadella');
      expect(result).toEqual({ profileUrl: 'https://linkedin.com/in/satyanadella', postUrl: null, profileHandle: 'satyanadella' });
    });
  });

  describe('Medium URLs', () => {
    it('should parse medium.com/@username profile', () => {
      const result = parseDestination('https://medium.com/@ev');
      expect(result).toEqual({ profileUrl: 'https://medium.com/@ev', postUrl: null, profileHandle: '@ev' });
    });

    it('should parse medium.com/@username/post as post', () => {
      const result = parseDestination('https://medium.com/@ev/my-post-abc123');
      expect(result.profileUrl).toBe('https://medium.com/@ev');
      expect(result.postUrl).toBe('https://medium.com/@ev/my-post-abc123');
    });
  });

  describe('Reddit URLs', () => {
    it('should parse reddit.com/u/username', () => {
      const result = parseDestination('https://reddit.com/u/spez');
      expect(result).toEqual({ profileUrl: 'https://reddit.com/u/spez', postUrl: null, profileHandle: 'u/spez' });
    });

    it('should parse reddit.com/user/username', () => {
      const result = parseDestination('https://reddit.com/user/spez');
      expect(result.profileHandle).toBe('u/spez');
    });
  });

  describe('Bluesky URLs', () => {
    it('should parse bsky.app/profile/handle', () => {
      const result = parseDestination('https://bsky.app/profile/jay.bsky.social');
      expect(result).toEqual({ profileUrl: 'https://bsky.app/profile/jay.bsky.social', postUrl: null, profileHandle: 'jay.bsky.social' });
    });
  });

  describe('Grove URLs', () => {
    it('should parse grove.city/handle', () => {
      const result = parseDestination('https://grove.city/arthursabintsev');
      expect(result).toEqual({ profileUrl: 'https://grove.city/arthursabintsev', postUrl: null, profileHandle: 'arthursabintsev' });
    });
  });

  describe('other URLs', () => {
    it('should return postUrl for unknown URLs', () => {
      const result = parseDestination('example.com/some/path');
      expect(result).toEqual({
        profileUrl: null,
        postUrl: 'https://example.com/some/path',
        profileHandle: null
      });
    });

    it('should preserve existing https protocol', () => {
      const result = parseDestination('https://example.com/path');
      expect(result.postUrl).toBe('https://example.com/path');
    });

    it('should preserve existing http protocol', () => {
      const result = parseDestination('http://example.com/path');
      expect(result.postUrl).toBe('http://example.com/path');
    });
  });
});
