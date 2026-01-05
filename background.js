// Import shared modules
importScripts('src/config/storageKeys.js');
importScripts('src/utils/updateChecker.js');
importScripts('src/auth/xOAuthBackground.js');

function openSidePanelOrPopup(sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const activeTab = tabs[0];

    if (activeTab?.id && chrome.sidePanel?.open) {
      try {
        await chrome.sidePanel.open({ tabId: activeTab.id });
        sendResponse({ success: true, opened: true, type: 'sidepanel' });
      } catch {
        // Side panel failed, try popup
        if (chrome.action.openPopup) {
          chrome.action.openPopup()
            .then(() => sendResponse({ success: true, opened: true, type: 'popup' }))
            .catch(() => sendResponse({ success: true, opened: false, reason: 'popup_blocked' }));
        } else {
          sendResponse({ success: true, opened: false, reason: 'no_open_method' });
        }
      }
    } else if (chrome.action.openPopup) {
      chrome.action.openPopup()
        .then(() => sendResponse({ success: true, opened: true, type: 'popup' }))
        .catch(() => sendResponse({ success: true, opened: false, reason: 'popup_blocked' }));
    } else {
      sendResponse({ success: true, opened: false, reason: 'no_active_tab' });
    }
  });
}

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
      jwtStorageKey = STORAGE_KEYS.JWT_LOCALHOST;
    } else if (env === 'testnet') {
      jwtStorageKey = STORAGE_KEYS.JWT_TESTNET;
    } else {
      jwtStorageKey = STORAGE_KEYS.JWT_PRODUCTION;
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
    chrome.storage.local.get(['groveEnvironment', 'groveEndpoint', STORAGE_KEYS.JWT_PRODUCTION, STORAGE_KEYS.JWT_TESTNET, STORAGE_KEYS.JWT_LOCALHOST], (result) => {
      const isDevMode = result.groveEnvironment === 'local';
      const endpoint = result.groveEndpoint || 'production';
      // Normalize 'local' to 'localhost'
      const reqEnv = message.environment === 'local' ? 'localhost' : message.environment;

      let jwt;
      if (reqEnv === 'localhost') {
        jwt = result[STORAGE_KEYS.JWT_LOCALHOST];
      } else if (reqEnv === 'testnet') {
        jwt = result[STORAGE_KEYS.JWT_TESTNET];
      } else if (reqEnv === 'production') {
        jwt = result[STORAGE_KEYS.JWT_PRODUCTION];
      } else {
        // No environment specified - use current endpoint
        if (endpoint === 'localhost') {
          jwt = result[STORAGE_KEYS.JWT_LOCALHOST];
        } else if (endpoint === 'testnet') {
          jwt = result[STORAGE_KEYS.JWT_TESTNET];
        } else {
          jwt = result[STORAGE_KEYS.JWT_PRODUCTION];
        }
      }
      sendResponse({ jwt: jwt || null, isDevMode, environment: endpoint });
    });
    return true;
  }

  if (message.type === 'PING') {
    // Check if there's a JWT for the requested environment (or current mode if not specified)
    chrome.storage.local.get(['groveEnvironment', 'groveEndpoint', STORAGE_KEYS.JWT_PRODUCTION, STORAGE_KEYS.JWT_TESTNET, STORAGE_KEYS.JWT_LOCALHOST], (result) => {
      const isDevMode = result.groveEnvironment === 'local';
      const endpoint = result.groveEndpoint || 'production';
      // Normalize 'local' to 'localhost'
      const reqEnv = message.environment === 'local' ? 'localhost' : message.environment;

      // If environment is specified, check that specific slot
      // Otherwise fall back to current endpoint
      let jwt;
      if (reqEnv === 'localhost') {
        jwt = result[STORAGE_KEYS.JWT_LOCALHOST];
      } else if (reqEnv === 'testnet') {
        jwt = result[STORAGE_KEYS.JWT_TESTNET];
      } else if (reqEnv === 'production') {
        jwt = result[STORAGE_KEYS.JWT_PRODUCTION];
      } else {
        // No environment specified - use current endpoint
        if (endpoint === 'localhost') {
          jwt = result[STORAGE_KEYS.JWT_LOCALHOST];
        } else if (endpoint === 'testnet') {
          jwt = result[STORAGE_KEYS.JWT_TESTNET];
        } else {
          jwt = result[STORAGE_KEYS.JWT_PRODUCTION];
        }
      }

      const hasKey = !!(jwt && jwt.length > 0);
      sendResponse({ hasKey, isDevMode, environment: reqEnv || endpoint });
    });
    return true;
  }

  if (message.type === 'OPEN_POPUP') {
    openSidePanelOrPopup(sendResponse);
    return true;
  }

  if (message.type === 'OPEN_POPUP_TO_X_SETTINGS') {
    // Store flag to open X settings when panel opens
    chrome.storage.local.set({ openToXSettings: true });
    openSidePanelOrPopup(sendResponse);
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

// X OAuth functions are imported from src/auth/xOAuthBackground.js
// handleXLogin, X_AUTH_CONFIG, etc. are available globally

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
      // Show badge to indicate update available (red for urgency)
      await chrome.action.setBadgeText({ text: '1' });
      await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      console.log(`[Grove Background] Update available: v${result.version}`);
    } else {
      // Clear badge if no update
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('[Grove Background] Error checking for updates:', error);
  }
}

// Check for updates on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  checkForUpdatesBackground();
});

// Check for updates on browser startup
chrome.runtime.onStartup.addListener(() => {
  checkForUpdatesBackground();
});

// Also check when service worker loads
checkForUpdatesBackground();
