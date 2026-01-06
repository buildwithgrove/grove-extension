import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let LeaderboardRenderer;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');

  context = {
    window: dom.window,
    document: dom.window.document,
    console: console,
  };
  context.window = context;

  // Load dependencies first
  loadBrowserScript('src/utils/formatUtils.js', context);

  // Load LeaderboardRenderer
  loadBrowserScript('src/ui/leaderboardRenderer.js', context);
  LeaderboardRenderer = context.LeaderboardRenderer;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LeaderboardRenderer', () => {
  describe('getExplorerUrl', () => {
    it('should return basescan URL for base mainnet', () => {
      const url = LeaderboardRenderer.getExplorerUrl('base', '0xabc123');
      expect(url).toBe('https://basescan.org/tx/0xabc123');
    });

    it('should return sepolia basescan URL for base testnet', () => {
      const url = LeaderboardRenderer.getExplorerUrl('base-sepolia', '0xabc123');
      expect(url).toBe('https://sepolia.basescan.org/tx/0xabc123');
    });

    it('should handle base_sepolia with underscore', () => {
      const url = LeaderboardRenderer.getExplorerUrl('base_sepolia', '0xabc123');
      expect(url).toBe('https://sepolia.basescan.org/tx/0xabc123');
    });

    it('should return solscan URL for solana mainnet', () => {
      const url = LeaderboardRenderer.getExplorerUrl('solana', 'abc123');
      expect(url).toBe('https://solscan.io/tx/abc123');
    });

    it('should return solscan devnet URL for solana devnet', () => {
      const url = LeaderboardRenderer.getExplorerUrl('solana-devnet', 'abc123');
      expect(url).toBe('https://solscan.io/tx/abc123?cluster=devnet');
    });

    it('should return null for missing txHash', () => {
      expect(LeaderboardRenderer.getExplorerUrl('base', null)).toBeNull();
      expect(LeaderboardRenderer.getExplorerUrl('base', '')).toBeNull();
    });

    it('should default to basescan for unknown networks', () => {
      const url = LeaderboardRenderer.getExplorerUrl('unknown', '0xabc123');
      expect(url).toBe('https://basescan.org/tx/0xabc123');
    });
  });

  describe('getAddressExplorerUrl', () => {
    it('should return basescan address URL for base mainnet', () => {
      const url = LeaderboardRenderer.getAddressExplorerUrl('base', '0xabc123');
      expect(url).toBe('https://basescan.org/address/0xabc123');
    });

    it('should return sepolia basescan address URL for testnet', () => {
      const url = LeaderboardRenderer.getAddressExplorerUrl('base-sepolia', '0xabc123');
      expect(url).toBe('https://sepolia.basescan.org/address/0xabc123');
    });

    it('should return solscan account URL for solana', () => {
      const url = LeaderboardRenderer.getAddressExplorerUrl('solana', 'abc123');
      expect(url).toBe('https://solscan.io/account/abc123');
    });

    it('should return solscan devnet account URL for solana devnet', () => {
      const url = LeaderboardRenderer.getAddressExplorerUrl('solana-devnet', 'abc123');
      expect(url).toBe('https://solscan.io/account/abc123?cluster=devnet');
    });

    it('should return null for missing address', () => {
      expect(LeaderboardRenderer.getAddressExplorerUrl('base', null)).toBeNull();
      expect(LeaderboardRenderer.getAddressExplorerUrl('base', '')).toBeNull();
    });
  });

  describe('getDestinationUrl', () => {
    it('should return URL as-is if already has protocol', () => {
      expect(LeaderboardRenderer.getDestinationUrl('https://x.com/user')).toBe('https://x.com/user');
      expect(LeaderboardRenderer.getDestinationUrl('http://example.com')).toBe('http://example.com');
    });

    it('should add https protocol to URLs without protocol', () => {
      expect(LeaderboardRenderer.getDestinationUrl('x.com/user')).toBe('https://x.com/user');
      expect(LeaderboardRenderer.getDestinationUrl('example.com')).toBe('https://example.com');
    });

    it('should return null for empty input', () => {
      expect(LeaderboardRenderer.getDestinationUrl(null)).toBeNull();
      expect(LeaderboardRenderer.getDestinationUrl('')).toBeNull();
    });
  });

  describe('isTwitterUrl', () => {
    it('should return true for x.com URLs', () => {
      expect(LeaderboardRenderer.isTwitterUrl('https://x.com/user')).toBe(true);
      expect(LeaderboardRenderer.isTwitterUrl('x.com/user/status/123')).toBe(true);
    });

    it('should return true for twitter.com URLs', () => {
      expect(LeaderboardRenderer.isTwitterUrl('https://twitter.com/user')).toBe(true);
      expect(LeaderboardRenderer.isTwitterUrl('twitter.com/user')).toBe(true);
    });

    it('should return false for other URLs', () => {
      expect(LeaderboardRenderer.isTwitterUrl('https://facebook.com/user')).toBe(false);
      expect(LeaderboardRenderer.isTwitterUrl('https://example.com')).toBe(false);
    });

    it('should return falsy for empty/null input', () => {
      expect(LeaderboardRenderer.isTwitterUrl(null)).toBeFalsy();
      expect(LeaderboardRenderer.isTwitterUrl('')).toBeFalsy();
    });
  });

  describe('buildPlatformLink', () => {
    it('should return X icon link for Twitter URLs', () => {
      const html = LeaderboardRenderer.buildPlatformLink('https://x.com/user', true);
      expect(html).toContain('<a href="https://x.com/user"');
      expect(html).toContain('View on X');
      expect(html).toContain('svg');
    });

    it('should return empty span for non-Twitter URLs', () => {
      const html = LeaderboardRenderer.buildPlatformLink('https://example.com', false);
      expect(html).toContain('history-platform-link-empty');
      expect(html).not.toContain('<a');
    });

    it('should return empty span when URL is null', () => {
      const html = LeaderboardRenderer.buildPlatformLink(null, true);
      expect(html).toContain('history-platform-link-empty');
    });
  });

  describe('buildTxLink', () => {
    it('should return link to block explorer', () => {
      const html = LeaderboardRenderer.buildTxLink('base', '0xabc123');
      expect(html).toContain('<a href="https://basescan.org/tx/0xabc123"');
      expect(html).toContain('View transaction');
      expect(html).toContain('svg');
    });

    it('should return empty span when no txHash', () => {
      const html = LeaderboardRenderer.buildTxLink('base', null);
      expect(html).toContain('history-tx-link-empty');
    });
  });

  describe('icons', () => {
    it('should have required icons defined', () => {
      expect(LeaderboardRenderer.icons.dollar).toContain('svg');
      expect(LeaderboardRenderer.icons.xPlatform).toContain('svg');
      expect(LeaderboardRenderer.icons.link).toContain('svg');
    });
  });
});
