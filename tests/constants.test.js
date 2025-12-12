import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let formatTipAmount;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');

  context = {
    window: dom.window,
    document: dom.window.document,
    console: console,
  };
  context.window = context;

  loadBrowserScript('src/ui/constants.js', context);
  formatTipAmount = context.formatTipAmount;
});

describe('formatTipAmount', () => {
  describe('normal amounts (>= $0.01)', () => {
    it('should format $1 as 1.00', () => {
      expect(formatTipAmount(1)).toBe('1.00');
    });

    it('should format $0.10 as 0.10', () => {
      expect(formatTipAmount(0.1)).toBe('0.10');
    });

    it('should format $0.01 as 0.01', () => {
      expect(formatTipAmount(0.01)).toBe('0.01');
    });

    it('should format $10.50 as 10.50', () => {
      expect(formatTipAmount(10.5)).toBe('10.50');
    });

    it('should format $100 as 100.00', () => {
      expect(formatTipAmount(100)).toBe('100.00');
    });

    it('should handle string amounts', () => {
      expect(formatTipAmount('1.5')).toBe('1.50');
    });
  });

  describe('small amounts (< $0.01)', () => {
    it('should format $0.001 as 0.001', () => {
      expect(formatTipAmount(0.001)).toBe('0.001');
    });

    it('should format $0.0001 as 0.0001', () => {
      expect(formatTipAmount(0.0001)).toBe('0.0001');
    });

    it('should format $0.00001 as 0.00001', () => {
      expect(formatTipAmount(0.00001)).toBe('0.00001');
    });

    it('should format $0.000001 as 0.000001', () => {
      expect(formatTipAmount(0.000001)).toBe('0.000001');
    });

    it('should format $0.0000002 as 0.0000002', () => {
      expect(formatTipAmount(0.0000002)).toBe('0.0000002');
    });

    it('should format $0.005 as 0.005', () => {
      expect(formatTipAmount(0.005)).toBe('0.005');
    });
  });

  describe('edge cases', () => {
    it('should return null for null input', () => {
      expect(formatTipAmount(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(formatTipAmount(undefined)).toBeNull();
    });

    it('should return null for 0', () => {
      expect(formatTipAmount(0)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(formatTipAmount('')).toBeNull();
    });

    it('should handle very small scientific notation', () => {
      expect(formatTipAmount(2e-7)).toBe('0.0000002');
    });
  });
});
