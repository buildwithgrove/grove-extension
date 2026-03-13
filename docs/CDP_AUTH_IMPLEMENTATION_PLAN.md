# CDP Human Auth Implementation Plan

## Overview

Integrate CDP Auth into the Grove extension to allow human users to sign up/login via Email OTP, SMS OTP, or Social Login (Google, Apple, X).

**Branch:** `feature/cdp-human-auth`

**Backend Status:** ✅ Fully implemented
- Endpoint: `POST /v1/auth/exchange-cdp-token`
- Request: `{ token: string, network?: string }`
- Response: `{ account_id, api_key, identity_type, identity_value, address, is_new_account }`

---

## Architecture Decision

### Option A: Bundle CDP SDK into Extension (Recommended)
- Use esbuild/rollup to bundle `@coinbase/cdp-core`
- Smaller bundle, works offline for OTP verification
- Similar to how `scripts/auth_client/` works in the API repo

### Option B: Load CDP SDK from CDN
- Simpler setup, no build step changes
- Requires network for SDK load
- May have CSP issues in extension context

**Decision:** Option A - Bundle the SDK for reliability

---

## Implementation Tasks

### Phase 1: Build Setup

#### 1.1 Add CDP SDK dependency
```bash
npm install @coinbase/cdp-core esbuild
```

#### 1.2 Create build script for CDP bundle
```javascript
// scripts/build-cdp-bundle.js
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/auth/cdpAuth.js'],
  bundle: true,
  outfile: 'dist/cdp-auth-bundle.js',
  format: 'iife',
  globalName: 'CDPAuth',
  platform: 'browser',
});
```

#### 1.3 Update package.json
```json
{
  "scripts": {
    "build:cdp": "node scripts/build-cdp-bundle.js",
    "build": "npm run build:cdp"
  }
}
```

---

### Phase 2: CDP Auth Module

#### 2.1 Create `src/auth/cdpAuth.js`

```javascript
/**
 * CDP Authentication Module
 *
 * Handles Email OTP, SMS OTP, and Social OAuth flows.
 * After successful auth, exchanges CDP token for Grove JWT.
 */

import {
  initialize,
  signInWithEmail,
  signInWithSms,
  verifyEmailOTP,
  verifySmsOTP,
  getAccessToken,
} from '@coinbase/cdp-core';

const CDP_PROJECT_ID = 'YOUR_PROJECT_ID'; // TODO: Move to config

export async function initializeCDP() {
  await initialize({
    projectId: CDP_PROJECT_ID,
    disableAnalytics: true,
  });
}

export async function startEmailAuth(email) {
  const result = await signInWithEmail({ email });
  return { flowId: result.flowId, method: 'email' };
}

export async function startSmsAuth(phoneNumber) {
  const result = await signInWithSms({ phoneNumber });
  return { flowId: result.flowId, method: 'sms' };
}

export async function verifyOTP(flowId, otp, method) {
  if (method === 'email') {
    await verifyEmailOTP({ flowId, otp });
  } else {
    await verifySmsOTP({ flowId, otp });
  }

  // Get the CDP access token
  const token = await getAccessToken();
  return token;
}

export async function exchangeForGroveJWT(cdpToken, endpoint) {
  const response = await fetch(`${endpoint}/v1/auth/exchange-cdp-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: cdpToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Token exchange failed');
  }

  return response.json();
}
```

#### 2.2 Create `src/auth/cdpOAuth.js` (for Social Login)

```javascript
/**
 * CDP OAuth Flow for Social Login
 *
 * Opens a popup window for OAuth, captures the token via message passing.
 */

export function startOAuthFlow(provider, projectId) {
  return new Promise((resolve, reject) => {
    // Create OAuth URL
    const redirectUri = chrome.identity.getRedirectURL('callback');
    const authUrl = buildOAuthUrl(provider, projectId, redirectUri);

    // Use chrome.identity.launchWebAuthFlow for extension context
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        // Extract token from response URL
        const token = extractTokenFromUrl(responseUrl);
        resolve(token);
      }
    );
  });
}
```

---

### Phase 3: Popup UI Changes

#### 3.1 Update `popup.html` - Add auth section to onboarding state

```html
<!-- In onboardingState section -->
<div id="authMethodSelector" class="auth-methods">
  <h3>Sign in to Grove</h3>

  <button id="emailAuthBtn" class="auth-btn">
    <span class="icon">📧</span>
    Continue with Email
  </button>

  <button id="smsAuthBtn" class="auth-btn">
    <span class="icon">📱</span>
    Continue with Phone
  </button>

  <div class="divider">or</div>

  <button id="googleAuthBtn" class="auth-btn social">
    <span class="icon">G</span>
    Continue with Google
  </button>

  <div class="divider">or</div>

  <a href="https://grove.city" target="_blank" class="auth-link">
    Sign in with Wallet →
  </a>
</div>

<!-- OTP Input Modal -->
<div id="otpModal" class="modal hidden">
  <div class="modal-content">
    <h3 id="otpTitle">Enter verification code</h3>
    <p id="otpSubtitle">We sent a code to your email</p>
    <input type="text" id="otpInput" maxlength="6" placeholder="000000" />
    <button id="verifyOtpBtn" class="primary-btn">Verify</button>
    <button id="cancelOtpBtn" class="secondary-btn">Cancel</button>
  </div>
</div>

<!-- Email/Phone Input Modal -->
<div id="identityModal" class="modal hidden">
  <div class="modal-content">
    <h3 id="identityTitle">Enter your email</h3>
    <input type="text" id="identityInput" placeholder="you@example.com" />
    <button id="sendCodeBtn" class="primary-btn">Send Code</button>
    <button id="cancelIdentityBtn" class="secondary-btn">Cancel</button>
  </div>
</div>
```

#### 3.2 Add styles to `popup.css`

```css
/* Auth Methods */
.auth-methods {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
}

.auth-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: var(--font-size-md);
  transition: background 0.2s;
}

.auth-btn:hover {
  background: var(--bg-tertiary);
}

.auth-btn.social {
  background: var(--bg-primary);
}

.divider {
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

/* OTP Modal */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal.hidden {
  display: none;
}

.modal-content {
  background: var(--bg-primary);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  width: 280px;
  text-align: center;
}

#otpInput {
  font-size: 24px;
  text-align: center;
  letter-spacing: 8px;
  padding: var(--spacing-md);
  width: 100%;
  margin: var(--spacing-md) 0;
}
```

#### 3.3 Update `popup.js` - Add CDP auth handlers

```javascript
// CDP Auth Elements
const emailAuthBtn = document.getElementById('emailAuthBtn');
const smsAuthBtn = document.getElementById('smsAuthBtn');
const googleAuthBtn = document.getElementById('googleAuthBtn');
const otpModal = document.getElementById('otpModal');
const otpInput = document.getElementById('otpInput');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const identityModal = document.getElementById('identityModal');
const identityInput = document.getElementById('identityInput');
const sendCodeBtn = document.getElementById('sendCodeBtn');

let currentAuthFlow = null; // { flowId, method: 'email' | 'sms' }

// Email Auth Flow
emailAuthBtn?.addEventListener('click', () => {
  document.getElementById('identityTitle').textContent = 'Enter your email';
  identityInput.placeholder = 'you@example.com';
  identityInput.type = 'email';
  identityModal.classList.remove('hidden');
  currentAuthFlow = { method: 'email' };
});

// SMS Auth Flow
smsAuthBtn?.addEventListener('click', () => {
  document.getElementById('identityTitle').textContent = 'Enter your phone number';
  identityInput.placeholder = '+1 555 123 4567';
  identityInput.type = 'tel';
  identityModal.classList.remove('hidden');
  currentAuthFlow = { method: 'sms' };
});

// Send OTP
sendCodeBtn?.addEventListener('click', async () => {
  const identity = identityInput.value.trim();
  if (!identity) return;

  try {
    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = 'Sending...';

    await CDPAuth.initializeCDP();

    let result;
    if (currentAuthFlow.method === 'email') {
      result = await CDPAuth.startEmailAuth(identity);
    } else {
      result = await CDPAuth.startSmsAuth(identity);
    }

    currentAuthFlow.flowId = result.flowId;
    currentAuthFlow.identity = identity;

    // Show OTP modal
    identityModal.classList.add('hidden');
    document.getElementById('otpSubtitle').textContent =
      `We sent a code to ${identity}`;
    otpModal.classList.remove('hidden');
    otpInput.focus();

  } catch (error) {
    console.error('Failed to send OTP:', error);
    alert('Failed to send verification code. Please try again.');
  } finally {
    sendCodeBtn.disabled = false;
    sendCodeBtn.textContent = 'Send Code';
  }
});

// Verify OTP
verifyOtpBtn?.addEventListener('click', async () => {
  const otp = otpInput.value.trim();
  if (!otp || otp.length !== 6) return;

  try {
    verifyOtpBtn.disabled = true;
    verifyOtpBtn.textContent = 'Verifying...';

    // Verify OTP and get CDP token
    const cdpToken = await CDPAuth.verifyOTP(
      currentAuthFlow.flowId,
      otp,
      currentAuthFlow.method
    );

    // Exchange for Grove JWT
    const endpoint = await getActiveEndpoint();
    const result = await CDPAuth.exchangeForGroveJWT(cdpToken, endpoint);

    // Save JWT
    const slot = getSlotForEndpoint(endpoint);
    await saveJwtToSlot(slot, result.api_key);

    // Update UI
    otpModal.classList.add('hidden');
    await refreshUIState();

    // Show success
    showToast(result.is_new_account
      ? 'Account created!'
      : 'Welcome back!');

  } catch (error) {
    console.error('Verification failed:', error);
    alert('Verification failed. Please check the code and try again.');
  } finally {
    verifyOtpBtn.disabled = false;
    verifyOtpBtn.textContent = 'Verify';
  }
});

// Google OAuth
googleAuthBtn?.addEventListener('click', async () => {
  try {
    const cdpToken = await CDPAuth.startOAuthFlow('google', CDP_PROJECT_ID);

    const endpoint = await getActiveEndpoint();
    const result = await CDPAuth.exchangeForGroveJWT(cdpToken, endpoint);

    const slot = getSlotForEndpoint(endpoint);
    await saveJwtToSlot(slot, result.api_key);

    await refreshUIState();
    showToast(result.is_new_account ? 'Account created!' : 'Welcome back!');

  } catch (error) {
    console.error('Google auth failed:', error);
    alert('Google sign-in failed. Please try again.');
  }
});
```

---

### Phase 4: Configuration

#### 4.1 Add CDP config to `src/config/cdp.js`

```javascript
/**
 * CDP Configuration
 */

// CDP Project ID from portal.cdp.coinbase.com
export const CDP_PROJECT_ID = 'grove-tipping'; // TODO: Get actual project ID

// Supported OAuth providers
export const OAUTH_PROVIDERS = ['google', 'apple', 'x'];
```

#### 4.2 Update manifest.json

Add required permissions and externally_connectable for OAuth:

```json
{
  "permissions": ["storage", "identity"],
  "externally_connectable": {
    "matches": [
      "http://localhost:*/*",
      "https://grove.city/*",
      "https://testnet.grove.city/*",
      "https://login.coinbase.com/*"
    ]
  }
}
```

---

### Phase 5: Testing

#### 5.1 Unit tests for CDP auth module

```javascript
// tests/unit/cdpAuth.test.js
import { describe, it, expect, vi } from 'vitest';

describe('CDP Auth', () => {
  it('should exchange CDP token for Grove JWT', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        account_id: 'test-123',
        api_key: 'grove-jwt-xxx',
        identity_type: 'email',
        identity_value: 'test@example.com',
        is_new_account: true,
      }),
    });

    const result = await exchangeForGroveJWT('cdp-token', 'https://api.grove.city');

    expect(result.api_key).toBe('grove-jwt-xxx');
    expect(result.is_new_account).toBe(true);
  });
});
```

#### 5.2 E2E test with Playwright

```javascript
// tests/e2e/cdp-auth.spec.js
import { test, expect } from '@playwright/test';

test('email OTP flow shows correct UI states', async ({ page, context }) => {
  // Load extension popup
  const extensionId = 'YOUR_EXTENSION_ID';
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // Click email auth
  await page.click('#emailAuthBtn');

  // Should show identity modal
  await expect(page.locator('#identityModal')).toBeVisible();
  await expect(page.locator('#identityTitle')).toHaveText('Enter your email');
});
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `@coinbase/cdp-core`, `esbuild` |
| `scripts/build-cdp-bundle.js` | Create | Build script for CDP SDK bundle |
| `src/auth/cdpAuth.js` | Create | CDP auth module (OTP flows) |
| `src/auth/cdpOAuth.js` | Create | OAuth flow for social login |
| `src/config/cdp.js` | Create | CDP configuration |
| `popup.html` | Modify | Add auth UI elements |
| `popup.css` | Modify | Add auth styles |
| `popup.js` | Modify | Add CDP auth handlers |
| `manifest.json` | Modify | Add OAuth permissions |
| `tests/unit/cdpAuth.test.js` | Create | Unit tests |
| `tests/e2e/cdp-auth.spec.js` | Create | E2E tests |

---

## Environment Variables / Configuration

| Variable | Description | Where |
|----------|-------------|-------|
| `CDP_PROJECT_ID` | CDP Portal project ID | `src/config/cdp.js` |

Note: The extension doesn't need CDP API keys - those are only needed on the backend for token verification.

---

## Rollout Plan

1. **Dev Testing**: Test locally with `make api_run` on localhost
2. **Testnet**: Deploy to testnet, test with real email/SMS
3. **Production**: After testnet validation, deploy to Chrome Web Store

---

## Open Questions

1. **CDP Project ID**: Need to get the actual project ID from CDP Portal
2. **OAuth Redirect URI**: Need to add extension's redirect URI to CDP Portal
3. **Rate Limits**: What are CDP's rate limits for OTP sends?
4. **Error Messages**: What user-friendly errors should we show for common failures?

---

## References

- [CDP Authentication Methods](https://docs.cdp.coinbase.com/embedded-wallets/authentication-methods)
- [API auth_flow.ts](../api/scripts/auth_client/auth_flow.ts) - Reference implementation
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
