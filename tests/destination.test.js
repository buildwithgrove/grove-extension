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
