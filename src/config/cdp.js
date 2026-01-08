/**
 * CDP (Coinbase Developer Platform) Configuration
 *
 * This configuration is required for CDP authentication flows.
 * Get your project ID from: https://portal.cdp.coinbase.com
 *
 * IMPORTANT: Update CDP_PROJECT_ID before deploying to production.
 */

// CDP Project ID from portal.cdp.coinbase.com
// TODO: Replace with actual project ID from CDP Portal
export const CDP_PROJECT_ID = 'grove-tipping';

// Supported OAuth providers for social login
export const OAUTH_PROVIDERS = ['google', 'apple', 'x'];

// Auth method display names
export const AUTH_METHOD_NAMES = {
  email: 'Email',
  sms: 'Phone',
  google: 'Google',
  apple: 'Apple',
  x: 'X (Twitter)',
};

// OTP configuration
export const OTP_LENGTH = 6;
export const OTP_RESEND_DELAY_SECONDS = 60;
