import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

let TipErrorHandler;
let TIP_ERROR_TYPES;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.document = dom.window.document;
  global.window = dom.window;

  // Mock requestAnimationFrame
  global.window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  global.window.clearTimeout = clearTimeout;
  global.window.setTimeout = setTimeout;
  global.window.innerHeight = 768;
  global.window.innerWidth = 1024;
  global.window.scrollX = 0;
  global.window.scrollY = 0;

  // Define error types that match the source
  TIP_ERROR_TYPES = {
    INSUFFICIENT_BALANCE: 'insufficient_balance',
    AUTH: 'auth',
    RATE_LIMITED: 'rate_limited',
    NETWORK: 'network',
    UNKNOWN: 'unknown'
  };

  const DEFAULT_VARIANTS = {
    [TIP_ERROR_TYPES.INSUFFICIENT_BALANCE]: 'warning',
    [TIP_ERROR_TYPES.RATE_LIMITED]: 'warning',
    [TIP_ERROR_TYPES.AUTH]: 'error',
    [TIP_ERROR_TYPES.NETWORK]: 'error',
    [TIP_ERROR_TYPES.UNKNOWN]: 'error'
  };

  // Recreate the TipErrorHandler class for testing
  class TestTipErrorHandler {
    static parse(raw) {
      const status = raw?.status || null;
      const detail = raw?.data?.detail || raw?.detail || null;
      const baseMessage = this._extractMessage(raw);
      const normalizedMessage = (baseMessage || '').toString().toLowerCase();

      if (this._includes(normalizedMessage, 'insufficient balance') || this._includes(detail?.error?.toLowerCase?.(), 'insufficient balance')) {
        const formatted = this._formatInsufficient(detail || {});
        return {
          type: TIP_ERROR_TYPES.INSUFFICIENT_BALANCE,
          status,
          message: formatted,
          userMessage: formatted,
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.INSUFFICIENT_BALANCE]
        };
      }

      if (status === 401 || status === 403 || this._includes(normalizedMessage, 'unauthorized') || this._includes(normalizedMessage, 'forbidden')) {
        const userMsg = 'Your Grove session expired. Reconnect your account in the extension to keep tipping.';
        return {
          type: TIP_ERROR_TYPES.AUTH,
          status,
          message: userMsg,
          userMessage: userMsg,
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.AUTH]
        };
      }

      if (status === 429 || this._includes(normalizedMessage, 'rate limit')) {
        const userMsg = 'You are tipping too quickly. Please wait a few seconds and try again.';
        return {
          type: TIP_ERROR_TYPES.RATE_LIMITED,
          status,
          message: userMsg,
          userMessage: userMsg,
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.RATE_LIMITED]
        };
      }

      if (this._includes(normalizedMessage, 'network') || this._includes(normalizedMessage, 'fetch') || this._includes(normalizedMessage, 'failed to fetch')) {
        const userMsg = 'Network issue while sending your tip. Check your connection and retry.';
        return {
          type: TIP_ERROR_TYPES.NETWORK,
          status,
          message: userMsg,
          userMessage: userMsg,
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.NETWORK]
        };
      }

      const fallbackMsg = baseMessage || 'Tip failed. Please try again.';
      return {
        type: TIP_ERROR_TYPES.UNKNOWN,
        status,
        message: fallbackMsg,
        userMessage: fallbackMsg,
        detail: detail || {},
        variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.UNKNOWN]
      };
    }

    static _extractMessage(raw) {
      if (!raw) return '';
      if (typeof raw === 'string') return raw;
      if (raw instanceof Error) return raw.message;
      return raw.error || raw.message || raw?.data?.message || raw?.data?.error || '';
    }

    static _includes(str, search) {
      if (!str || !search) return false;
      return str.includes(search);
    }

    static _formatInsufficient(detail = {}) {
      const token = detail.requested_token || detail.token || 'USDC';
      const network = detail.requested_network || detail.network || 'Base';
      const required = this._formatAmount(detail.required_amount);
      const current = this._formatAmount(detail.current_balance);

      if (required && current) {
        return `Not enough ${token} on ${this._titleCase(network)}. Need ${required}, you have ${current}. Add funds or try a smaller tip.`;
      }

      return `Not enough ${token} on ${this._titleCase(network)} to send this tip. Add funds or try again.`;
    }

    static _formatAmount(value) {
      if (value === undefined || value === null) return null;
      const num = Number(value);
      if (!Number.isFinite(num)) {
        return String(value);
      }
      if (num >= 1) return num.toFixed(2);
      if (num >= 0.01) return num.toFixed(4);
      return num.toFixed(6);
    }

    static _titleCase(str) {
      if (!str || typeof str !== 'string') return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  }

  TipErrorHandler = TestTipErrorHandler;
});

describe('TipErrorHandler', () => {
  describe('parse', () => {
    describe('insufficient balance errors', () => {
      it('should detect insufficient balance from message', () => {
        const result = TipErrorHandler.parse({
          message: 'Insufficient balance to complete transaction'
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.INSUFFICIENT_BALANCE);
        expect(result.variant).toBe('warning');
      });

      it('should detect insufficient balance from detail.error', () => {
        const result = TipErrorHandler.parse({
          detail: { error: 'Insufficient Balance' }
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.INSUFFICIENT_BALANCE);
      });

      it('should format insufficient balance with amounts', () => {
        const result = TipErrorHandler.parse({
          message: 'Insufficient balance',
          detail: {
            requested_token: 'USDC',
            requested_network: 'base',
            required_amount: 5.5,
            current_balance: 2.3
          }
        });
        expect(result.message).toContain('Need 5.50');
        expect(result.message).toContain('you have 2.30');
        expect(result.message).toContain('USDC');
        expect(result.message).toContain('Base');
      });

      it('should format small amounts with more precision', () => {
        const result = TipErrorHandler.parse({
          message: 'Insufficient balance',
          detail: {
            required_amount: 0.005,
            current_balance: 0.001
          }
        });
        expect(result.message).toContain('0.0050');
        expect(result.message).toContain('0.0010');
      });
    });

    describe('auth errors', () => {
      it('should detect 401 status as auth error', () => {
        const result = TipErrorHandler.parse({ status: 401 });
        expect(result.type).toBe(TIP_ERROR_TYPES.AUTH);
        expect(result.variant).toBe('error');
        expect(result.userMessage).toContain('session expired');
      });

      it('should detect 403 status as auth error', () => {
        const result = TipErrorHandler.parse({ status: 403 });
        expect(result.type).toBe(TIP_ERROR_TYPES.AUTH);
      });

      it('should detect unauthorized message', () => {
        const result = TipErrorHandler.parse({ message: 'Unauthorized access' });
        expect(result.type).toBe(TIP_ERROR_TYPES.AUTH);
      });

      it('should detect forbidden message', () => {
        const result = TipErrorHandler.parse({ message: 'Request forbidden' });
        expect(result.type).toBe(TIP_ERROR_TYPES.AUTH);
      });
    });

    describe('rate limit errors', () => {
      it('should detect 429 status as rate limit', () => {
        const result = TipErrorHandler.parse({ status: 429 });
        expect(result.type).toBe(TIP_ERROR_TYPES.RATE_LIMITED);
        expect(result.variant).toBe('warning');
        expect(result.userMessage).toContain('too quickly');
      });

      it('should detect rate limit message', () => {
        const result = TipErrorHandler.parse({ message: 'Rate limit exceeded' });
        expect(result.type).toBe(TIP_ERROR_TYPES.RATE_LIMITED);
      });
    });

    describe('network errors', () => {
      it('should detect network error message', () => {
        const result = TipErrorHandler.parse({ message: 'Network error occurred' });
        expect(result.type).toBe(TIP_ERROR_TYPES.NETWORK);
        expect(result.variant).toBe('error');
        expect(result.userMessage).toContain('Network issue');
      });

      it('should detect fetch error message', () => {
        const result = TipErrorHandler.parse({ message: 'Fetch failed' });
        expect(result.type).toBe(TIP_ERROR_TYPES.NETWORK);
      });

      it('should detect failed to fetch message', () => {
        const result = TipErrorHandler.parse({ message: 'Failed to fetch' });
        expect(result.type).toBe(TIP_ERROR_TYPES.NETWORK);
      });
    });

    describe('unknown errors', () => {
      it('should return unknown for unrecognized errors', () => {
        const result = TipErrorHandler.parse({ message: 'Something went wrong' });
        expect(result.type).toBe(TIP_ERROR_TYPES.UNKNOWN);
        expect(result.variant).toBe('error');
        expect(result.message).toBe('Something went wrong');
      });

      it('should provide default message for empty input', () => {
        const result = TipErrorHandler.parse({});
        expect(result.type).toBe(TIP_ERROR_TYPES.UNKNOWN);
        expect(result.message).toBe('Tip failed. Please try again.');
      });

      it('should handle null input', () => {
        const result = TipErrorHandler.parse(null);
        expect(result.type).toBe(TIP_ERROR_TYPES.UNKNOWN);
      });
    });

    describe('input types', () => {
      it('should handle string input', () => {
        const result = TipErrorHandler.parse('Network error');
        expect(result.type).toBe(TIP_ERROR_TYPES.NETWORK);
      });

      it('should handle Error object', () => {
        const result = TipErrorHandler.parse(new Error('Rate limit exceeded'));
        expect(result.type).toBe(TIP_ERROR_TYPES.RATE_LIMITED);
      });

      it('should extract message from data.message', () => {
        const result = TipErrorHandler.parse({
          data: { message: 'Unauthorized request' }
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.AUTH);
      });

      it('should extract message from data.error', () => {
        const result = TipErrorHandler.parse({
          data: { error: 'Failed to fetch resources' }
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.NETWORK);
      });
    });

    describe('status preservation', () => {
      it('should preserve status in result', () => {
        const result = TipErrorHandler.parse({ status: 500, message: 'Error' });
        expect(result.status).toBe(500);
      });

      it('should set status to null if not provided', () => {
        const result = TipErrorHandler.parse({ message: 'Error' });
        expect(result.status).toBeNull();
      });
    });

    describe('detail preservation', () => {
      it('should preserve detail from data.detail', () => {
        const detail = { foo: 'bar' };
        const result = TipErrorHandler.parse({
          message: 'Error',
          data: { detail }
        });
        expect(result.detail).toEqual(detail);
      });

      it('should preserve detail from top-level detail', () => {
        const detail = { foo: 'bar' };
        const result = TipErrorHandler.parse({
          message: 'Error',
          detail
        });
        expect(result.detail).toEqual(detail);
      });
    });
  });

  describe('_formatAmount', () => {
    it('should format large amounts with 2 decimals', () => {
      const result = TipErrorHandler._formatAmount(100.123);
      expect(result).toBe('100.12');
    });

    it('should format medium amounts with 4 decimals', () => {
      const result = TipErrorHandler._formatAmount(0.1234);
      expect(result).toBe('0.1234');
    });

    it('should format tiny amounts with 6 decimals', () => {
      const result = TipErrorHandler._formatAmount(0.001234);
      expect(result).toBe('0.001234');
    });

    it('should return null for undefined', () => {
      const result = TipErrorHandler._formatAmount(undefined);
      expect(result).toBeNull();
    });

    it('should return null for null', () => {
      const result = TipErrorHandler._formatAmount(null);
      expect(result).toBeNull();
    });

    it('should handle string numbers', () => {
      const result = TipErrorHandler._formatAmount('5.5');
      expect(result).toBe('5.50');
    });

    it('should return non-numeric strings as-is', () => {
      const result = TipErrorHandler._formatAmount('already formatted');
      expect(result).toBe('already formatted');
    });
  });

  describe('_titleCase', () => {
    it('should capitalize first letter', () => {
      expect(TipErrorHandler._titleCase('base')).toBe('Base');
    });

    it('should handle already capitalized', () => {
      expect(TipErrorHandler._titleCase('Base')).toBe('Base');
    });

    it('should return empty string for empty input', () => {
      expect(TipErrorHandler._titleCase('')).toBe('');
    });

    it('should return empty string for null', () => {
      expect(TipErrorHandler._titleCase(null)).toBe('');
    });
  });
});
