// JWT Storage Keys (must match keyManager.js)
const JWT_STORAGE = {
  PRODUCTION: 'GROVE_JWT_PRODUCTION',
  TESTNET: 'GROVE_JWT_TESTNET',
  LEGACY: 'GROVE_API_JWT'
};

// Listen for messages from external web pages (e.g., localhost:3000)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('Received external message from:', sender.origin);

  if (message.type === 'SET_JWT') {
    // Determine which slot to store the JWT in based on environment
    const isTestnet = message.environment === 'testnet';
    const jwtStorageKey = isTestnet ? JWT_STORAGE.TESTNET : JWT_STORAGE.PRODUCTION;

    const dataToStore = {
      [jwtStorageKey]: message.jwt,
      groveEndpoint: message.environment || 'production',
      groveChain: isTestnet ? 'base-sepolia' : 'base'
    };

    // Auto-switch developer mode based on environment
    if (isTestnet) {
      dataToStore.groveEnvironment = 'local'; // Enable dev mode for testnet
      console.log('Testnet JWT received - enabling developer mode');
    } else {
      dataToStore.groveEnvironment = 'prod'; // Disable dev mode for production
      console.log('Production JWT received - disabling developer mode');
    }

    // Clear cached balances and user data when switching accounts
    dataToStore.GROVE_LAST_BALANCES = {};

    chrome.storage.local.set(dataToStore, () => {
      console.log(`JWT stored in ${isTestnet ? 'testnet' : 'production'} slot`);
      sendResponse({
        success: true,
        environment: message.environment || 'production',
        devModeEnabled: isTestnet
      });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_JWT') {
    // Return JWT based on current dev mode state
    chrome.storage.local.get(['groveEnvironment', JWT_STORAGE.PRODUCTION, JWT_STORAGE.TESTNET], (result) => {
      const isDevMode = result.groveEnvironment === 'local';
      const jwt = isDevMode ? result[JWT_STORAGE.TESTNET] : result[JWT_STORAGE.PRODUCTION];
      sendResponse({ jwt: jwt || null, isDevMode });
    });
    return true;
  }

  if (message.type === 'PING') {
    // Check if there's a JWT for the requested environment (or current mode if not specified)
    chrome.storage.local.get(['groveEnvironment', JWT_STORAGE.PRODUCTION, JWT_STORAGE.TESTNET], (result) => {
      const isDevMode = result.groveEnvironment === 'local';

      // If environment is specified, check that specific slot
      // Otherwise fall back to current dev mode
      let jwt;
      if (message.environment === 'testnet') {
        jwt = result[JWT_STORAGE.TESTNET];
      } else if (message.environment === 'production') {
        jwt = result[JWT_STORAGE.PRODUCTION];
      } else {
        // No environment specified - use current mode (backward compatible)
        jwt = isDevMode ? result[JWT_STORAGE.TESTNET] : result[JWT_STORAGE.PRODUCTION];
      }

      const hasKey = !!(jwt && jwt.length > 0);
      sendResponse({ hasKey, isDevMode, environment: message.environment || (isDevMode ? 'testnet' : 'production') });
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

  sendResponse({ error: 'Unknown message type' });
});
