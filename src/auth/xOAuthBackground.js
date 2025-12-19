/**
 * X (Twitter) OAuth 2.0 Background Handler
 * Handles OAuth PKCE flow for X authentication in the service worker
 */

const X_AUTH_CONFIG = {
  CLIENT_ID: 'UHQwQXlCRFZHY1F1VmZ3RmVXU0Y6MTpjaQ',
  get REDIRECT_URI() {
    return `https://${chrome.runtime.id}.chromiumapp.org/callback`;
  },
  SCOPES: ['tweet.read', 'tweet.write', 'users.read', 'like.write', 'offline.access'],
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'GROVE_X_ACCESS_TOKEN',
    REFRESH_TOKEN: 'GROVE_X_REFRESH_TOKEN',
    USER_INFO: 'GROVE_X_USER_INFO',
    TOKEN_EXPIRY: 'GROVE_X_TOKEN_EXPIRY',
  }
};

/**
 * Generate a random code verifier for PKCE
 * @returns {string}
 */
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate code challenge from verifier using SHA-256
 * @param {string} verifier
 * @returns {Promise<string>}
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate random state parameter for CSRF protection
 * @returns {string}
 */
function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Handle the X OAuth login flow
 * @returns {Promise<{success: boolean, userInfo: Object}>}
 */
async function handleXLogin() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Build authorization URL
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', X_AUTH_CONFIG.CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', X_AUTH_CONFIG.REDIRECT_URI);
  authUrl.searchParams.set('scope', X_AUTH_CONFIG.SCOPES.join(' '));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl.toString(),
        interactive: true,
      },
      async (redirectUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!redirectUrl) {
          reject(new Error('No redirect URL received'));
          return;
        }

        try {
          const url = new URL(redirectUrl);
          const code = url.searchParams.get('code');
          const returnedState = url.searchParams.get('state');
          const error = url.searchParams.get('error');

          if (error) {
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (returnedState !== state) {
            reject(new Error('State mismatch - possible CSRF attack'));
            return;
          }

          if (!code) {
            reject(new Error('No authorization code received'));
            return;
          }

          // Exchange code for tokens
          const tokens = await exchangeCodeForTokens(code, codeVerifier);
          console.log('[Grove X Auth] Token response:', {
            hasAccessToken: !!tokens.access_token,
            tokenType: tokens.token_type,
            scope: tokens.scope,
            expiresIn: tokens.expires_in
          });

          // Try to get user info (optional - might fail on free tier)
          let userInfo = { id: 'unknown', username: 'Connected' };
          try {
            userInfo = await getXUserInfo(tokens.access_token);
          } catch (userInfoError) {
            console.warn('[Grove X Auth] Could not fetch user info (this is OK for free tier):', userInfoError.message);
          }

          // Store tokens and user info
          await storeXTokens(tokens, userInfo);

          resolve({ success: true, userInfo });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Exchange authorization code for access/refresh tokens
 * @param {string} code - Authorization code
 * @param {string} codeVerifier - PKCE code verifier
 * @returns {Promise<Object>}
 */
async function exchangeCodeForTokens(code, codeVerifier) {
  console.log('[Grove X Auth] Exchanging code for tokens...');
  const tokenUrl = 'https://api.twitter.com/2/oauth2/token';

  const params = new URLSearchParams();
  params.set('grant_type', 'authorization_code');
  params.set('code', code);
  params.set('redirect_uri', X_AUTH_CONFIG.REDIRECT_URI);
  params.set('client_id', X_AUTH_CONFIG.CLIENT_ID);
  params.set('code_verifier', codeVerifier);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Grove X Auth] Token exchange failed:', response.status, errorText);
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const tokens = await response.json();
  console.log('[Grove X Auth] Token exchange successful, scopes:', tokens.scope);
  return tokens;
}

/**
 * Fetch user info from X API
 * @param {string} accessToken
 * @returns {Promise<Object>}
 */
async function getXUserInfo(accessToken) {
  console.log('[Grove X Auth] Fetching user info...');

  const response = await fetch('https://api.twitter.com/2/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Grove X Auth] User info failed:', response.status, errorText);
    throw new Error(`Failed to get user info: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Grove X Auth] User info received:', data.data?.username);
  return data.data;
}

/**
 * Store tokens and user info in chrome.storage
 * @param {Object} tokens - Token response from X API
 * @param {Object} userInfo - User info from X API
 */
async function storeXTokens(tokens, userInfo) {
  const expiry = Date.now() + (tokens.expires_in * 1000);

  await chrome.storage.local.set({
    [X_AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN]: tokens.access_token,
    [X_AUTH_CONFIG.STORAGE_KEYS.REFRESH_TOKEN]: tokens.refresh_token,
    [X_AUTH_CONFIG.STORAGE_KEYS.USER_INFO]: userInfo,
    [X_AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY]: expiry,
  });
}

// Export to global scope for service worker
if (typeof self !== 'undefined') {
  self.X_AUTH_CONFIG = X_AUTH_CONFIG;
  self.handleXLogin = handleXLogin;
  self.generateCodeVerifier = generateCodeVerifier;
  self.generateCodeChallenge = generateCodeChallenge;
  self.generateState = generateState;
  self.exchangeCodeForTokens = exchangeCodeForTokens;
  self.getXUserInfo = getXUserInfo;
  self.storeXTokens = storeXTokens;
}
