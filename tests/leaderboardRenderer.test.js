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
  loadBrowserScript('src/parsers/destination.js', context);

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

  // ---- Table-based rendering tests ----

  describe('renderTippersTable', () => {
    const entries = [
      { address: '0x1234567890abcdef', handle: 'alice', tipCount: 15, totalUSD: 42.5, network: 'base', lastTipContext: {}, lastTipDestination: '' },
      { address: '0xabcdef1234567890', ens_name: 'bob.eth', tipCount: 8, totalUSD: 20, network: 'base', lastTipContext: {}, lastTipDestination: '' },
      { address: '0x9999999999999999', tipCount: 3, totalUSD: 5, network: 'base', lastTipContext: { sender_username: 'charlie' }, lastTipDestination: '' },
    ];

    it('should return an HTML table', () => {
      const html = LeaderboardRenderer.renderTippersTable(entries);
      expect(html).toContain('<table class="lb-table">');
      expect(html).toContain('</table>');
    });

    it('should render one row per entry', () => {
      const html = LeaderboardRenderer.renderTippersTable(entries);
      const rowCount = (html.match(/<tr>/g) || []).length;
      expect(rowCount).toBe(3);
    });

    it('should apply gold rank class to first entry', () => {
      const html = LeaderboardRenderer.renderTippersTable(entries);
      expect(html).toContain('lb-rank rank1');
    });

    it('should apply silver rank class to second entry', () => {
      const html = LeaderboardRenderer.renderTippersTable(entries);
      expect(html).toContain('lb-rank rank2');
    });

    it('should apply bronze rank class to third entry', () => {
      const html = LeaderboardRenderer.renderTippersTable(entries);
      expect(html).toContain('lb-rank rank3');
    });

    it('should display tip count in user meta', () => {
      const html = LeaderboardRenderer.renderTippersTable(entries);
      expect(html).toContain('15 tips sent');
      expect(html).toContain('8 tips sent');
    });

    it('should display formatted amount', () => {
      const html = LeaderboardRenderer.renderTippersTable(entries);
      expect(html).toContain('lb-col-amount');
    });

    it('should link handle-based users to grove.city', () => {
      const html = LeaderboardRenderer.renderTippersTable(entries);
      expect(html).toContain('grove.city/alice');
    });
  });

  describe('renderEarnersTable', () => {
    const entries = [
      { address: '0x1111111111111111', handle: 'dave', tipCount: 20, totalUSD: 100, network: 'base', lastTipContext: {}, lastTipDestination: '' },
      { address: '0x2222222222222222', tipCount: 5, totalUSD: 15, network: 'base', lastTipContext: { recipient_username: 'eve' }, lastTipDestination: '' },
    ];

    it('should return an HTML table', () => {
      const html = LeaderboardRenderer.renderEarnersTable(entries);
      expect(html).toContain('<table class="lb-table">');
    });

    it('should show "tips earned" in user meta', () => {
      const html = LeaderboardRenderer.renderEarnersTable(entries);
      expect(html).toContain('20 tips earned');
      expect(html).toContain('5 tips earned');
    });

    it('should render rank badges', () => {
      const html = LeaderboardRenderer.renderEarnersTable(entries);
      expect(html).toContain('lb-rank rank1');
      expect(html).toContain('lb-rank rank2');
    });
  });

  describe('renderLiveTipsTable', () => {
    const entries = [
      {
        txHash: '0xaaa',
        destination: 'https://x.com/frank/status/123',
        address: '0x3333333333333333',
        network: 'base',
        amountUSD: 5,
        confirmedAt: new Date().toISOString(),
        handle: 'frank',
        context: {}
      },
      {
        txHash: '0xbbb',
        destination: 'https://x.com/grace',
        address: '0x4444444444444444',
        network: 'base',
        amountUSD: 10,
        confirmedAt: new Date(Date.now() - 300000).toISOString(),
        context: { recipient_username: 'grace', recipient_profile_url: 'https://x.com/grace' }
      },
    ];

    it('should return an HTML table', () => {
      const html = LeaderboardRenderer.renderLiveTipsTable(entries);
      expect(html).toContain('<table class="lb-table">');
    });

    it('should use time column instead of rank', () => {
      const html = LeaderboardRenderer.renderLiveTipsTable(entries);
      expect(html).toContain('lb-col-time');
      expect(html).not.toContain('lb-col-rank');
    });

    it('should show "earned tip" in user meta', () => {
      const html = LeaderboardRenderer.renderLiveTipsTable(entries);
      expect(html).toContain('earned tip');
    });

    it('should add lb-new class for new entries', () => {
      const newHashes = new Set(['0xaaa']);
      const html = LeaderboardRenderer.renderLiveTipsTable(entries, newHashes);
      expect(html).toContain('class="lb-new"');
    });

    it('should not add lb-new class for non-new entries', () => {
      const html = LeaderboardRenderer.renderLiveTipsTable(entries, new Set());
      expect(html).not.toContain('lb-new');
    });

    it('should link time to block explorer', () => {
      const html = LeaderboardRenderer.renderLiveTipsTable(entries);
      expect(html).toContain('basescan.org/tx/0xaaa');
    });

    it('should prefer recipient_grove_handle over social username', () => {
      const groveEntries = [{
        txHash: '0xccc',
        destination: 'https://x.com/grace',
        address: '0x5555555555555555',
        network: 'base',
        amountUSD: 3,
        confirmedAt: new Date().toISOString(),
        context: {
          recipient_username: 'grace',
          recipient_profile_url: 'https://x.com/grace',
          recipient_grove_handle: 'grace-grove',
        },
      }];
      const html = LeaderboardRenderer.renderLiveTipsTable(groveEntries);
      expect(html).toContain('<a href="https://grove.city/grace-grove"');
      expect(html).toContain('>@grace-grove</a>');
    });
  });

  describe('renderSkeletonTable', () => {
    it('should return an HTML table with shimmer cells', () => {
      const html = LeaderboardRenderer.renderSkeletonTable(false, 3);
      expect(html).toContain('<table class="lb-table">');
      expect(html).toContain('lb-shimmer');
    });

    it('should render specified number of rows', () => {
      const html = LeaderboardRenderer.renderSkeletonTable(false, 4);
      const rowCount = (html.match(/<tr>/g) || []).length;
      expect(rowCount).toBe(4);
    });

    it('should use rank column for non-live view', () => {
      const html = LeaderboardRenderer.renderSkeletonTable(false, 2);
      expect(html).toContain('lb-col-rank');
      expect(html).not.toContain('lb-col-time');
    });

    it('should use time column for live view', () => {
      const html = LeaderboardRenderer.renderSkeletonTable(true, 2);
      expect(html).toContain('lb-col-time');
      expect(html).not.toContain('lb-col-rank');
    });

    it('should include skeleton name and meta placeholders', () => {
      const html = LeaderboardRenderer.renderSkeletonTable(false, 1);
      expect(html).toContain('lb-skeleton-name');
      expect(html).toContain('lb-skeleton-meta');
      expect(html).toContain('lb-skeleton-amount');
      expect(html).toContain('lb-skeleton-icon');
    });

    it('should default to 5 rows', () => {
      const html = LeaderboardRenderer.renderSkeletonTable();
      const rowCount = (html.match(/<tr>/g) || []).length;
      expect(rowCount).toBe(5);
    });
  });

  describe('getRankClass', () => {
    it('should return rank1 for index 0', () => {
      expect(LeaderboardRenderer.getRankClass(0)).toBe('rank1');
    });

    it('should return rank2 for index 1', () => {
      expect(LeaderboardRenderer.getRankClass(1)).toBe('rank2');
    });

    it('should return rank3 for index 2', () => {
      expect(LeaderboardRenderer.getRankClass(2)).toBe('rank3');
    });

    it('should return empty string for index >= 3', () => {
      expect(LeaderboardRenderer.getRankClass(3)).toBe('');
      expect(LeaderboardRenderer.getRankClass(9)).toBe('');
    });
  });

  describe('getContentPlatform', () => {
    it('should detect X from lastTipDestination', () => {
      const entry = { lastTipDestination: 'https://x.com/user/status/123', lastTipContext: {} };
      const result = LeaderboardRenderer.getContentPlatform(entry);
      expect(result.platform).toBe('x');
      expect(result.url).toContain('x.com');
    });

    it('should detect Substack from lastTipDestination', () => {
      const entry = { lastTipDestination: 'https://example.substack.com/p/my-post', lastTipContext: {} };
      const result = LeaderboardRenderer.getContentPlatform(entry);
      expect(result.platform).toBe('substack');
      expect(result.url).toContain('substack.com');
    });

    it('should detect website from generic URL', () => {
      const entry = { lastTipDestination: 'https://example.com/page', lastTipContext: {} };
      const result = LeaderboardRenderer.getContentPlatform(entry);
      expect(result.platform).toBe('website');
    });

    it('should prefer source_post_url over destination', () => {
      const entry = {
        lastTipDestination: 'https://x.com/user',
        lastTipContext: { source_post_url: 'https://blog.substack.com/p/article' }
      };
      const result = LeaderboardRenderer.getContentPlatform(entry);
      expect(result.platform).toBe('substack');
    });

    it('should fall back to profile URL from context', () => {
      const entry = { lastTipContext: { recipient_profile_url: 'https://x.com/alice' } };
      const result = LeaderboardRenderer.getContentPlatform(entry);
      expect(result.platform).toBe('x');
      expect(result.url).toBe('https://x.com/alice');
    });

    it('should return null for entries with no destination info', () => {
      const entry = { lastTipContext: {} };
      const result = LeaderboardRenderer.getContentPlatform(entry);
      expect(result.platform).toBeNull();
      expect(result.url).toBeNull();
    });

    it('should work with live tip entry fields (destination/context)', () => {
      const entry = { destination: 'https://x.com/bob/status/456', context: {} };
      const result = LeaderboardRenderer.getContentPlatform(entry);
      expect(result.platform).toBe('x');
    });

    it('should filter out ENS identity platform', () => {
      const entry = { lastTipDestination: 'https://app.ens.domains/vitalik.eth', lastTipContext: {} };
      const result = LeaderboardRenderer.getContentPlatform(entry);
      expect(result.platform).toBeNull();
    });

    it('should filter out Base identity platform', () => {
      const entry = { lastTipDestination: 'https://www.base.org/name/alice', lastTipContext: {} };
      const result = LeaderboardRenderer.getContentPlatform(entry);
      expect(result.platform).toBeNull();
    });

    it('should filter out Grove identity platform', () => {
      const entry = { lastTipDestination: 'https://grove.city/@bob', lastTipContext: {} };
      const result = LeaderboardRenderer.getContentPlatform(entry);
      expect(result.platform).toBeNull();
    });
  });

  describe('content column shows tipped platform', () => {
    it('should show X icon for X destination in tippers table', () => {
      const entries = [{
        address: '0x1111', handle: 'alice', tipCount: 5, totalUSD: 25, network: 'base',
        lastTipContext: {}, lastTipDestination: 'https://x.com/bob/status/123'
      }];
      const html = LeaderboardRenderer.renderTippersTable(entries);
      expect(html).toContain('View on X');
    });

    it('should show Substack icon for Substack destination', () => {
      const entries = [{
        address: '0x2222', handle: 'carol', tipCount: 3, totalUSD: 10, network: 'base',
        lastTipContext: {}, lastTipDestination: 'https://blog.substack.com/p/post'
      }];
      const html = LeaderboardRenderer.renderTippersTable(entries);
      expect(html).toContain('View on Substack');
    });

    it('should show globe icon for generic website destination', () => {
      const entries = [{
        address: '0x3333', handle: 'dave', tipCount: 1, totalUSD: 5, network: 'base',
        lastTipContext: {}, lastTipDestination: 'https://example.org/page'
      }];
      const html = LeaderboardRenderer.renderTippersTable(entries);
      expect(html).toContain('Visit website');
    });

    it('should show content platform in earners table', () => {
      const entries = [{
        address: '0x4444', handle: 'eve', tipCount: 10, totalUSD: 50, network: 'base',
        lastTipContext: { source_post_url: 'https://writer.substack.com/p/article' }, lastTipDestination: ''
      }];
      const html = LeaderboardRenderer.renderEarnersTable(entries);
      expect(html).toContain('View on Substack');
    });

    it('should show content platform in live tips table', () => {
      const entries = [{
        txHash: '0xddd', destination: 'https://example.substack.com/p/post',
        address: '0x5555', network: 'base', amountUSD: 2,
        confirmedAt: new Date().toISOString(), context: {}
      }];
      const html = LeaderboardRenderer.renderLiveTipsTable(entries);
      expect(html).toContain('View on Substack');
    });
  });

  describe('renderTippersList delegates to table', () => {
    it('should return table HTML from renderTippersList', () => {
      const entries = [
        { address: '0x1111', handle: 'test', tipCount: 1, totalUSD: 1, network: 'base', lastTipContext: {}, lastTipDestination: '' },
      ];
      const html = LeaderboardRenderer.renderTippersList(entries);
      expect(html).toContain('<table class="lb-table">');
    });
  });

  describe('renderEarnersList delegates to table', () => {
    it('should return table HTML from renderEarnersList', () => {
      const entries = [
        { address: '0x2222', handle: 'test2', tipCount: 2, totalUSD: 2, network: 'base', lastTipContext: {}, lastTipDestination: '' },
      ];
      const html = LeaderboardRenderer.renderEarnersList(entries);
      expect(html).toContain('<table class="lb-table">');
    });
  });

  describe('renderLiveTipsList delegates to table', () => {
    it('should return table HTML from renderLiveTipsList', () => {
      const entries = [
        { txHash: '0xccc', destination: 'https://x.com/test', address: '0x3333', network: 'base', amountUSD: 1, confirmedAt: new Date().toISOString(), context: { recipient_username: 'test' } },
      ];
      const html = LeaderboardRenderer.renderLiveTipsList(entries);
      expect(html).toContain('<table class="lb-table">');
    });
  });
});
