import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupFetchMock } from './mocks/fetch.js';

// Mock the CDP core SDK
vi.mock('@coinbase/cdp-core', () => ({
  initialize: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithSms: vi.fn(),
  verifyEmailOTP: vi.fn(),
  verifySmsOTP: vi.fn(),
  getAccessToken: vi.fn(),
}));

// Import the mocked module
import * as cdpCore from '@coinbase/cdp-core';

// Import the module under test
import {
  initializeCDP,
  startEmailAuth,
  startSmsAuth,
  verifyOTP,
  exchangeForGroveJWT,
  detectAuthMethod,
} from '../src/auth/cdpAuth.js';

let mockFetch;

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  mockFetch = setupFetchMock();
});

afterEach(() => {
  mockFetch.reset();
});

describe('CDP Auth Module', () => {
  describe('initializeCDP', () => {
    it('should initialize CDP SDK with project ID', async () => {
      await initializeCDP();

      expect(cdpCore.initialize).toHaveBeenCalledWith({
        projectId: 'grove-tipping',
        disableAnalytics: true,
      });
    });

    it('should only initialize once', async () => {
      // Reset the module state by re-importing
      vi.resetModules();
      vi.mock('@coinbase/cdp-core', () => ({
        initialize: vi.fn(),
        signInWithEmail: vi.fn(),
        signInWithSms: vi.fn(),
        verifyEmailOTP: vi.fn(),
        verifySmsOTP: vi.fn(),
        getAccessToken: vi.fn(),
      }));

      const { initializeCDP: freshInit } = await import('../src/auth/cdpAuth.js');
      const { initialize } = await import('@coinbase/cdp-core');

      await freshInit();
      await freshInit();

      // Should only be called once
      expect(initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('startEmailAuth', () => {
    it('should start email auth and return flow result', async () => {
      cdpCore.signInWithEmail.mockResolvedValue({ flowId: 'flow-123' });

      const result = await startEmailAuth('test@example.com');

      expect(result).toEqual({
        flowId: 'flow-123',
        method: 'email',
        destination: 'test@example.com',
      });
      expect(cdpCore.signInWithEmail).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });

  describe('startSmsAuth', () => {
    it('should start SMS auth and return flow result', async () => {
      cdpCore.signInWithSms.mockResolvedValue({ flowId: 'flow-456' });

      const result = await startSmsAuth('+1 (555) 123-4567');

      expect(result).toEqual({
        flowId: 'flow-456',
        method: 'sms',
        destination: '+15551234567', // Normalized
      });
      expect(cdpCore.signInWithSms).toHaveBeenCalledWith({ phoneNumber: '+15551234567' });
    });

    it('should normalize phone numbers', async () => {
      cdpCore.signInWithSms.mockResolvedValue({ flowId: 'flow-789' });

      await startSmsAuth('  +1-555-123-4567  ');

      expect(cdpCore.signInWithSms).toHaveBeenCalledWith({ phoneNumber: '+15551234567' });
    });
  });

  describe('verifyOTP', () => {
    it('should verify email OTP and return access token', async () => {
      cdpCore.verifyEmailOTP.mockResolvedValue(undefined);
      cdpCore.getAccessToken.mockResolvedValue('cdp-access-token-123');

      const token = await verifyOTP('flow-123', '123456', 'email');

      expect(cdpCore.verifyEmailOTP).toHaveBeenCalledWith({ flowId: 'flow-123', otp: '123456' });
      expect(token).toBe('cdp-access-token-123');
    });

    it('should verify SMS OTP and return access token', async () => {
      cdpCore.verifySmsOTP.mockResolvedValue(undefined);
      cdpCore.getAccessToken.mockResolvedValue('cdp-access-token-456');

      const token = await verifyOTP('flow-456', '654321', 'sms');

      expect(cdpCore.verifySmsOTP).toHaveBeenCalledWith({ flowId: 'flow-456', otp: '654321' });
      expect(token).toBe('cdp-access-token-456');
    });

    it('should trim OTP whitespace', async () => {
      cdpCore.verifyEmailOTP.mockResolvedValue(undefined);
      cdpCore.getAccessToken.mockResolvedValue('token');

      await verifyOTP('flow-123', '  123456  ', 'email');

      expect(cdpCore.verifyEmailOTP).toHaveBeenCalledWith({ flowId: 'flow-123', otp: '123456' });
    });

    it('should throw error if no access token returned', async () => {
      cdpCore.verifyEmailOTP.mockResolvedValue(undefined);
      cdpCore.getAccessToken.mockResolvedValue(null);

      await expect(verifyOTP('flow-123', '123456', 'email'))
        .rejects.toThrow('Failed to get access token after OTP verification');
    });
  });

  describe('exchangeForGroveJWT', () => {
    const endpoint = 'https://api.grove.city';

    it('should exchange CDP token for Grove JWT', async () => {
      const mockResponse = {
        account_id: 'acc-123',
        api_key: 'grove-jwt-abc',
        identity_type: 'email',
        identity_value: 'test@example.com',
        address: '0x1234567890abcdef',
        is_new_account: true,
      };

      mockFetch.mockResponse('POST', `${endpoint}/v1/auth/exchange-cdp-token`, mockResponse);

      const result = await exchangeForGroveJWT('cdp-token-xyz', endpoint);

      expect(result).toEqual(mockResponse);
      expect(mockFetch.fetch).toHaveBeenCalledWith(
        `${endpoint}/v1/auth/exchange-cdp-token`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'cdp-token-xyz' }),
        })
      );
    });

    it('should include network parameter when provided', async () => {
      mockFetch.mockResponse('POST', `${endpoint}/v1/auth/exchange-cdp-token`, {
        account_id: 'acc-123',
        api_key: 'jwt',
        is_new_account: false,
      });

      await exchangeForGroveJWT('cdp-token', endpoint, 'base-sepolia');

      expect(mockFetch.fetch).toHaveBeenCalledWith(
        `${endpoint}/v1/auth/exchange-cdp-token`,
        expect.objectContaining({
          body: JSON.stringify({ token: 'cdp-token', network: 'base-sepolia' }),
        })
      );
    });

    it('should throw error on failed exchange', async () => {
      mockFetch.mockResponse(
        'POST',
        `${endpoint}/v1/auth/exchange-cdp-token`,
        { detail: 'Invalid token' },
        { status: 401 }
      );

      await expect(exchangeForGroveJWT('bad-token', endpoint))
        .rejects.toThrow('Invalid token');
    });

    it('should throw generic error if no detail in response', async () => {
      mockFetch.mockResponse(
        'POST',
        `${endpoint}/v1/auth/exchange-cdp-token`,
        {},
        { status: 500 }
      );

      await expect(exchangeForGroveJWT('token', endpoint))
        .rejects.toThrow('Token exchange failed');
    });
  });

  describe('detectAuthMethod', () => {
    it('should detect email addresses', () => {
      expect(detectAuthMethod('test@example.com')).toBe('email');
      expect(detectAuthMethod('user@domain.co.uk')).toBe('email');
      expect(detectAuthMethod('  email@test.org  ')).toBe('email');
    });

    it('should detect phone numbers', () => {
      expect(detectAuthMethod('+15551234567')).toBe('sms');
      expect(detectAuthMethod('+1 555 123 4567')).toBe('sms');
      expect(detectAuthMethod('555-123-4567')).toBe('sms');
      expect(detectAuthMethod('(555) 123-4567')).toBe('sms');
    });

    it('should detect OAuth providers', () => {
      expect(detectAuthMethod('google')).toBe('oauth');
      expect(detectAuthMethod('Google')).toBe('oauth');
      expect(detectAuthMethod('APPLE')).toBe('oauth');
      expect(detectAuthMethod('x')).toBe('oauth');
    });

    it('should return null for invalid input', () => {
      expect(detectAuthMethod('')).toBeNull();
      expect(detectAuthMethod(null)).toBeNull();
      expect(detectAuthMethod(undefined)).toBeNull();
      expect(detectAuthMethod('random text')).toBeNull();
      expect(detectAuthMethod('123')).toBeNull(); // Too short for phone
    });

    it('should require minimum phone number length', () => {
      expect(detectAuthMethod('12345')).toBeNull(); // Too short
      expect(detectAuthMethod('1234567890')).toBe('sms'); // 10 digits is OK
    });
  });
});
