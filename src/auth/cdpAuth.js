/**
 * CDP Authentication Module
 *
 * Handles Email OTP, SMS OTP, and Social OAuth flows for human authentication.
 * After successful auth, exchanges CDP token for Grove JWT.
 *
 * This is the "CDP Auth Hijack" flow:
 * 1. User authenticates via CDP SDK (Email/SMS/Social)
 * 2. CDP returns an access token (+ creates an embedded wallet we ignore)
 * 3. We exchange the CDP token for a Grove JWT
 * 4. Grove creates a Server Wallet for the user (the hijack)
 *
 * Reference: https://docs.cdp.coinbase.com/embedded-wallets/authentication-methods
 */

import {
  initialize,
  signInWithEmail,
  signInWithSms,
  verifyEmailOTP,
  verifySmsOTP,
  getAccessToken,
  signOut,
} from '@coinbase/cdp-core';

import { CDP_PROJECT_ID } from '../config/cdp.js';

// Track initialization state
let isInitialized = false;

/**
 * Initialize the CDP SDK
 * Must be called before any auth operations
 */
export async function initializeCDP() {
  if (isInitialized) {
    return;
  }

  if (!CDP_PROJECT_ID) {
    throw new Error('CDP_PROJECT_ID is not configured');
  }

  await initialize({
    projectId: CDP_PROJECT_ID,
    disableAnalytics: true,
  });

  isInitialized = true;
  console.log('[CDPAuth] SDK initialized');
}

/**
 * Sign out current CDP session
 * Call this to clear any existing auth state before starting a new flow
 */
export async function signOutCDP() {
  try {
    await initializeCDP();
    await signOut();
    console.log('[CDPAuth] Signed out successfully');
  } catch (error) {
    // Ignore errors - user might not be signed in
    console.log('[CDPAuth] Sign out (may not have been signed in):', error.message);
  }
}

/**
 * Start email OTP authentication flow
 * @param {string} email - User's email address
 * @returns {Promise<{flowId: string, method: 'email'}>}
 */
export async function startEmailAuth(email) {
  await initializeCDP();

  // Clear any existing session first
  await signOutCDP();

  console.log('[CDPAuth] Starting email auth for:', email);
  const result = await signInWithEmail({ email });

  return {
    flowId: result.flowId,
    method: 'email',
    destination: email,
  };
}

/**
 * Start SMS OTP authentication flow
 * @param {string} phoneNumber - User's phone number (with country code)
 * @returns {Promise<{flowId: string, method: 'sms'}>}
 */
export async function startSmsAuth(phoneNumber) {
  await initializeCDP();

  // Clear any existing session first
  await signOutCDP();

  // Normalize phone number to E.164 format (e.g., +14155551234)
  let normalizedPhone = phoneNumber.replace(/[\s\-()]/g, '');

  // Ensure + prefix for international format
  if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = '+' + normalizedPhone;
  }

  console.log('[CDPAuth] Starting SMS auth for:', normalizedPhone);
  const result = await signInWithSms({ phoneNumber: normalizedPhone });

  return {
    flowId: result.flowId,
    method: 'sms',
    destination: normalizedPhone,
  };
}

/**
 * Verify OTP code and get CDP access token
 * @param {string} flowId - Flow ID from startEmailAuth or startSmsAuth
 * @param {string} otp - 6-digit OTP code
 * @param {'email' | 'sms'} method - Auth method
 * @returns {Promise<string>} CDP access token
 */
export async function verifyOTP(flowId, otp, method) {
  // Ensure SDK is initialized (needed after popup close/reopen)
  await initializeCDP();

  console.log('[CDPAuth] Verifying OTP for method:', method);

  // Verify the OTP
  if (method === 'email') {
    await verifyEmailOTP({ flowId, otp: otp.trim() });
  } else {
    await verifySmsOTP({ flowId, otp: otp.trim() });
  }

  // Get the access token
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Failed to get access token after OTP verification');
  }

  console.log('[CDPAuth] OTP verified, got access token');
  return token;
}

/**
 * Exchange CDP access token for Grove JWT
 * @param {string} cdpToken - CDP access token
 * @param {string} endpoint - Grove API endpoint (e.g., 'https://api.grove.city')
 * @param {string} [network] - Optional network override
 * @returns {Promise<CDPTokenExchangeResponse>}
 *
 * @typedef {Object} CDPTokenExchangeResponse
 * @property {string} account_id - Grove account ID
 * @property {string} api_key - Grove JWT ("Forever JWT")
 * @property {string} identity_type - 'email' | 'sms' | 'cdp_sub'
 * @property {string} identity_value - The normalized identity value
 * @property {string|null} address - Server wallet address
 * @property {string|null} onchain_address - Alias for address
 * @property {boolean} is_new_account - True if account was just created
 */
export async function exchangeForGroveJWT(cdpToken, endpoint, network = null) {
  console.log('[CDPAuth] Exchanging CDP token for Grove JWT');

  const body = { token: cdpToken };
  if (network) {
    body.network = network;
  }

  const response = await fetch(`${endpoint}/v1/auth/exchange-cdp-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = 'Token exchange failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.log('[CDPAuth] Token exchanged successfully, is_new_account:', result.is_new_account);

  return result;
}

/**
 * Detect auth method from user input
 * @param {string} input - Email, phone number, or OAuth provider
 * @returns {'email' | 'sms' | 'oauth' | null}
 */
export function detectAuthMethod(input) {
  if (!input) return null;

  const trimmed = input.trim().toLowerCase();

  // Check for OAuth providers
  if (['google', 'apple', 'x'].includes(trimmed)) {
    return 'oauth';
  }

  // Check for email
  if (trimmed.includes('@')) {
    return 'email';
  }

  // Check for phone number (starts with + or contains only digits/spaces/dashes)
  if (/^\+?[\d\s\-()]+$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 10) {
    return 'sms';
  }

  return null;
}

/**
 * Full authentication flow helper
 * Combines startAuth -> verifyOTP -> exchangeToken
 *
 * @param {Object} options
 * @param {string} options.destination - Email or phone number
 * @param {string} options.endpoint - Grove API endpoint
 * @param {function} options.onOtpRequired - Callback to get OTP from user
 * @returns {Promise<CDPTokenExchangeResponse>}
 */
export async function authenticateWithOTP({ destination, endpoint, onOtpRequired }) {
  const method = detectAuthMethod(destination);

  if (method !== 'email' && method !== 'sms') {
    throw new Error('Invalid destination. Must be email or phone number.');
  }

  // Start auth flow
  let flowResult;
  if (method === 'email') {
    flowResult = await startEmailAuth(destination);
  } else {
    flowResult = await startSmsAuth(destination);
  }

  // Get OTP from user
  const otp = await onOtpRequired(flowResult);

  // Verify OTP and get CDP token
  const cdpToken = await verifyOTP(flowResult.flowId, otp, method);

  // Exchange for Grove JWT
  const groveResult = await exchangeForGroveJWT(cdpToken, endpoint);

  return groveResult;
}

// Export for use in browser context
if (typeof window !== 'undefined') {
  window.CDPAuth = {
    initializeCDP,
    signOutCDP,
    startEmailAuth,
    startSmsAuth,
    verifyOTP,
    exchangeForGroveJWT,
    detectAuthMethod,
    authenticateWithOTP,
  };
}
