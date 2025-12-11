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

  sendResponse({ error: 'Unknown message type' });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_BIO') {
    const { username } = message;
    if (!username) {
      sendResponse({ error: 'No username provided' });
      return;
    }

    // Fetch the user's X profile page to extract bio
    fetch(`https://x.com/${username}`, {
      credentials: 'include',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': navigator.userAgent
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        // Extract bio and display name from the HTML
        // Twitter embeds user data in a script tag as JSON
        const result = extractBioFromHtml(html, username);
        sendResponse(result);
      })
      .catch(error => {
        console.error(`[Grove] Failed to fetch bio for @${username}:`, error.message);
        sendResponse({ error: error.message, username });
      });

    return true; // Keep channel open for async response
  }
});

/**
 * Extract bio and display name from X profile HTML
 * @param {string} html - The HTML content of the profile page
 * @param {string} username - The username being fetched
 * @returns {{username: string, displayName: string|null, bio: string|null, error?: string}}
 */
function extractBioFromHtml(html, username) {
  try {
    // Method 1: Look for the __INITIAL_STATE__ or similar JSON data embedded in the page
    // Twitter/X embeds user data in script tags

    // Try to find user data in the HTML - Twitter uses various formats
    // Pattern 1: Look for description in meta tags
    const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/) ||
                      html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/);

    // Pattern 2: Look for the user's display name in title or meta
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const nameMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/) ||
                      html.match(/<meta\s+content="([^"]*)"\s+property="og:title"/);

    // Pattern 3: Look for JSON-LD data or embedded JSON with user info
    // Twitter sometimes embeds: {"description":"...","name":"..."}
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/);

    let bio = null;
    let displayName = null;

    // Extract from og:description (usually contains the bio)
    if (descMatch && descMatch[1]) {
      // og:description format is usually: "Bio text" or includes the bio
      bio = decodeHtmlEntities(descMatch[1]);
    }

    // Extract display name from og:title or title
    // Format is usually: "Display Name (@username) / X"
    if (nameMatch && nameMatch[1]) {
      const nameStr = decodeHtmlEntities(nameMatch[1]);
      // Extract just the display name part before (@username)
      const displayNameMatch = nameStr.match(/^(.+?)\s*\(@/);
      if (displayNameMatch) {
        displayName = displayNameMatch[1].trim();
      }
    } else if (titleMatch && titleMatch[1]) {
      const titleStr = decodeHtmlEntities(titleMatch[1]);
      const displayNameMatch = titleStr.match(/^(.+?)\s*\(@/);
      if (displayNameMatch) {
        displayName = displayNameMatch[1].trim();
      }
    }

    // Try JSON-LD if available
    if (jsonLdMatch && jsonLdMatch[1]) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.description && !bio) {
          bio = jsonLd.description;
        }
        if (jsonLd.name && !displayName) {
          displayName = jsonLd.name;
        }
      } catch (e) {
        // JSON parse failed, ignore
      }
    }

    // Pattern 4: Look for embedded JSON in scripts (Twitter's React hydration data)
    // This is more complex but can contain the full bio
    if (!bio) {
      // Look for patterns like "description":"actual bio text"
      const bioJsonMatch = html.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (bioJsonMatch && bioJsonMatch[1]) {
        const decoded = bioJsonMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        // Only use if it looks like a real bio (not too long, not a URL)
        if (decoded.length < 500 && !decoded.startsWith('http')) {
          bio = decoded;
        }
      }
    }

    console.log(`[Grove] Extracted for @${username}: displayName="${displayName}", bio="${bio?.substring(0, 50)}..."`);

    return {
      username,
      displayName: displayName || null,
      bio: bio || null
    };
  } catch (error) {
    console.error(`[Grove] Error parsing HTML for @${username}:`, error);
    return {
      username,
      displayName: null,
      bio: null,
      error: error.message
    };
  }
}

/**
 * Decode HTML entities in a string
 * @param {string} str - String with HTML entities
 * @returns {string} - Decoded string
 */
function decodeHtmlEntities(str) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&nbsp;': ' '
  };
  return str.replace(/&[#\w]+;/g, match => entities[match] || match);
}
