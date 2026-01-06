import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let FormatUtils;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');

  context = {
    window: dom.window,
    document: dom.window.document,
    console: console,
  };
  context.window = context;

  loadBrowserScript('src/utils/formatUtils.js', context);
  FormatUtils = context.FormatUtils;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FormatUtils', () => {
  describe('formatBalance', () => {
    it('should format valid balance to 2 decimals', () => {
      expect(FormatUtils.formatBalance(10.5)).toBe('10.50');
      expect(FormatUtils.formatBalance(100)).toBe('100.00');
      expect(FormatUtils.formatBalance(0.1)).toBe('0.10');
    });

    it('should handle string input', () => {
      expect(FormatUtils.formatBalance('25.5')).toBe('25.50');
      expect(FormatUtils.formatBalance('0')).toBe('0.00');
    });

    it('should return default for NaN', () => {
      expect(FormatUtils.formatBalance(NaN)).toBe('0.00');
      expect(FormatUtils.formatBalance('invalid')).toBe('0.00');
      expect(FormatUtils.formatBalance(undefined)).toBe('0.00');
    });
  });

  describe('formatPoolUSD', () => {
    it('should format millions', () => {
      expect(FormatUtils.formatPoolUSD(1000000)).toBe('$1.0M');
      expect(FormatUtils.formatPoolUSD(2500000)).toBe('$2.5M');
      expect(FormatUtils.formatPoolUSD(10000000)).toBe('$10.0M');
    });

    it('should format thousands', () => {
      expect(FormatUtils.formatPoolUSD(1000)).toBe('$1.0K');
      expect(FormatUtils.formatPoolUSD(5500)).toBe('$5.5K');
      expect(FormatUtils.formatPoolUSD(999999)).toBe('$1000.0K');
    });

    it('should format small values with decimals', () => {
      expect(FormatUtils.formatPoolUSD(100)).toBe('$100.00');
      expect(FormatUtils.formatPoolUSD(50.5)).toBe('$50.50');
      expect(FormatUtils.formatPoolUSD(0)).toBe('$0.00');
    });
  });

  describe('formatStatUSD', () => {
    it('should format millions', () => {
      expect(FormatUtils.formatStatUSD(1000000)).toBe('$1M');
      expect(FormatUtils.formatStatUSD(2500000)).toBe('$2.5M');
      expect(FormatUtils.formatStatUSD(999500)).toBe('$1M');
    });

    it('should format tens of thousands', () => {
      expect(FormatUtils.formatStatUSD(10000)).toBe('$10K');
      expect(FormatUtils.formatStatUSD(50000)).toBe('$50K');
    });

    it('should format thousands with decimal', () => {
      expect(FormatUtils.formatStatUSD(1000)).toBe('$1K');
      expect(FormatUtils.formatStatUSD(1500)).toBe('$1.5K');
      expect(FormatUtils.formatStatUSD(9999)).toBe('$10K');
    });

    it('should format hundreds as rounded', () => {
      expect(FormatUtils.formatStatUSD(100)).toBe('$100');
      expect(FormatUtils.formatStatUSD(500)).toBe('$500');
    });

    it('should format small values with decimals', () => {
      expect(FormatUtils.formatStatUSD(50)).toBe('$50.00');
      expect(FormatUtils.formatStatUSD(0.5)).toBe('$0.50');
    });
  });

  describe('formatStatCount', () => {
    it('should format millions', () => {
      expect(FormatUtils.formatStatCount(1000000)).toBe('1M');
      expect(FormatUtils.formatStatCount(2500000)).toBe('2.5M');
    });

    it('should format tens of thousands', () => {
      expect(FormatUtils.formatStatCount(10000)).toBe('10K');
      expect(FormatUtils.formatStatCount(50000)).toBe('50K');
    });

    it('should format thousands with decimal', () => {
      expect(FormatUtils.formatStatCount(1000)).toBe('1K');
      expect(FormatUtils.formatStatCount(1500)).toBe('1.5K');
    });

    it('should format small values as is', () => {
      expect(FormatUtils.formatStatCount(100)).toBe('100');
      expect(FormatUtils.formatStatCount(999)).toBe('999');
      expect(FormatUtils.formatStatCount(0)).toBe('0');
    });
  });

  describe('truncateDestination', () => {
    it('should not truncate short strings', () => {
      expect(FormatUtils.truncateDestination('vitalik.eth')).toBe('vitalik.eth');
      expect(FormatUtils.truncateDestination('abc')).toBe('abc');
    });

    it('should truncate long strings', () => {
      const long = '0x1234567890abcdef1234567890abcdef12345678';
      // Truncates at 24 chars + '...'
      expect(FormatUtils.truncateDestination(long)).toBe('0x1234567890abcdef123456...');
      expect(FormatUtils.truncateDestination(long).length).toBe(27);
    });

    it('should handle empty/null input', () => {
      expect(FormatUtils.truncateDestination('')).toBe('');
      expect(FormatUtils.truncateDestination(null)).toBe('');
      expect(FormatUtils.truncateDestination(undefined)).toBe('');
    });
  });

  describe('formatNetwork', () => {
    it('should format base networks', () => {
      expect(FormatUtils.formatNetwork('base')).toBe('Base');
      expect(FormatUtils.formatNetwork('base-sepolia')).toBe('Base');
      expect(FormatUtils.formatNetwork('base_mainnet')).toBe('Base');
    });

    it('should format solana networks', () => {
      expect(FormatUtils.formatNetwork('solana')).toBe('Solana');
      expect(FormatUtils.formatNetwork('solana-devnet')).toBe('Solana');
    });

    it('should capitalize other networks', () => {
      expect(FormatUtils.formatNetwork('ethereum')).toBe('Ethereum');
      expect(FormatUtils.formatNetwork('polygon')).toBe('Polygon');
    });

    it('should handle empty input', () => {
      expect(FormatUtils.formatNetwork('')).toBe('');
      expect(FormatUtils.formatNetwork(null)).toBe('');
    });
  });

  describe('formatHistoryAmount', () => {
    it('should format tip sent with minus sign', () => {
      expect(FormatUtils.formatHistoryAmount({ type: 'tip_sent', amount_usd: 1.5 })).toBe('-$1.50');
      expect(FormatUtils.formatHistoryAmount({ type: 'tip_sent', amount_usd: 100 })).toBe('-$100.00');
    });

    it('should format other types with plus sign', () => {
      expect(FormatUtils.formatHistoryAmount({ type: 'tip_received', amount_usd: 2.0 })).toBe('+$2.00');
      expect(FormatUtils.formatHistoryAmount({ type: 'deposit', amount_usd: 50 })).toBe('+$50.00');
    });

    it('should handle missing amount', () => {
      expect(FormatUtils.formatHistoryAmount({ type: 'tip_sent' })).toBe('-$0.00');
    });
  });

  describe('formatAddress', () => {
    it('should shorten long addresses', () => {
      expect(FormatUtils.formatAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234...5678');
    });

    it('should not shorten short addresses', () => {
      expect(FormatUtils.formatAddress('0x12345678')).toBe('0x12345678');
      expect(FormatUtils.formatAddress('vitalik.eth')).toBe('vitalik.eth');
    });

    it('should handle empty/null input', () => {
      expect(FormatUtils.formatAddress('')).toBe('Unknown');
      expect(FormatUtils.formatAddress(null)).toBe('Unknown');
      expect(FormatUtils.formatAddress(undefined)).toBe('Unknown');
    });
  });

  describe('formatUSD', () => {
    it('should format large amounts with commas', () => {
      expect(FormatUtils.formatUSD(1000)).toBe('$1,000.00');
      expect(FormatUtils.formatUSD(1234567.89)).toBe('$1,234,567.89');
    });

    it('should format normal amounts with 2 decimals', () => {
      expect(FormatUtils.formatUSD(10)).toBe('$10.00');
      expect(FormatUtils.formatUSD(0.5)).toBe('$0.50');
      expect(FormatUtils.formatUSD(0.01)).toBe('$0.01');
    });

    it('should format tiny amounts with more decimals', () => {
      expect(FormatUtils.formatUSD(0.001)).toBe('$0.001');
      expect(FormatUtils.formatUSD(0.000001)).toBe('$0.000001');
    });

    it('should ensure at least 2 decimals for tiny amounts', () => {
      expect(FormatUtils.formatUSD(0.009)).toBe('$0.009');
    });
  });

  describe('formatTimeAgo', () => {
    it('should format just now', () => {
      const now = new Date();
      expect(FormatUtils.formatTimeAgo(now)).toBe('just now');
    });

    it('should format minutes ago', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(FormatUtils.formatTimeAgo(fiveMinAgo)).toBe('5m ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(FormatUtils.formatTimeAgo(twoHoursAgo)).toBe('2h ago');
    });

    it('should format days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(FormatUtils.formatTimeAgo(threeDaysAgo)).toBe('3d ago');
    });

    it('should handle empty input', () => {
      expect(FormatUtils.formatTimeAgo('')).toBe('');
      expect(FormatUtils.formatTimeAgo(null)).toBe('');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format just now', () => {
      const now = new Date().toISOString();
      expect(FormatUtils.formatRelativeTime(now)).toBe('Just now');
    });

    it('should format minutes ago', () => {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(FormatUtils.formatRelativeTime(tenMinAgo)).toBe('10m ago');
    });

    it('should format hours ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      expect(FormatUtils.formatRelativeTime(threeHoursAgo)).toBe('3h ago');
    });

    it('should format yesterday', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(FormatUtils.formatRelativeTime(yesterday)).toBe('Yesterday');
    });

    it('should format days ago', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      expect(FormatUtils.formatRelativeTime(fiveDaysAgo)).toBe('5d ago');
    });

    it('should format older dates', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const result = FormatUtils.formatRelativeTime(twoWeeksAgo);
      // Should be formatted like "Dec 22" or similar
      expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}/);
    });

    it('should handle empty input', () => {
      expect(FormatUtils.formatRelativeTime('')).toBe('');
      expect(FormatUtils.formatRelativeTime(null)).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(FormatUtils.escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(FormatUtils.escapeHtml('<div class="test">')).toBe('&lt;div class="test"&gt;');
    });

    it('should handle ampersands', () => {
      expect(FormatUtils.escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should handle empty/null input', () => {
      expect(FormatUtils.escapeHtml('')).toBe('');
      expect(FormatUtils.escapeHtml(null)).toBe('');
      expect(FormatUtils.escapeHtml(undefined)).toBe('');
    });

    it('should leave normal text unchanged', () => {
      expect(FormatUtils.escapeHtml('Hello World')).toBe('Hello World');
      expect(FormatUtils.escapeHtml('vitalik.eth')).toBe('vitalik.eth');
    });
  });
});
