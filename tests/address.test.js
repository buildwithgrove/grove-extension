import { describe, it, expect, afterEach } from 'vitest';
import { loadBrowserScript } from './helpers/load-script.js';

const context = loadBrowserScript('src/parsers/addressMatchers.js');
const { AddressParser, AddressMatchers } = loadBrowserScript('src/parsers/address.js', context);

describe('AddressParser', () => {
  describe('ENS_PATTERN', () => {
    describe('valid ENS names', () => {
      const validNames = [
        'vitalik.eth',
        'jesse.base.eth',
        'foo-bar.eth',
        'sub.domain.eth',
        'a.b.c.base.eth',
      ];

      it.each(validNames)('should match %s', (name) => {
        expect(AddressParser.ENS_PATTERN.test(name)).toBe(true);
      });
    });

    describe('ENSIP-15 special characters', () => {
      const specialNames = [
        ['$$$$$.base.eth', 'dollar signs'],
        ['$money.eth', 'leading dollar sign'],
        ['_underscore.eth', 'leading underscore'],
        ['foo_bar.eth', 'middle underscore'],
      ];

      it.each(specialNames)('should match %s (%s)', (name) => {
        expect(AddressParser.ENS_PATTERN.test(name)).toBe(true);
      });
    });

    describe('unicode and emoji names', () => {
      const unicodeNames = [
        ['🔥.eth', 'fire emoji'],
        ['café.eth', 'accented character'],
        ['niño.eth', 'spanish ñ'],
        ['münchen.eth', 'german umlaut'],
      ];

      it.each(unicodeNames)('should match %s (%s)', (name) => {
        expect(AddressParser.ENS_PATTERN.test(name)).toBe(true);
      });
    });

    describe('invalid patterns', () => {
      const invalidPatterns = [
        ['notens', 'no .eth suffix'],
        ['.eth', 'empty name'],
        ['', 'empty string'],
        ['optimistic.etherscan.io', 'domain containing .eth substring'],
        ['vitalik.ether', 'extension starting with eth'],
        ['vitalik.ethers', '.eth inside a larger word'],
      ];

      it.each(invalidPatterns)('should not match "%s" (%s)', (pattern) => {
        expect(AddressParser.ENS_PATTERN.test(pattern)).toBe(false);
      });
    });
  });

  describe('ETH_ADDRESS_PATTERN', () => {
    it('should match valid 0x addresses', () => {
      expect(AddressParser.ETH_ADDRESS_PATTERN.test('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
      expect(AddressParser.ETH_ADDRESS_PATTERN.test('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
    });

    it('should not match invalid addresses', () => {
      expect(AddressParser.ETH_ADDRESS_PATTERN.test('0x123')).toBe(false);
      expect(AddressParser.ETH_ADDRESS_PATTERN.test('1234567890abcdef1234567890abcdef12345678')).toBe(false);
      expect(AddressParser.ETH_ADDRESS_PATTERN.test('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false);
    });
  });

  describe('hasAddresses', () => {
    it('should return true for text containing ENS names', () => {
      expect(AddressParser.hasAddresses('Tip me at vitalik.eth')).toBe(true);
      expect(AddressParser.hasAddresses('My basename is jesse.base.eth')).toBe(true);
      expect(AddressParser.hasAddresses('Send to $$$$$.base.eth please')).toBe(true);
    });

    it('should return true for text containing 0x addresses', () => {
      expect(AddressParser.hasAddresses('Send to 0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    });

    it('should return false for text without addresses', () => {
      expect(AddressParser.hasAddresses('Just some regular text')).toBe(false);
      expect(AddressParser.hasAddresses('')).toBe(false);
      expect(AddressParser.hasAddresses(null)).toBe(false);
    });
  });

  describe('extractENS', () => {
    it('should extract ENS names and lowercase them', () => {
      expect(AddressParser.extractENS('Tip me at Vitalik.eth')).toBe('vitalik.eth');
      expect(AddressParser.extractENS('My name: JESSE.BASE.ETH')).toBe('jesse.base.eth');
    });

    it('should extract special character names', () => {
      expect(AddressParser.extractENS('Tip $$$$$.base.eth')).toBe('$$$$$.base.eth');
      expect(AddressParser.extractENS('Send to 🔥.eth')).toBe('🔥.eth');
      expect(AddressParser.extractENS('Contact café.eth')).toBe('café.eth');
    });

    it('should allow emoji after ENS names', () => {
      expect(AddressParser.extractENS('vitalik.eth🔥')).toBe('vitalik.eth');
    });

    it('should return null when no ENS found', () => {
      expect(AddressParser.extractENS('No address here')).toBe(null);
      expect(AddressParser.extractENS('')).toBe(null);
      expect(AddressParser.extractENS(null)).toBe(null);
    });

    it('should extract only the first ENS name', () => {
      expect(AddressParser.extractENS('foo.eth and bar.eth')).toBe('foo.eth');
    });
  });

  describe('ENS exclusions', () => {
    const originalList = [...AddressMatchers.DOMAIN_EXCLUSION_LIST];

    afterEach(() => {
      AddressMatchers.DOMAIN_EXCLUSION_LIST.splice(0, AddressMatchers.DOMAIN_EXCLUSION_LIST.length, ...originalList);
    });

    it('should exclude ENS names in the exclusion list', () => {
      AddressMatchers.DOMAIN_EXCLUSION_LIST.push('blocked.eth');
      expect(AddressParser.hasAddresses('blocked.eth')).toBe(false);
      expect(AddressParser.extractENS('blocked.eth')).toBe(null);
    });

    it('should exclude ENS matches that are part of excluded sites', () => {
      AddressMatchers.DOMAIN_EXCLUSION_LIST.push('etherscan.io');
      expect(AddressParser.hasAddresses('optimistic.etherscan.io')).toBe(false);
    });

    it('should exclude ENS matches inside claude.ai URLs and subdomains', () => {
      const samples = [
        'https://claude.ai/vitalik.eth',
        'claude.ai/vitalik.eth',
        'https://support.claude.ai/user/jesse.base.eth',
        'support.claude.ai/profile/🔥.eth',
      ];

      for (const sample of samples) {
        expect(AddressParser.hasAddresses(sample)).toBe(false);
        expect(AddressParser.extractENS(sample)).toBe(null);
      }
    });
  });

  describe('exclusion helpers', () => {
    it('should allow emoji immediately after matches', () => {
      const base = 'x.eth';
      const withEmoji = `${base}🔥`;

      expect(AddressMatchers.isExcludedAddressMatch(base, withEmoji, 0)).toBe(false);
    });

    it('should exclude matches with trailing letters', () => {
      const base = 'x.eth';
      const withLetters = `${base}ers`;

      expect(AddressMatchers.isExcludedAddressMatch(base, withLetters, 0)).toBe(true);
    });

    it('should exclude matches with trailing numbers', () => {
      const base = 'x.eth';
      const withNumbers = `${base}123`;

      expect(AddressMatchers.isExcludedAddressMatch(base, withNumbers, 0)).toBe(true);
    });

    it('should exclude matches with trailing underscores', () => {
      const base = 'x.eth';
      const withUnderscore = `${base}_name`;

      expect(AddressMatchers.isExcludedAddressMatch(base, withUnderscore, 0)).toBe(true);
    });

    it('should return the whitespace-delimited token containing the match', () => {
      const text = 'find me at https://claude.ai/x.eth?ref=profile today';
      const index = text.indexOf('x.eth');

      expect(AddressMatchers.getToken(text, index)).toBe('https://claude.ai/x.eth?ref=profile');
    });
  });

  describe('x.eth identified in different contexts', () => {
    const samples = [
      ['x.eth', 'standalone'],
      ['x.eth is my address', 'start of sentence'],
      ['send tips to x.eth today', 'middle of sentence'],
      ['find me at x.eth', 'end of sentence'],
      ['x.eth🔥', 'with emoji'],
    ];

    it.each(samples)('should match %s (%s)', (sample) => {
      expect(AddressParser.hasAddresses(sample)).toBe(true);
      expect(AddressParser.extractENS(sample)).toBe('x.eth');
    });

    it('should avoid false positives inside longer words', () => {
      expect(AddressParser.hasAddresses('x.ethers')).toBe(false);
      expect(AddressParser.extractENS('x.ethers')).toBe(null);
    });
  });

  describe('extractRawAddress', () => {
    it('should extract 0x addresses', () => {
      expect(AddressParser.extractRawAddress('Send to 0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should return null when no address found', () => {
      expect(AddressParser.extractRawAddress('No address')).toBe(null);
      expect(AddressParser.extractRawAddress(null)).toBe(null);
    });
  });

  describe('resolveAddress', () => {
    it('should resolve 0x addresses with type "raw"', () => {
      const result = AddressParser.resolveAddress('0x1234567890abcdef1234567890abcdef12345678');
      expect(result).toEqual({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        type: 'raw',
        original: '0x1234567890abcdef1234567890abcdef12345678'
      });
    });

    it('should resolve ENS names with type "ens"', () => {
      const result = AddressParser.resolveAddress('vitalik.eth');
      expect(result).toEqual({
        address: 'vitalik.eth',
        type: 'ens',
        original: 'vitalik.eth'
      });
    });

    it('should resolve special ENS names', () => {
      const result = AddressParser.resolveAddress('$$$$$.base.eth');
      expect(result).toEqual({
        address: '$$$$$.base.eth',
        type: 'ens',
        original: '$$$$$.base.eth'
      });
    });

    it('should prioritize 0x addresses over ENS names', () => {
      const result = AddressParser.resolveAddress('0x1234567890abcdef1234567890abcdef12345678 and vitalik.eth');
      expect(result.type).toBe('raw');
    });

    it('should return null fields when no address found', () => {
      const result = AddressParser.resolveAddress('no address here');
      expect(result).toEqual({
        address: null,
        type: null,
        original: null
      });
    });
  });
});
