// JWT Storage Keys (must match keyManager.js)
const JWT_STORAGE = {
  PRODUCTION: 'GROVE_JWT_PRODUCTION',
  TESTNET: 'GROVE_JWT_TESTNET',
  LOCAL: 'GROVE_JWT_LOCALHOST',
  LEGACY: 'GROVE_API_JWT'
};

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
