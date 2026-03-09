// Import shared modules
importScripts("src/config/environments.js");
importScripts("src/config/logger.js");
importScripts("src/config/chains.js");
importScripts("src/config/storageKeys.js");
importScripts("src/utils/updateChecker.js");
importScripts("src/auth/xOAuthBackground.js");

// Listen for internal messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Clear update badge when user dismisses update notification
  if (message.type === "CLEAR_UPDATE_BADGE") {
    chrome.action.setBadgeText({ text: "" });
    sendResponse({ success: true });
    return true;
  }

  // Proxy API fetch requests from content scripts (avoids CORS blocks)
  // Content scripts inherit the page's origin; the service worker uses chrome-extension://
  // Only proxy to known Grove API and chain RPC URLs to prevent abuse.
  if (message.type === "API_FETCH") {
    const { url, options } = message;

    const allowedPrefixes = [
      ...Object.values(GROVE_ENVIRONMENTS).map((env) => env.apiUrl),
      ...Object.values(CHAIN_CONFIG).map((chain) => chain.rpcUrl),
      "https://api.twitter.com/",
    ];
    if (!allowedPrefixes.some((prefix) => url.startsWith(prefix))) {
      sendResponse({
        error: `Blocked: URL not in allowlist`,
        ok: false,
        status: 0,
        statusText: "",
        headers: {},
        body: "",
      });
      return true;
    }

    fetch(url, { ...options, credentials: "omit" })
      .then(async (response) => {
        const body = await response.text();
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        sendResponse({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers,
          body,
        });
      })
      .catch((error) => {
        sendResponse({
          error: error.message,
          ok: false,
          status: 0,
          statusText: "",
          headers: {},
          body: "",
        });
      });
    return true; // Keep channel open for async response
  }

  // X (Twitter) OAuth Login
  if (message.type === "X_LOGIN") {
    handleXLogin()
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});

// Listen for messages from external web pages (e.g., localhost, testnet, production)
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    console.log("Received external message from:", sender.origin);

    if (message.type === "SET_JWT") {
      // Determine which slot to store the JWT in based on environment
      // Accept both 'local' and 'localhost' for local development
      const env =
        message.environment === "local"
          ? "localhost"
          : message.environment || "production";
      const envConfig = GroveEnv.get(env) || GroveEnv.get("production");

      const dataToStore = {
        [envConfig.jwtStorageKey]: message.jwt,
        groveEndpoint: env,
        groveChain: envConfig.defaultChain,
        groveEnvironment: envConfig.isDevMode ? "local" : "prod",
        [STORAGE_KEYS.LAST_BALANCES]: {},
      };

      console.log(
        `${env} JWT received - ${envConfig.isDevMode ? "enabling" : "disabling"} developer mode`,
      );

      chrome.storage.local.set(dataToStore, () => {
        console.log(`JWT stored in ${env} slot`);
        sendResponse({
          success: true,
          environment: env,
          devModeEnabled: envConfig.isDevMode,
        });

        // Open the extension popup window so the user sees it's activated
        chrome.windows
          .getLastFocused()
          .then((currentWindow) => {
            const width = 360;
            const height = 600;
            const top = (currentWindow.top || 0) + 80;
            const left =
              (currentWindow.left || 0) +
              (currentWindow.width || 1280) -
              width -
              20;
            return chrome.windows.create({
              url: chrome.runtime.getURL("popup.html"),
              type: "popup",
              width,
              height,
              top,
              left,
              focused: true,
            });
          })
          .catch((err) => {
            console.error(
              "[Grove Extension] Failed to open popup window:",
              err,
            );
          });
      });
      return true; // Keep channel open for async response
    }

    if (message.type === "GET_JWT") {
      // Return JWT based on requested environment or current dev mode state
      chrome.storage.local.get(
        [
          "groveEnvironment",
          "groveEndpoint",
          STORAGE_KEYS.JWT_PRODUCTION,
          STORAGE_KEYS.JWT_TESTNET,
          STORAGE_KEYS.JWT_LOCALHOST,
        ],
        (result) => {
          const isDevMode = result.groveEnvironment === "local";
          const endpoint = result.groveEndpoint || "production";
          // Normalize 'local' to 'localhost'
          const reqEnv =
            message.environment === "local" ? "localhost" : message.environment;

          // Use requested env if specified, otherwise resolve from current state
          const envId = reqEnv
            ? GroveEnv.get(reqEnv)
              ? reqEnv
              : "production"
            : GroveEnv.resolveActiveEnvId(result.groveEnvironment, endpoint);
          const jwt = result[GroveEnv.jwtKeyForEnv(envId)];
          sendResponse({ jwt: jwt || null, isDevMode, environment: endpoint });
        },
      );
      return true;
    }

    if (message.type === "PING") {
      // Check if there's a JWT for the requested environment (or current mode if not specified)
      chrome.storage.local.get(
        [
          "groveEnvironment",
          "groveEndpoint",
          STORAGE_KEYS.JWT_PRODUCTION,
          STORAGE_KEYS.JWT_TESTNET,
          STORAGE_KEYS.JWT_LOCALHOST,
        ],
        (result) => {
          const isDevMode = result.groveEnvironment === "local";
          const endpoint = result.groveEndpoint || "production";
          // Normalize 'local' to 'localhost'
          const reqEnv =
            message.environment === "local" ? "localhost" : message.environment;

          // Use requested env if specified, otherwise resolve from current state
          const envId = reqEnv
            ? GroveEnv.get(reqEnv)
              ? reqEnv
              : "production"
            : GroveEnv.resolveActiveEnvId(result.groveEnvironment, endpoint);
          const jwt = result[GroveEnv.jwtKeyForEnv(envId)];

          const hasKey = !!(jwt && jwt.length > 0);
          sendResponse({ hasKey, isDevMode, environment: reqEnv || endpoint });
        },
      );
      return true;
    }

    if (message.type === "OPEN_POPUP") {
      const chromeVersion = parseInt(
        navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || "0",
      );

      if (chromeVersion >= 127 && chrome.action.openPopup) {
        chrome.action
          .openPopup()
          .then(() => sendResponse({ success: true, opened: true }))
          .catch(() =>
            sendResponse({
              success: true,
              opened: false,
              reason: "popup_blocked",
            }),
          );
      } else {
        sendResponse({
          success: true,
          opened: false,
          reason: "unsupported_version",
          chromeVersion,
        });
      }
      return true;
    }

    if (message.type === "OPEN_POPUP_TO_X_SETTINGS") {
      // Store flag to open X settings when popup opens
      chrome.storage.local.set({ openToXSettings: true });

      const chromeVersion = parseInt(
        navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || "0",
      );

      if (chromeVersion >= 127 && chrome.action.openPopup) {
        chrome.action
          .openPopup()
          .then(() => sendResponse({ success: true, opened: true }))
          .catch(() =>
            sendResponse({
              success: true,
              opened: false,
              reason: "popup_blocked",
            }),
          );
      } else {
        sendResponse({
          success: true,
          opened: false,
          reason: "unsupported_version",
          chromeVersion,
        });
      }
      return true;
    }

    if (message.type === "CHECK_OPEN_TO_X_SETTINGS") {
      chrome.storage.local.get(["openToXSettings"], (result) => {
        if (result.openToXSettings) {
          chrome.storage.local.remove("openToXSettings");
          sendResponse({ shouldOpen: true });
        } else {
          sendResponse({ shouldOpen: false });
        }
      });
      return true;
    }

    sendResponse({ error: "Unknown message type" });
  },
);

// X OAuth functions are imported from src/auth/xOAuthBackground.js
// handleXLogin, X_AUTH_CONFIG, etc. are available globally

// ============================================================================
// Update Checker - Background Check with Badge Notification
// ============================================================================

/**
 * Check for updates and update badge accordingly
 */
async function checkForUpdatesBackground() {
  if (typeof UpdateChecker === "undefined") {
    groveLog.warn("[Background] UpdateChecker not available");
    return;
  }

  try {
    const result = await UpdateChecker.checkForUpdate();

    if (result.available) {
      // Show badge to indicate update available (red for urgency)
      await chrome.action.setBadgeText({ text: "1" });
      await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      groveLog.log(`[Background] Update available: v${result.version}`);
    } else {
      // Clear badge if no update
      await chrome.action.setBadgeText({ text: "" });
    }
  } catch (error) {
    console.error("[Grove Background] Error checking for updates:", error);
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
