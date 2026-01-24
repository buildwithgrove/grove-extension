import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let HistoryRenderer;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');

  context = {
    window: dom.window,
    document: dom.window.document,
    console: console,
  };
  context.window = context;

  // Load dependencies in order
  loadBrowserScript('src/utils/formatUtils.js', context);
  loadBrowserScript('src/ui/leaderboardRenderer.js', context);

  // Load HistoryRenderer
  loadBrowserScript('src/ui/historyRenderer.js', context);
  HistoryRenderer = context.HistoryRenderer;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HistoryRenderer', () => {
  describe('getTransactionIcon', () => {
    it('should return tip sent icon for tip_sent', () => {
      const icon = HistoryRenderer.getTransactionIcon('tip_sent');
      expect(icon).toContain('svg');
      expect(icon).toContain('M12 19V5'); // Up arrow path
    });

    it('should return tip received icon for tip_received', () => {
      const icon = HistoryRenderer.getTransactionIcon('tip_received');
      expect(icon).toContain('svg');
      expect(icon).toContain('M17 5H9.5'); // Dollar sign path
    });

    it('should return deposit icon for deposit', () => {
      const icon = HistoryRenderer.getTransactionIcon('deposit');
      expect(icon).toContain('svg');
      expect(icon).toContain('M12 5v14'); // Plus icon has this path
    });

    it('should return failed icon for failed', () => {
      const icon = HistoryRenderer.getTransactionIcon('failed');
      expect(icon).toContain('svg');
      expect(icon).toContain('M18 6L6 18'); // X path
    });

    it('should return default icon for unknown types', () => {
      const icon = HistoryRenderer.getTransactionIcon('unknown');
      expect(icon).toContain('svg');
      expect(icon).toContain('circle'); // Default is a circle
    });
  });

  describe('getTransactionLabel', () => {
    it('should return "Tipped" for tip_sent', () => {
      expect(HistoryRenderer.getTransactionLabel('tip_sent')).toBe('Tipped');
    });

    it('should return "Earned" for tip_received', () => {
      expect(HistoryRenderer.getTransactionLabel('tip_received')).toBe('Earned');
    });

    it('should return "Deposit" for deposit', () => {
      expect(HistoryRenderer.getTransactionLabel('deposit')).toBe('Deposit');
    });

    it('should return "Transaction" for unknown types', () => {
      expect(HistoryRenderer.getTransactionLabel('unknown')).toBe('Transaction');
      expect(HistoryRenderer.getTransactionLabel(null)).toBe('Transaction');
    });
  });

  describe('isTwitterUrl', () => {
    it('should return true for x.com URLs', () => {
      expect(HistoryRenderer.isTwitterUrl('https://x.com/user')).toBe(true);
      expect(HistoryRenderer.isTwitterUrl('x.com/user/status/123')).toBe(true);
    });

    it('should return true for twitter.com URLs', () => {
      expect(HistoryRenderer.isTwitterUrl('https://twitter.com/user')).toBe(true);
    });

    it('should return false for other URLs', () => {
      expect(HistoryRenderer.isTwitterUrl('https://facebook.com')).toBe(false);
      expect(HistoryRenderer.isTwitterUrl('https://example.com')).toBe(false);
    });

    it('should return falsy for empty/null', () => {
      expect(HistoryRenderer.isTwitterUrl(null)).toBeFalsy();
      expect(HistoryRenderer.isTwitterUrl('')).toBeFalsy();
    });
  });

  describe('icons', () => {
    it('should have all required icons defined', () => {
      expect(HistoryRenderer.icons.tipSent).toContain('svg');
      expect(HistoryRenderer.icons.tipReceived).toContain('svg');
      expect(HistoryRenderer.icons.deposit).toContain('svg');
      expect(HistoryRenderer.icons.failed).toContain('svg');
      expect(HistoryRenderer.icons.default).toContain('svg');
      expect(HistoryRenderer.icons.xPlatform).toContain('svg');
      expect(HistoryRenderer.icons.link).toContain('svg');
    });
  });

  describe('buildTxLink', () => {
    it('should return link to block explorer', () => {
      const html = HistoryRenderer.buildTxLink('base', '0xabc123');
      expect(html).toContain('<a href="https://basescan.org/tx/0xabc123"');
      expect(html).toContain('View transaction');
    });

    it('should return empty span when no txHash', () => {
      const html = HistoryRenderer.buildTxLink('base', null);
      expect(html).toContain('history-tx-link-empty');
    });
  });
});
