import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let TipErrorHandler;
let TIP_ERROR_TYPES;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');

  context = {
    window: dom.window,
    document: dom.window.document,
    console: console,
  };
  context.window = context;

  // Load the real TipErrorHandler
  loadBrowserScript('src/utils/tipErrors.js', context);
  TipErrorHandler = context.TipErrorHandler;

  // Define error types for test assertions
  TIP_ERROR_TYPES = {
    INSUFFICIENT_BALANCE: 'insufficient_balance',
    AUTH: 'auth',
    RATE_LIMITED: 'rate_limited',
    NETWORK: 'network',
    ADDRESS_NOT_FOUND: 'address_not_found',
    VALIDATION: 'validation',
    TRANSFER_FAILED: 'transfer_failed',
    UNKNOWN: 'unknown'
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TipErrorHandler', () => {
  describe('parse', () => {
    describe('insufficient balance errors', () => {
      it('should detect insufficient balance from message', () => {
        const result = TipErrorHandler.parse({
          message: 'Insufficient balance to complete transaction',
          detail: {} // detail required to avoid null reference
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.INSUFFICIENT_BALANCE);
        expect(result.variant).toBe('error');
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
        expect(result.variant).toBe('error');
        expect(result.userMessage).toContain('too quickly');
      });

      it('should detect rate limit message', () => {
        const result = TipErrorHandler.parse({ message: 'Rate limit exceeded' });
        expect(result.type).toBe(TIP_ERROR_TYPES.RATE_LIMITED);
      });
    });

    describe('address not found errors', () => {
      it('should detect 404 status as address not found', () => {
        const result = TipErrorHandler.parse({ status: 404 });
        expect(result.type).toBe(TIP_ERROR_TYPES.ADDRESS_NOT_FOUND);
      });

      it('should detect ADDRESS_NOT_FOUND error code', () => {
        const result = TipErrorHandler.parse({
          detail: { error_code: 'ADDRESS_NOT_FOUND' }
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.ADDRESS_NOT_FOUND);
      });

      it('should format Twitter user not found error', () => {
        // Requires 404 status to trigger ADDRESS_NOT_FOUND, then message is formatted
        const result = TipErrorHandler.parse({
          status: 404,
          message: 'Twitter user not found',
          detail: { error_code: 'TWITTER_USER_NOT_FOUND' }
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.ADDRESS_NOT_FOUND);
        expect(result.userMessage).toContain('Twitter user');
      });

      it('should format ENS resolution error', () => {
        const result = TipErrorHandler.parse({
          message: 'Failed to resolve ENS name'
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.ADDRESS_NOT_FOUND);
        expect(result.userMessage).toContain('ENS');
      });

      it('should detect address not found from message', () => {
        const result = TipErrorHandler.parse({
          message: 'Address not found for this user'
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.ADDRESS_NOT_FOUND);
      });
    });

    describe('validation errors', () => {
      it('should detect minimum amount error', () => {
        const result = TipErrorHandler.parse({
          message: 'Amount below minimum: $0.10'
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.VALIDATION);
        expect(result.userMessage).toContain('Minimum');
      });

      it('should detect maximum amount error', () => {
        const result = TipErrorHandler.parse({
          message: 'Amount exceeds maximum: $1000'
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.VALIDATION);
        expect(result.userMessage).toContain('Maximum');
      });

      it('should detect too small after fees error', () => {
        const result = TipErrorHandler.parse({
          message: 'Tip too small after fees'
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.VALIDATION);
      });
    });

    describe('transfer failed errors', () => {
      it('should detect 500 status as transfer failed', () => {
        const result = TipErrorHandler.parse({ status: 500 });
        expect(result.type).toBe(TIP_ERROR_TYPES.TRANSFER_FAILED);
      });

      it('should detect settlement failed message', () => {
        const result = TipErrorHandler.parse({
          message: 'Settlement failed'
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.TRANSFER_FAILED);
      });

      it('should detect TRANSFER_FAILED error code', () => {
        const result = TipErrorHandler.parse({
          detail: { error_code: 'TRANSFER_FAILED' }
        });
        expect(result.type).toBe(TIP_ERROR_TYPES.TRANSFER_FAILED);
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
