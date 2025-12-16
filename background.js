// Import update checker
importScripts('src/utils/updateChecker.js');

// JWT Storage Keys (must match keyManager.js)
const JWT_STORAGE = {
  PRODUCTION: 'GROVE_JWT_PRODUCTION',
  TESTNET: 'GROVE_JWT_TESTNET',
  LOCAL: 'GROVE_JWT_LOCALHOST',
  LEGACY: 'GROVE_API_JWT'
};

// Update check alarm name
const UPDATE_CHECK_ALARM = 'grove-update-check';

// Listen for internal messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Clear update badge when user dismisses update notification
  if (message.type === 'CLEAR_UPDATE_BADGE') {
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
    return true;
  }

  // X (Twitter) OAuth Login
  if (message.type === 'X_LOGIN') {
    handleXLogin().then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
});

// Listen for messages from external web pages (e.g., localhost, testnet, production)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('Received external message from:', sender.origin);

  if (message.type === 'SET_JWT') {
    // Determine which slot to store the JWT in based on environment
    // Accept both 'local' and 'localhost' for local development
    const env = message.environment === 'local' ? 'localhost' : (message.environment || 'production');
    let jwtStorageKey;
    if (env === 'localhost') {
      jwtStorageKey = JWT_STORAGE.LOCAL;
    } else if (env === 'testnet') {
      jwtStorageKey = JWT_STORAGE.TESTNET;
    } else {
      jwtStorageKey = JWT_STORAGE.PRODUCTION;
    }

    // Both localhost and testnet use Base Sepolia; production uses Base mainnet
    const isNonProduction = env === 'testnet' || env === 'localhost';

    const dataToStore = {
      [jwtStorageKey]: message.jwt,
      groveEndpoint: env,
      groveChain: isNonProduction ? 'base-sepolia' : 'base'
    };

    // Auto-switch developer mode based on environment
    if (isNonProduction) {
      dataToStore.groveEnvironment = 'local'; // Enable dev mode for testnet/local
      console.log(`${env} JWT received - enabling developer mode`);
    } else {
      dataToStore.groveEnvironment = 'prod'; // Disable dev mode for production
      console.log('Production JWT received - disabling developer mode');
    }

    // Clear cached balances and user data when switching accounts
    dataToStore.GROVE_LAST_BALANCES = {};

    chrome.storage.local.set(dataToStore, () => {
      console.log(`JWT stored in ${env} slot`);
      sendResponse({
        success: true,
        environment: env,
        devModeEnabled: isNonProduction
      });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_JWT') {
    // Return JWT based on requested environment or current dev mode state
    chrome.storage.local.get(['groveEnvironment', 'groveEndpoint', JWT_STORAGE.PRODUCTION, JWT_STORAGE.TESTNET, JWT_STORAGE.LOCAL], (result) => {
      const isDevMode = result.groveEnvironment === 'local';
      const endpoint = result.groveEndpoint || 'production';
      // Normalize 'local' to 'localhost'
      const reqEnv = message.environment === 'local' ? 'localhost' : message.environment;

      let jwt;
      if (reqEnv === 'localhost') {
        jwt = result[JWT_STORAGE.LOCAL];
      } else if (reqEnv === 'testnet') {
        jwt = result[JWT_STORAGE.TESTNET];
      } else if (reqEnv === 'production') {
        jwt = result[JWT_STORAGE.PRODUCTION];
      } else {
        // No environment specified - use current endpoint
        if (endpoint === 'localhost') {
          jwt = result[JWT_STORAGE.LOCAL];
        } else if (endpoint === 'testnet') {
          jwt = result[JWT_STORAGE.TESTNET];
        } else {
          jwt = result[JWT_STORAGE.PRODUCTION];
        }
      }
      sendResponse({ jwt: jwt || null, isDevMode, environment: endpoint });
    });
    return true;
  }

  if (message.type === 'PING') {
    // Check if there's a JWT for the requested environment (or current mode if not specified)
    chrome.storage.local.get(['groveEnvironment', 'groveEndpoint', JWT_STORAGE.PRODUCTION, JWT_STORAGE.TESTNET, JWT_STORAGE.LOCAL], (result) => {
      const isDevMode = result.groveEnvironment === 'local';
      const endpoint = result.groveEndpoint || 'production';
      // Normalize 'local' to 'localhost'
      const reqEnv = message.environment === 'local' ? 'localhost' : message.environment;

      // If environment is specified, check that specific slot
      // Otherwise fall back to current endpoint
      let jwt;
      if (reqEnv === 'localhost') {
        jwt = result[JWT_STORAGE.LOCAL];
      } else if (reqEnv === 'testnet') {
        jwt = result[JWT_STORAGE.TESTNET];
      } else if (reqEnv === 'production') {
        jwt = result[JWT_STORAGE.PRODUCTION];
      } else {
        // No environment specified - use current endpoint
        if (endpoint === 'localhost') {
          jwt = result[JWT_STORAGE.LOCAL];
        } else if (endpoint === 'testnet') {
          jwt = result[JWT_STORAGE.TESTNET];
        } else {
          jwt = result[JWT_STORAGE.PRODUCTION];
        }
      }

      const hasKey = !!(jwt && jwt.length > 0);
      sendResponse({ hasKey, isDevMode, environment: reqEnv || endpoint });
    });
    return true;
  }

  if (message.type === 'OPEN_POPUP') {
    const chromeVersion = parseInt(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '0');

    if (chromeVersion >= 127 && chrome.action.openPopup) {
      chrome.action.openPopup()
        .then(() => sendResponse({ success: true, opened: true }))
        .catch(() => sendResponse({ success: true, opened: false, reason: 'popup_blocked' }));
    } else {
      sendResponse({ success: true, opened: false, reason: 'unsupported_version', chromeVersion });
    }
    return true;
  }

  if (message.type === 'OPEN_POPUP_TO_X_SETTINGS') {
    // Store flag to open X settings when popup opens
    chrome.storage.local.set({ openToXSettings: true });

    const chromeVersion = parseInt(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '0');

    if (chromeVersion >= 127 && chrome.action.openPopup) {
      chrome.action.openPopup()
        .then(() => sendResponse({ success: true, opened: true }))
        .catch(() => sendResponse({ success: true, opened: false, reason: 'popup_blocked' }));
    } else {
      sendResponse({ success: true, opened: false, reason: 'unsupported_version', chromeVersion });
    }
    return true;
  }

  if (message.type === 'CHECK_OPEN_TO_X_SETTINGS') {
    chrome.storage.local.get(['openToXSettings'], (result) => {
      if (result.openToXSettings) {
        chrome.storage.local.remove('openToXSettings');
        sendResponse({ shouldOpen: true });
      } else {
        sendResponse({ shouldOpen: false });
      }
    });
    return true;
  }

  sendResponse({ error: 'Unknown message type' });
});

// X (Twitter) OAuth 2.0 Login Handler
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

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

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

async function storeXTokens(tokens, userInfo) {
  const expiry = Date.now() + (tokens.expires_in * 1000);

  await chrome.storage.local.set({
    [X_AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN]: tokens.access_token,
    [X_AUTH_CONFIG.STORAGE_KEYS.REFRESH_TOKEN]: tokens.refresh_token,
    [X_AUTH_CONFIG.STORAGE_KEYS.USER_INFO]: userInfo,
    [X_AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRY]: expiry,
  });
}

// ============================================================================
// Update Checker - Background Check with Badge Notification
// ============================================================================

/**
 * Check for updates and update badge accordingly
 */
async function checkForUpdatesBackground() {
  if (typeof UpdateChecker === 'undefined') {
    console.warn('[Grove Background] UpdateChecker not available');
    return;
  }

  try {
    const result = await UpdateChecker.checkForUpdate();

    if (result.available) {
      // Show badge to indicate update available
      await chrome.action.setBadgeText({ text: '1' });
      await chrome.action.setBadgeBackgroundColor({ color: '#389f58' });
      console.log(`[Grove Background] Update available: v${result.version}`);
    } else {
      // Clear badge if no update
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('[Grove Background] Error checking for updates:', error);
  }
}

/**
 * Set up periodic update check alarm
 */
async function setupUpdateCheckAlarm() {
  // Create alarm to check every 4 hours
  await chrome.alarms.create(UPDATE_CHECK_ALARM, {
    periodInMinutes: 240, // 4 hours
  });

  // Also check immediately on startup
  checkForUpdatesBackground();
}

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_CHECK_ALARM) {
    checkForUpdatesBackground();
  }
});

// Set up alarm on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  setupUpdateCheckAlarm();
});

// Set up alarm on service worker startup (in case it was terminated)
chrome.runtime.onStartup.addListener(() => {
  setupUpdateCheckAlarm();
});

// Also run setup immediately when service worker loads
// This handles the case where service worker restarts
setupUpdateCheckAlarm();
