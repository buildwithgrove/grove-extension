/**
 * Grove Extension Content Script
 * Main orchestrator that detects platform, extracts addresses, and injects tip button
 */

(function () {
  "use strict";

  // STORAGE_KEYS is loaded from src/config/storageKeys.js

  /**
   * Check if the extension context is still valid
   * Returns false if extension was reloaded/updated while this content script is running
   * @returns {boolean}
   */
  function isExtensionContextValid() {
    try {
      // chrome.runtime.id is undefined when extension context is invalidated
      return !!(chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  /**
   * Ensure the ellipsis animation styles are loaded in the document
   * This is needed for the "Sending $X..." loading state
   */
  function ensureEllipsisAnimationStyles() {
    if (document.querySelector('#grove-ellipsis-animation')) {
      return; // Already added
    }
    const style = document.createElement('style');
    style.id = 'grove-ellipsis-animation';
    style.textContent = `
      @keyframes grove-ellipsis {
        0% { content: '.'; }
        33% { content: '..'; }
        66% { content: '...'; }
        100% { content: '.'; }
      }
      .grove-ellipsis::after {
        content: '.';
        animation: grove-ellipsis 1.2s infinite steps(1);
        display: inline-block;
        width: 1em;
        text-align: left;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Get the active JWT based on current dev mode state
   * @returns {Promise<string|null>}
   * @throws {Error} If extension context is invalidated
   */
  function getActiveJWT() {
    return new Promise((resolve, reject) => {
      // Check if extension context is valid before making API calls
      if (!isExtensionContextValid()) {
        reject(new Error('Extension was reloaded. Please refresh the page.'));
        return;
      }

      try {
        chrome.storage.local.get([STORAGE_KEYS.JWT_PRODUCTION, STORAGE_KEYS.JWT_TESTNET, STORAGE_KEYS.JWT_LOCALHOST, STORAGE_KEYS.ENVIRONMENT, STORAGE_KEYS.ENDPOINT], (result) => {
          // Check for Chrome runtime errors (e.g., context invalidated during the call)
          if (chrome.runtime.lastError) {
            reject(new Error('Extension was reloaded. Please refresh the page.'));
            return;
          }

          const isDevMode = result[STORAGE_KEYS.ENVIRONMENT] === 'local';
          const endpoint = result[STORAGE_KEYS.ENDPOINT] || 'production';

          let jwt;
          if (!isDevMode) {
            jwt = result[STORAGE_KEYS.JWT_PRODUCTION];
          } else if (endpoint === 'localhost') {
            jwt = result[STORAGE_KEYS.JWT_LOCALHOST];
          } else if (endpoint === 'testnet') {
            jwt = result[STORAGE_KEYS.JWT_TESTNET];
          } else {
            jwt = result[STORAGE_KEYS.JWT_PRODUCTION];
          }
          resolve(jwt || null);
        });
      } catch (e) {
        reject(new Error('Extension was reloaded. Please refresh the page.'));
      }
    });
  }

  // Signal to web pages that the extension is installed (with key state)
  function emitReadyEvent() {
    getActiveJWT().then((jwt) => {
      const hasKey = !!(jwt && jwt.length > 0);
      window.dispatchEvent(new CustomEvent('grove-extension-ready', {
        detail: { version: '1.0.2', hasKey }
      }));
    }).catch(() => {
      // Extension context invalidated - silently ignore
    });
  }

  // Emit immediately when content script loads
  emitReadyEvent();

  // Re-emit after delay to catch late-mounting React apps
  setTimeout(emitReadyEvent, 500);

  // State
  let currentButton = null;
  let currentAdapter = null;
  let navigationObserver = null;
  let tweetObserver = null;
  let tipPopover = null;
  let firstTipModal = null;
  let resolvedAddress = null; // Stores address info (0x address or ENS name)

  // Address cache: uses shared AddressCache class from src/utils/addressCache.js
  // Cache entries expire after 10 minutes (configured in ADDRESS_CACHE_TTL)
  const addressCache = typeof AddressCache !== 'undefined'
    ? new AddressCache()
    : new Map(); // Fallback for backwards compatibility

  // Track which tweets already have buttons to avoid duplicates
  const processedTweets = new WeakSet();

  // Track tweet elements by username for button injection after bio fetch
  // Maps username -> Set of { tweetElement, tweetUrl, dateElement, isQuotedTweet }
  const pendingTweetButtons = new Map();

  // Initialize BioFetcher with callbacks
  if (typeof BioFetcher !== 'undefined') {
    BioFetcher.init({
      isUserCached: (username) => getCachedAddress(username) !== null,
      onBioFetched: (username, { displayName, bio }) => {
        const combinedText = [displayName, bio].filter(Boolean).join(' ');

        if (combinedText && AddressParser.hasAddresses(combinedText)) {
          const addressResult = AddressParser.resolveAddress(combinedText);
          if (addressResult.address) {
            // Cache the positive result
            setCachedAddress(username, addressResult);
            console.log(`[Grove Extension] Bio fetch: Found address for @${username}: ${addressResult.address}`);

            // Inject buttons for all pending tweets from this user
            injectPendingButtons(username);
          } else {
            // No valid address found
            setCachedAddress(username, 'no-address');
          }
        } else {
          // No address in bio/display name
          setCachedAddress(username, 'no-address');
        }

        // Clean up pending tweets
        pendingTweetButtons.delete(username);
      },
      onFetchError: (username, error) => {
        console.log(`[Grove Extension] Bio fetch failed for @${username}: ${error}`);
        // Don't cache on error - allow retry later
        pendingTweetButtons.delete(username);
      }
    });
  }

  // Initialize HoverCardHandler with callbacks
  if (typeof HoverCardHandler !== 'undefined') {
    HoverCardHandler.init(
      {
        getCachedAddress: getCachedAddress,
        setCachedAddress: setCachedAddress,
        checkForAddress: (text) => {
          if (AddressParser.hasAddresses(text)) {
            return AddressParser.resolveAddress(text);
          }
          return null;
        },
        detectDarkMode: detectDarkMode,
        onTipClick: handleTweetTipClick,
        formatTipAmount: formatTipAmount,
        ensureEllipsisStyles: ensureEllipsisAnimationStyles
      },
      typeof GROVE_COLORS !== 'undefined' ? GROVE_COLORS : null
    );
  }

  // Initialize ProfilePageHandler with callbacks
  if (typeof ProfilePageHandler !== 'undefined') {
    ProfilePageHandler.init({
      hasAddresses: (text) => AddressParser.hasAddresses(text),
      resolveAddress: (text) => AddressParser.resolveAddress(text),
      setCachedAddress: setCachedAddress,
      onTipClick: handleTipClick,
      extractUsernameFromUrl: extractUsernameFromUrl
    });
  }

  /**
   * Show a small inline error/warning anchored to the tip button.
   * Delegates to TipErrorHandler.showInlineMessage() which handles positioning,
   * deduplication, and cleanup.
   *
   * @param {HTMLElement} buttonEl - The rendered button element
   * @param {Object|string} parsedErrorOrMessage - Parsed error object or plain message
   */
  function showInlineTipError(buttonEl, parsedErrorOrMessage) {
    let message = '';
    let variant = 'error';

    if (typeof parsedErrorOrMessage === 'string') {
      message = parsedErrorOrMessage;
    } else if (parsedErrorOrMessage) {
      message = parsedErrorOrMessage.userMessage || parsedErrorOrMessage.message || '';
      variant = parsedErrorOrMessage.variant || 'error';
    }

    if (!message) return;

    if (typeof TipErrorHandler !== 'undefined') {
      TipErrorHandler.showInlineMessage(buttonEl, message, variant);
    } else {
      // TipErrorHandler should always be available via manifest.json,
      // but log if it's missing for debugging
      console.warn('[Grove Extension] TipErrorHandler not available, error bubble skipped');
    }
  }

  /**
   * Initialize the extension
   */
  async function init() {

    // Detect platform and create appropriate adapter
    currentAdapter = detectPlatform();

    if (!currentAdapter) {
      return;
    }

    console.log(`[Grove Extension] Platform detected: ${currentAdapter.getPlatformName()}`);

    // For Twitter/X, handle tweet tip buttons on all pages
    if (currentAdapter.getPlatformName() === "twitter") {
      // If on a profile page, initialize profile button first (this caches the address)
      if (currentAdapter.detectProfilePage()) {
        if (typeof ProfilePageHandler !== 'undefined') {
          const result = await ProfilePageHandler.initialize(currentAdapter);
          if (result) {
            resolvedAddress = result;
            currentButton = ProfilePageHandler.getButton();
          }
        }
      }

      // Always set up tweet observer on Twitter (after profile init so cache is populated)
      setupTwitterTweetObserver();

      // Also set up hover card observer for profile popups
      if (typeof HoverCardHandler !== 'undefined') {
        HoverCardHandler.startObserving();
      }
      return;
    }

    // For generic websites, check for metadata files
    if (currentAdapter.getPlatformName() === "generic") {
      await initializeGenericWebsite();
      return;
    }

    // Check if we're on a profile page (for other platforms)
    try {
      if (!currentAdapter.detectProfilePage()) {
        return;
      }
    } catch (error) {
      console.error("[Grove Extension] Profile detection failed:", error);
      return;
    }

    // Initialize profile button
    if (typeof ProfilePageHandler !== 'undefined') {
      const result = await ProfilePageHandler.initialize(currentAdapter);
      if (result) {
        resolvedAddress = result;
        currentButton = ProfilePageHandler.getButton();
      }
    }
  }

  /**
   * Initialize tip button for generic websites
   * Fetches llms.txt/ai.txt and shows floating button if address found
   */
  async function initializeGenericWebsite() {
    try {
      // Fetch metadata files
      const metadata = await currentAdapter.fetchMetadata();

      if (!metadata.found) {
        console.log("[Grove Extension] No metadata files with addresses found");
        return;
      }

      console.log(`[Grove Extension] Found address in ${metadata.source}: ${metadata.address.original || metadata.address.address}`);

      // Store resolved address
      resolvedAddress = metadata.address;

      // Create and inject floating tip button
      currentButton = new TipButton(handleTipClick, 'generic');
      currentButton.create();
      currentButton.injectFloating();

      console.log("[Grove Extension] Floating tip button injected");
    } catch (error) {
      console.error("[Grove Extension] Generic website initialization failed:", error);
    }
  }

  /**
   * Detect which platform we're on and return appropriate adapter
   * @returns {BaseAdapter|null}
   */
  function detectPlatform() {
    const hostname = window.location.hostname;

    if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      return new TwitterAdapter();
    }

    // Return GenericAdapter for all other websites
    // Only if GenericAdapter is available (loaded via manifest)
    if (typeof GenericAdapter !== 'undefined') {
      return new GenericAdapter();
    }

    return null;
  }

  // Profile button initialization is now handled by ProfilePageHandler

  /**
   * Handle tip button click - shows popover for amount confirmation (if enabled)
   * @param {TipButton} buttonInstance - The button instance (for hover cards)
   */
  async function handleTipClick(buttonInstance) {
    // Use passed button instance or fall back to currentButton
    const button = buttonInstance || currentButton;

    // Check if extension context is valid
    if (!isExtensionContextValid()) {
      console.error("[Grove Extension] Extension context invalidated");
      if (button) {
        button.setError();
        showInlineTipError(button.button, {
          message: 'Extension was reloaded. Please refresh the page.',
          variant: 'error'
        });
      }
      return;
    }

    // Get settings from storage
    let tipAmount = 0.02; // default
    let confirmBeforeTipping = false; // default off
    let hasTipped = false; // whether user has tipped before

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['GROVE_TIP_AMOUNT', 'GROVE_CONFIRM_TIP', 'GROVE_HAS_TIPPED']);
        tipAmount = result.GROVE_TIP_AMOUNT || 0.02;
        confirmBeforeTipping = result.GROVE_CONFIRM_TIP || false;
        hasTipped = result.GROVE_HAS_TIPPED || false;
      }
    } catch (error) {
      console.error("[Grove Extension] Settings load failed:", error);
      if (button) {
        button.setError();
        showInlineTipError(button.button, {
          message: 'Extension was reloaded. Please refresh the page.',
          variant: 'error'
        });
      }
      return;
    }

    // Get the button element for positioning
    const buttonElement = button?.button;
    if (!buttonElement) {
      console.error("[Grove Extension] No button element found");
      return;
    }

    // If this is the user's first tip, show the first tip modal
    if (!hasTipped) {
      if (!firstTipModal) {
        firstTipModal = new FirstTipModal();
      }

      firstTipModal.show(
        buttonElement,
        tipAmount,
        confirmBeforeTipping,
        async ({ amount, confirmBeforeTipping: newConfirmSetting }) => {
          // Save preferences and mark as having tipped
          try {
            await chrome.storage.local.set({
              'GROVE_TIP_AMOUNT': amount,
              'GROVE_CONFIRM_TIP': newConfirmSetting,
              'GROVE_HAS_TIPPED': true
            });
          } catch (e) {
            console.error("[Grove Extension] Failed to save first tip preferences:", e);
          }
          // Send the tip
          sendTip(amount, button);
        },
        () => {
          console.log("[Grove Extension] First tip cancelled");
        }
      );
      return;
    }

    // If confirmation disabled, send tip directly
    if (!confirmBeforeTipping) {
      sendTip(tipAmount, button);
      return;
    }

    // Create popover if needed
    if (!tipPopover) {
      tipPopover = new TipPopover();
    }

    // Show popover with amount confirmation
    tipPopover.show(
      buttonElement,
      tipAmount,
      (confirmedAmount) => {
        // User confirmed - send the tip
        sendTip(confirmedAmount, button);
      },
      () => {
        // User cancelled - do nothing
        console.log("[Grove Extension] Tip cancelled");
      }
    );
  }

  /**
   * Send tip with the given amount
   * @param {number} tipAmount - The amount to tip
   * @param {TipButton} button - The button instance for state updates
   */
  async function sendTip(tipAmount, button) {
    // Show loading animation with amount
    if (button) {
      button.setLoading(tipAmount);
    }

    // Get JWT from storage (uses dev mode-aware getter)
    let jwt = '';

    try {
      jwt = await getActiveJWT() || '';

      if (!jwt) {
        console.error("[Grove Extension] No API key configured");
        if (button) {
          button.setError();
          showInlineTipError(button.button, {
            message: 'Missing tipping key in the extension settings.',
            variant: 'error'
          });
        }
        return;
      }
    } catch (error) {
      console.error("[Grove Extension] Settings load failed:", error);
      if (button) {
        button.setError();
        showInlineTipError(button.button, {
          message: error.message || 'Could not read settings. Refresh and try again.',
          variant: 'error'
        });
      }
      return;
    }

    // Determine tip destination: use resolved address if available (ENS or raw 0x), otherwise page URL
    let tipDestination = window.location.href;
    if (resolvedAddress && resolvedAddress.address) {
      tipDestination = resolvedAddress.address; // e.g., "vitalik.eth" or "0x..."
      console.log(`[Grove Extension] Tipping to ${resolvedAddress.type} address: ${tipDestination}`);
    }

    // Build context metadata for the tip
    // Note: sender_platform can be 'x' or 'twitter' - both map to X/Twitter
    const username = extractUsernameFromUrl(window.location.href);
    
    // Determine platform name from adapter, default to generic
    const senderPlatform = currentAdapter ? currentAdapter.getApiPlatformName() : 'generic';

    const context = {
      source_post_url: window.location.href
    };
    
    if (senderPlatform && senderPlatform !== 'generic') {
      context.sender_platform = senderPlatform;
    }
    if (username) {
      context.recipient_username = username;
      context.recipient_profile_url = `https://x.com/${username}`;
    }

    // Add sender info if X is authenticated (from xFeatures.js)
    if (typeof addXSenderInfo === 'function') {
      await addXSenderInfo(context);
    }

    // Send tip via API with JWT, amount, and context
    const response = await GroveAPI.sendTip(tipDestination, tipAmount, jwt, context);

    let parsedError = null;
    if (!response.success && typeof TipErrorHandler !== 'undefined') {
      try {
        parsedError = TipErrorHandler.parse(response);
      } catch (e) {
        console.error("[Grove Extension] Error parsing tip error:", e);
      }
    }

    // Handle response with animations
    if (response.success) {
      if (button) {
        button.setSuccess();
      }
    } else {
      console.error("[Grove Extension] Tip failed:", response.error, response.data);
      if (button) {
        button.setError();
        // Ensure we always have a message to show
        const errorMessage = parsedError?.userMessage || parsedError?.message || response.error || 'Tip failed. Please try again.';
        showInlineTipError(button.button, errorMessage);
      }
    }
  }

  // Hover card handling is now in src/content/hoverCardHandler.js

  /**
   * Setup observer for Twitter tweets
   * Watches for new tweets and injects tip buttons for tippable authors
   */
  function setupTwitterTweetObserver() {
    // Clean up existing observer
    if (tweetObserver) {
      tweetObserver.disconnect();
    }

    console.log("[Grove Extension] Setting up tweet observer");

    // Process existing tweets first
    processExistingTweets();

    // Watch for new tweets being added to the DOM
    tweetObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is a tweet or contains tweets
            if (node.matches && node.matches('article[data-testid="tweet"]')) {
              processTweet(node);
            } else if (node.querySelectorAll) {
              const tweets = node.querySelectorAll('article[data-testid="tweet"]');
              tweets.forEach(processTweet);
            }
          }
        }
      }
    });

    tweetObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Process all existing tweets on the page
   */
  function processExistingTweets() {
    if (!currentAdapter || currentAdapter.getPlatformName() !== 'twitter') return;

    const tweets = currentAdapter.findTweets();
    console.log(`[Grove Extension] Found ${tweets.length} existing tweets`);
    tweets.forEach(processTweet);
  }

  /**
   * Check if a user has a tippable address (from cache or display name)
   * @param {string} username - Twitter username
   * @param {string|null} displayName - Display name to check for addresses
   * @returns {boolean}
   */
  function checkTippableAddress(username, displayName) {
    // Check cache first
    const cached = getCachedAddress(username);

    if (cached === 'no-address') return false;
    if (cached && cached.address) return true;

    // Check display name for addresses
    if (displayName) {
      const hasAddress = AddressParser.hasAddresses(displayName);
      if (hasAddress) {
        const addressResult = AddressParser.resolveAddress(displayName);
        if (addressResult.address) {
          setCachedAddress(username, addressResult);
          console.log(`[Grove Extension] Tweet: Found address for @${username}: ${addressResult.address}`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Process a single tweet and inject tip button only if author has tippable address
   * Also handles quote tweets - shows button for quoted author if they have a tippable address
   * If no address found in display name, queues a background bio fetch
   * @param {Element} tweetElement - The tweet article element
   */
  async function processTweet(tweetElement) {
    // Skip if already processed
    if (processedTweets.has(tweetElement)) return;
    processedTweets.add(tweetElement);

    // Skip if button already exists on the main tweet
    if (tweetElement.querySelector('.grove-tweet-tip-button')) return;

    // Extract main author info (for RTs this is the original author, for QTs this is the quoter)
    const authorInfo = currentAdapter.extractTweetAuthor(tweetElement);

    // Process main tweet author
    if (authorInfo.username) {
      const hasTippableAddress = checkTippableAddress(authorInfo.username, authorInfo.displayName);

      if (hasTippableAddress) {
        const tweetUrl = currentAdapter.getTweetUrl(tweetElement);
        const dateElement = currentAdapter.getTweetDateElement(tweetElement);

        if (tweetUrl && dateElement) {
          injectTweetTipButton(tweetElement, dateElement, tweetUrl);
        }
      } else {
        // No address found in display name - queue background bio fetch
        const cached = getCachedAddress(authorInfo.username);
        if (cached === null) {
          // Not cached yet - queue for bio fetch
          const tweetUrl = currentAdapter.getTweetUrl(tweetElement);
          const dateElement = currentAdapter.getTweetDateElement(tweetElement);
          if (tweetUrl && dateElement) {
            console.log(`[Grove Extension] Queueing bio fetch for @${authorInfo.username}`);
            queueBioFetch(authorInfo.username, tweetElement, tweetUrl, dateElement, false);
          } else {
            console.log(`[Grove Extension] Cannot queue @${authorInfo.username}: missing tweetUrl=${!!tweetUrl} dateElement=${!!dateElement}`);
          }
        } else {
          console.log(`[Grove Extension] Skipping @${authorInfo.username}: cached=${cached}`);
        }
      }
    }

    // For quote tweets, also check the quoted tweet's author
    if (currentAdapter.hasQuotedTweet && currentAdapter.hasQuotedTweet(tweetElement)) {
      const quotedAuthor = currentAdapter.extractQuotedTweetAuthor(tweetElement);

      if (quotedAuthor && quotedAuthor.username) {
        const quotedHasTippable = checkTippableAddress(quotedAuthor.username, quotedAuthor.displayName);

        if (quotedHasTippable) {
          // Find the quoted tweet element to inject button into
          const quotedTweetEl = currentAdapter.getQuotedTweetElement(tweetElement);
          if (quotedTweetEl && !quotedTweetEl.querySelector('.grove-tweet-tip-button')) {
            // Build URL for the quoted tweet
            let quotedTweetUrl = null;

            // Method 1: Look for status link in quoted area
            const quotedStatusLink = quotedTweetEl.querySelector('a[href*="/status/"]');
            if (quotedStatusLink) {
              const href = quotedStatusLink.getAttribute('href');
              quotedTweetUrl = href.startsWith('/') ? `https://x.com${href}` : href;
            }

            // Method 2: If no status link, use the author's profile URL
            // (tipping to profile is valid when we can't get the specific tweet)
            if (!quotedTweetUrl && quotedAuthor.profileUrl) {
              quotedTweetUrl = quotedAuthor.profileUrl;
            }

            // Find placement - try multiple options
            // 1. Time element's parent (next to timestamp like "1h")
            // 2. User-Name container
            // 3. Any span containing the time text
            // 4. First row/line of the quoted tweet
            let placement = null;

            const quotedTimeLink = quotedTweetEl.querySelector('time');
            if (quotedTimeLink?.parentElement) {
              placement = quotedTimeLink.parentElement;
            }

            if (!placement) {
              const quotedNameContainer = quotedTweetEl.querySelector('[data-testid="User-Name"]');
              if (quotedNameContainer) {
                placement = quotedNameContainer;
              }
            }

            // Fallback: find the row containing author info (usually first child div with text)
            if (!placement) {
              // Look for a container that has the username link
              const usernameLink = quotedTweetEl.querySelector('a[href^="/"][role="link"]');
              if (usernameLink) {
                // Go up to find a reasonable container
                let container = usernameLink.parentElement;
                while (container && container !== quotedTweetEl) {
                  if (container.parentElement === quotedTweetEl ||
                      container.parentElement?.parentElement === quotedTweetEl) {
                    placement = container;
                    break;
                  }
                  container = container.parentElement;
                }
              }
            }

            // If we have a URL and a place to put the button, inject it
            if (quotedTweetUrl && placement) {
              injectTweetTipButton(quotedTweetEl, placement, quotedTweetUrl, true);
            }
          }
        } else {
          // No address found in quoted author's display name - queue background bio fetch
          const cached = getCachedAddress(quotedAuthor.username);
          if (cached === null) {
            // Not cached yet - queue for bio fetch
            const quotedTweetEl = currentAdapter.getQuotedTweetElement(tweetElement);
            if (quotedTweetEl) {
              let quotedTweetUrl = null;
              const quotedStatusLink = quotedTweetEl.querySelector('a[href*="/status/"]');
              if (quotedStatusLink) {
                const href = quotedStatusLink.getAttribute('href');
                quotedTweetUrl = href.startsWith('/') ? `https://x.com${href}` : href;
              }
              if (!quotedTweetUrl && quotedAuthor.profileUrl) {
                quotedTweetUrl = quotedAuthor.profileUrl;
              }

              // Find placement for quoted tweet button
              let placement = null;
              const quotedTimeLink = quotedTweetEl.querySelector('time');
              if (quotedTimeLink?.parentElement) {
                placement = quotedTimeLink.parentElement;
              }
              if (!placement) {
                const quotedNameContainer = quotedTweetEl.querySelector('[data-testid="User-Name"]');
                if (quotedNameContainer) {
                  placement = quotedNameContainer;
                }
              }

              if (quotedTweetUrl && placement) {
                queueBioFetch(quotedAuthor.username, tweetElement, quotedTweetUrl, placement, true);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Extract username from Twitter profile URL
   * @param {string} url - The URL to parse
   * @returns {string|null} - Username or null
   */
  function extractUsernameFromUrl(url) {
    const match = url.match(/^https:\/\/(twitter|x)\.com\/([^\/\?]+)\/?/);
    if (match && match[2] && !['home', 'explore', 'search', 'notifications', 'messages', 'settings', 'i'].includes(match[2])) {
      return match[2];
    }
    return null;
  }

  /**
   * Get cached address for a username
   * Uses shared AddressCache class if available, falls back to Map-based implementation
   * @param {string} username - Twitter username
   * @returns {Object|string|null} - Cached address result, 'no-address', or null if not cached/expired
   */
  function getCachedAddress(username) {
    // Use AddressCache.get() if available (handles TTL internally)
    if (addressCache instanceof AddressCache) {
      return addressCache.get(username);
    }
    // Fallback for Map-based cache
    const cached = addressCache.get(username);
    if (!cached) return null;
    const ttl = typeof ADDRESS_CACHE_TTL !== 'undefined' ? ADDRESS_CACHE_TTL : 10 * 60 * 1000;
    if (Date.now() - cached.timestamp > ttl) {
      addressCache.delete(username);
      return null;
    }
    return cached.data;
  }

  /**
   * Set cached address for a username
   * Uses shared AddressCache class if available
   * @param {string} username - Twitter username
   * @param {Object|string} data - Address result or 'no-address'
   */
  function setCachedAddress(username, data) {
    // Use AddressCache.set() if available
    if (addressCache instanceof AddressCache) {
      addressCache.set(username, data);
      return;
    }
    // Fallback for Map-based cache
    addressCache.set(username, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Queue a username for background bio fetch
   * Uses BioFetcher module for the actual fetching
   * @param {string} username - Twitter username
   * @param {Element} tweetElement - The tweet element to inject button into
   * @param {string} tweetUrl - The tweet URL
   * @param {Element} dateElement - The date element for button placement
   * @param {boolean} isQuotedTweet - Whether this is a quoted tweet
   */
  function queueBioFetch(username, tweetElement, tweetUrl, dateElement, isQuotedTweet = false) {
    // Track the tweet element so we can inject button when bio returns
    if (!pendingTweetButtons.has(username)) {
      pendingTweetButtons.set(username, new Set());
    }
    pendingTweetButtons.get(username).add({
      tweetElement,
      tweetUrl,
      dateElement,
      isQuotedTweet
    });

    // Queue fetch using BioFetcher module
    if (typeof BioFetcher !== 'undefined') {
      BioFetcher.queueFetch(username);
    }
  }

  /**
   * Inject buttons for all pending tweets from a user after bio fetch
   * @param {string} username - Twitter username
   */
  function injectPendingButtons(username) {
    const pending = pendingTweetButtons.get(username);
    if (!pending) return;

    for (const { tweetElement, tweetUrl, dateElement, isQuotedTweet } of pending) {
      // Check if element is still in DOM and doesn't already have a button
      if (!document.contains(tweetElement)) continue;
      if (tweetElement.querySelector('.grove-tweet-tip-button')) continue;

      if (isQuotedTweet) {
        // For quoted tweets, find the quoted element
        const quotedTweetEl = currentAdapter.getQuotedTweetElement(tweetElement);
        if (quotedTweetEl && !quotedTweetEl.querySelector('.grove-tweet-tip-button')) {
          injectTweetTipButton(quotedTweetEl, dateElement, tweetUrl, true);
        }
      } else {
        injectTweetTipButton(tweetElement, dateElement, tweetUrl, false);
      }
    }
  }

  /**
   * Inject tip button next to tweet date
   * @param {Element} tweetElement - The tweet article element
   * @param {Element} dateElement - The date link element
   * @param {string} tweetUrl - The tweet URL for tipping
   * @param {boolean} isQuotedTweet - Whether this is a button for a quoted tweet (smaller styling)
   */
  function injectTweetTipButton(tweetElement, dateElement, tweetUrl, isQuotedTweet = false) {
    // Detect dark mode
    const isDarkMode = detectDarkMode();
    const bgColor = isDarkMode ? '#1a1a1a' : '#ffffff';
    const bgHoverColor = isDarkMode ? '#252525' : '#f0f0f0';
    const textColor = isDarkMode ? '#ffffff' : '#1a1a1a';

    // Adjust sizing for quoted tweets (smaller to fit the compact layout)
    const buttonHeight = isQuotedTweet ? '24px' : '28px';
    const buttonPadding = isQuotedTweet ? '0 8px' : '0 12px';
    const fontSize = isQuotedTweet ? '11px' : '13px';
    const emojiFontSize = isQuotedTweet ? '12px' : '14px';

    // Create the full tip button (matching profile button style)
    const button = document.createElement('button');
    button.className = 'grove-tweet-tip-button';
    if (isQuotedTweet) button.classList.add('grove-quoted-tweet-tip-button');
    button.setAttribute('aria-label', 'Send a tip');
    button.setAttribute('type', 'button');

    button.style.cssText = `
      background: ${bgColor} !important;
      border: 2px solid ${GROVE_COLORS.primary} !important;
      border-radius: 9999px !important;
      padding: ${buttonPadding} !important;
      height: ${buttonHeight} !important;
      min-height: ${buttonHeight} !important;
      max-height: ${buttonHeight} !important;
      min-width: 32px !important;
      position: relative !important;
      overflow: hidden !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 4px !important;
      cursor: pointer !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: 0 2px 8px ${GROVE_COLORS.shadow} !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      vertical-align: middle !important;
      margin-left: 8px !important;
      line-height: 1 !important;
    `;

    // Create text span
    const textSpan = document.createElement('span');
    textSpan.textContent = 'Tip';
    textSpan.style.cssText = `
      color: ${textColor} !important;
      font-weight: 600 !important;
      font-size: ${fontSize} !important;
      position: relative !important;
      z-index: 2 !important;
      display: flex !important;
      align-items: center !important;
    `;

    // Create emoji span
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = '🌿';
    emojiSpan.style.cssText = `
      font-size: ${emojiFontSize} !important;
      margin-left: 4px !important;
      position: relative !important;
      z-index: 2 !important;
    `;

    // Create animated sheen overlay
    const sheenOverlay = document.createElement('div');
    sheenOverlay.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: linear-gradient(90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent) !important;
      pointer-events: none !important;
      z-index: 1 !important;
      animation: grove-sheen-slide 3s ease-in-out infinite !important;
    `;
    const defaultSheenBackground = sheenOverlay.style.background;

    // Assemble the structure
    textSpan.appendChild(emojiSpan);
    button.appendChild(sheenOverlay);
    button.appendChild(textSpan);

    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.background = `${bgHoverColor} !important`;
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = `0 4px 12px ${GROVE_COLORS.shadowHover} !important`;
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = `${bgColor} !important`;
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = `0 2px 8px ${GROVE_COLORS.shadow} !important`;
    });

    // Click handler
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const buttonWrapper = {
        button: button,
        textSpan: textSpan,
        emojiSpan: emojiSpan,
        setLoading: (amount) => {
          ensureEllipsisAnimationStyles();
          button.disabled = true;
          button.style.pointerEvents = 'none';
          // Update button text to show sending state
          const formattedAmount = formatTipAmount(amount);
          const sendingText = formattedAmount ? `Sending $${formattedAmount}` : 'Sending';
          textSpan.textContent = sendingText;
          textSpan.classList.add('grove-ellipsis');
          // Color cycling animation
          const colors = [
            { border: '#389f58', shadow: '0 0 12px #389f58' },
            { border: '#4fb76d', shadow: '0 0 12px #4fb76d' },
            { border: '#f0ad4e', shadow: '0 0 12px #f0ad4e' },
            { border: '#4fb76d', shadow: '0 0 12px #4fb76d' },
          ];
          let colorIndex = 0;
          button._loadingInterval = setInterval(() => {
            colorIndex++;
            const color = colors[colorIndex % colors.length];
            button.style.setProperty('border-color', color.border, 'important');
            button.style.setProperty('box-shadow', color.shadow, 'important');
          }, 150);
        },
        setSuccess: () => {
          if (button._loadingInterval) {
            clearInterval(button._loadingInterval);
          }
          button.disabled = false;
          button.style.pointerEvents = '';
          button.style.setProperty('border', `2px solid ${GROVE_COLORS.primary}`, 'important');
          button.style.setProperty('box-shadow', `0 2px 8px ${GROVE_COLORS.shadow}`, 'important');
          sheenOverlay.style.background = defaultSheenBackground;
          textSpan.classList.remove('grove-ellipsis');
          textSpan.textContent = 'Sent! ✓';
          button.classList.add('animate__animated', 'animate__bounceIn');
          setTimeout(() => {
            textSpan.textContent = 'Tip';
            textSpan.appendChild(emojiSpan);
            button.classList.remove('animate__animated', 'animate__bounceIn');
          }, 2000);
        },
        setError: () => {
          if (button._loadingInterval) {
            clearInterval(button._loadingInterval);
          }
          button.disabled = false;
          button.style.pointerEvents = '';
          button.style.setProperty('border', `2px solid ${GROVE_COLORS.error || '#ef4444'}`, 'important');
          button.style.setProperty('box-shadow', `0 0 12px ${GROVE_COLORS.errorShadow || 'rgba(239, 68, 68, 0.55)'}`, 'important');
          sheenOverlay.style.background = 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.35), transparent)';
          textSpan.classList.remove('grove-ellipsis');
          textSpan.textContent = 'Failed ✗';
          button.classList.add('animate__animated', 'animate__shakeX');
          setTimeout(() => {
            textSpan.textContent = 'Tip';
            textSpan.appendChild(emojiSpan);
            button.classList.remove('animate__animated', 'animate__shakeX');
            button.style.setProperty('border', `2px solid ${GROVE_COLORS.primary}`, 'important');
            button.style.setProperty('box-shadow', `0 2px 8px ${GROVE_COLORS.shadow}`, 'important');
            sheenOverlay.style.background = defaultSheenBackground;
          }, 2000);
        }
      };

      await handleTweetTipClick(buttonWrapper, tweetUrl);
    });

    // Insert after the date element
    if (dateElement.parentElement) {
      dateElement.parentElement.insertBefore(button, dateElement.nextSibling);
    }
  }

  /**
   * Handle tip click for a tweet
   * @param {Object} buttonWrapper - Button wrapper with state methods
   * @param {string} tweetUrl - The tweet URL to tip
   */
  async function handleTweetTipClick(buttonWrapper, tweetUrl) {
    // Check if extension context is valid
    if (!isExtensionContextValid()) {
      console.error("[Grove Extension] Extension context invalidated");
      buttonWrapper.setError();
      showInlineTipError(buttonWrapper.button, {
        message: 'Extension was reloaded. Please refresh the page.',
        variant: 'error'
      });
      return;
    }

    // Get settings from storage
    let tipAmount = 0.02;
    let confirmBeforeTipping = false;
    let hasTipped = false;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['GROVE_TIP_AMOUNT', 'GROVE_CONFIRM_TIP', 'GROVE_HAS_TIPPED']);
        tipAmount = result.GROVE_TIP_AMOUNT || 0.02;
        confirmBeforeTipping = result.GROVE_CONFIRM_TIP || false;
        hasTipped = result.GROVE_HAS_TIPPED || false;
      }
    } catch (error) {
      console.error("[Grove Extension] Settings load failed:", error);
      buttonWrapper.setError();
      showInlineTipError(buttonWrapper.button, {
        message: 'Extension was reloaded. Please refresh the page.',
        variant: 'error'
      });
      return;
    }

    // If this is the user's first tip, show the first tip modal
    if (!hasTipped) {
      if (!firstTipModal) {
        firstTipModal = new FirstTipModal();
      }

      firstTipModal.show(
        buttonWrapper.button,
        tipAmount,
        confirmBeforeTipping,
        async ({ amount, confirmBeforeTipping: newConfirmSetting }) => {
          // Save preferences and mark as having tipped
          try {
            await chrome.storage.local.set({
              'GROVE_TIP_AMOUNT': amount,
              'GROVE_CONFIRM_TIP': newConfirmSetting,
              'GROVE_HAS_TIPPED': true
            });
          } catch (e) {
            console.error("[Grove Extension] Failed to save first tip preferences:", e);
          }
          // Send the tip
          sendTweetTip(amount, buttonWrapper, tweetUrl);
        },
        () => {
          console.log("[Grove Extension] First tip cancelled");
        }
      );
      return;
    }

    // If confirmation disabled, send tip directly
    if (!confirmBeforeTipping) {
      sendTweetTip(tipAmount, buttonWrapper, tweetUrl);
      return;
    }

    // Create popover if needed
    if (!tipPopover) {
      tipPopover = new TipPopover();
    }

    // Show popover with amount confirmation
    tipPopover.show(
      buttonWrapper.button,
      tipAmount,
      (confirmedAmount) => {
        sendTweetTip(confirmedAmount, buttonWrapper, tweetUrl);
      },
      () => {
        console.log("[Grove Extension] Tweet tip cancelled");
      }
    );
  }

  // DEFAULT_AUTO_REPLY_MESSAGE is loaded from src/ui/constants.js

  /**
   * Build auto-reply message from template
   * buildAutoReplyMessage is imported from src/content/xFeatures.js
   */

  /**
   * Send tip for a tweet
   * @param {number} tipAmount - The amount to tip
   * @param {Object} buttonWrapper - Button wrapper with state methods
   * @param {string} tweetUrl - The tweet URL to tip
   */
  async function sendTweetTip(tipAmount, buttonWrapper, tweetUrl) {
    buttonWrapper.setLoading(tipAmount);

    // Check if extension context is valid before making API calls
    if (!isExtensionContextValid()) {
      console.error("[Grove Extension] Extension context invalidated");
      buttonWrapper.setError();
      showInlineTipError(buttonWrapper.button, {
        message: 'Extension was reloaded. Please refresh the page.',
        variant: 'error'
      });
      return;
    }

    // Get JWT and settings from storage
    let jwt = '';
    let autoReplyEnabled = true; // Default to true
    let autoReplyMessage = DEFAULT_AUTO_REPLY_MESSAGE;
    let likeOnTipEnabled = true; // Default to true
    let chainName = 'Base Sepolia';
    let explorerBaseUrl = 'https://sepolia.basescan.org/tx/';
    let explorerSuffix = '';

    try {

      // Get JWT using dev mode-aware getter
      jwt = await getActiveJWT() || '';

      // Get other settings from storage
      const result = await chrome.storage.local.get(['GROVE_AUTO_REPLY', 'GROVE_AUTO_REPLY_MESSAGE', 'GROVE_LIKE_ON_TIP', 'groveChain']);
      // Auto-reply defaults to true (only false if explicitly set to false)
      autoReplyEnabled = result.GROVE_AUTO_REPLY !== false;
      autoReplyMessage = result.GROVE_AUTO_REPLY_MESSAGE || DEFAULT_AUTO_REPLY_MESSAGE;
      // Like on tip defaults to true
      likeOnTipEnabled = result.GROVE_LIKE_ON_TIP !== false;
      console.log('[Grove Extension] Storage loaded:', { hasJwt: !!jwt, autoReply: autoReplyEnabled, likeOnTip: likeOnTipEnabled, chain: result.groveChain });

      // Get friendly chain name and explorer URL
      // Normalize chain: replace underscores with hyphens, default to mainnet
      const rawChain = result.groveChain || 'base';
      const chain = rawChain.toLowerCase().replace(/_/g, '-');
      const chainConfig = {
        'base': { name: 'Base', explorer: 'https://basescan.org/tx/' },
        'base-sepolia': { name: 'Base Sepolia', explorer: 'https://sepolia.basescan.org/tx/' }
        // Solana chains commented out - Base/Base Sepolia only for now
        // 'solana': { name: 'Solana', explorer: 'https://solscan.io/tx/' },
        // 'solana-devnet': { name: 'Solana Devnet', explorer: 'https://solscan.io/tx/' }
      };
      const config = chainConfig[chain] || chainConfig['base'];
      chainName = config.name;
      explorerBaseUrl = config.explorer;
      // Solana devnet cluster param commented out - Base/Base Sepolia only for now
      // if (chain === 'solana-devnet') {
      //   explorerBaseUrl = 'https://solscan.io/tx/';
      //   explorerSuffix = '?cluster=devnet';
      // }

      if (!jwt) {
        console.error("[Grove Extension] No API key configured. Try refreshing the page if you just reloaded the extension.");
        buttonWrapper.setError();
        showInlineTipError(buttonWrapper.button, {
          message: 'Missing tipping key in the extension settings.',
          variant: 'error'
        });
        return;
      }
    } catch (error) {
      console.error("[Grove Extension] Settings load failed:", error);
      buttonWrapper.setError();
      showInlineTipError(buttonWrapper.button, {
        message: error.message || 'Could not read settings. Refresh and try again.',
        variant: 'error'
      });
      return;
    }

    // Determine tip destination: use cached address if available (from bio fetch)
    // This is important because the backend won't know to look in the user's bio
    let tipDestination = tweetUrl;
    const username = extractUsernameFromUrl(tweetUrl);
    if (username) {
      const cached = getCachedAddress(username);
      if (cached && cached.address) {
        // Use the cached address directly (ENS name or 0x address)
        tipDestination = cached.address;
        console.log(`[Grove Extension] Tipping to ${cached.type} address: ${tipDestination} (from @${username})`);
      }
    }

    // Build context metadata for the tip
    // Note: sender_platform can be 'x' or 'twitter' - both map to X/Twitter
    const context = {
      source_post_url: tweetUrl,
      sender_platform: 'x'
    };
    if (username) {
      context.recipient_username = username;
      context.recipient_profile_url = `https://x.com/${username}`;
    }

    // Add sender info if X is authenticated (from xFeatures.js)
    if (typeof addXSenderInfo === 'function') {
      await addXSenderInfo(context);
    }

    // Send tip via API with context
    const response = await GroveAPI.sendTip(tipDestination, tipAmount, jwt, context);

    let parsedError = null;
    if (!response.success && typeof TipErrorHandler !== 'undefined') {
      try {
        parsedError = TipErrorHandler.parse(response);
      } catch (e) {
        console.error("[Grove Extension] Error parsing tip error:", e);
      }
    }

    if (response.success) {
      buttonWrapper.setSuccess();

      // Like and/or reply if X features are enabled
      if ((likeOnTipEnabled || autoReplyEnabled) && typeof XAuth !== 'undefined') {
        try {
          const tweetId = XAuth.extractTweetId(tweetUrl);
          if (tweetId) {
            const isLoggedIn = await XAuth.isLoggedIn();
            if (isLoggedIn) {
              let didLike = false;
              let didReply = false;
              let likeFailed = false;
              let replyFailed = false;

              // Like the tweet if enabled
              if (likeOnTipEnabled) {
                try {
                  await XAuth.likeTweet(tweetId);
                  console.log("[Grove Extension] Tweet liked successfully");
                  didLike = true;
                } catch (likeError) {
                  // Don't fail if like fails (might already be liked or rate limited)
                  console.error("[Grove Extension] Like failed:", likeError);
                  likeFailed = true;
                }
              }

              // Post auto-reply if enabled
              if (autoReplyEnabled) {
                const txHash = response.data?.tx_hash || '';
                const txLink = `${explorerBaseUrl}${txHash}${explorerSuffix}`;

                // Build reply text from template
                const replyText = buildAutoReplyMessage(autoReplyMessage, {
                  username: username,
                  chain: chainName,
                  tx_link: txLink,
                  grove_link: 'grove.city'
                });

                try {
                  await XAuth.postReply(tweetId, replyText);
                  console.log("[Grove Extension] Auto-reply posted successfully");
                  didReply = true;
                } catch (replyError) {
                  console.error("[Grove Extension] Reply failed:", replyError);
                  replyFailed = true;
                }
              }

              // Show feedback message based on what happened
              // Delay slightly to let the success animation settle before positioning bubble
              setTimeout(() => {
                if (didLike || didReply) {
                  // At least one action succeeded
                  let message = '';
                  if (didLike && didReply) {
                    message = 'Liked & replied! Refresh to view.';
                  } else if (didLike) {
                    message = 'Post liked! Refresh to view.';
                  } else if (didReply) {
                    message = 'Reply sent! Refresh to view.';
                  }
                  showInlineTipError(buttonWrapper.button, { message, variant: 'success' });
                } else if (likeFailed || replyFailed) {
                  // All attempted actions failed - show warning
                  let message = '';
                  if (likeFailed && replyFailed) {
                    message = 'Like & reply failed (rate limited?)';
                  } else if (likeFailed) {
                    message = 'Like failed (rate limited?)';
                  } else if (replyFailed) {
                    message = 'Reply failed (rate limited?)';
                  }
                  showInlineTipError(buttonWrapper.button, { message, variant: 'warning' });
                }
              }, 100);
            } else {
              console.log("[Grove Extension] X features skipped - not logged in to X");
            }
          }
        } catch (error) {
          // Don't fail the whole tip if X features fail
          console.error("[Grove Extension] X features failed:", error);
        }
      }
    } else {
      console.error("[Grove Extension] Tweet tip failed:", response.error, response.data);
      buttonWrapper.setError();
      // Ensure we always have a message to show
      const errorMessage = parsedError?.userMessage || parsedError?.message || response.error || 'Tip failed. Please try again.';
      showInlineTipError(buttonWrapper.button, errorMessage);
    }
  }

  // Use shared detectDarkMode from src/utils/darkMode.js if available
  // The shared module is loaded before content.js in manifest.json

  /**
   * Clean up when page changes
   */
  function cleanup() {
    if (currentButton) {
      currentButton.remove();
      currentButton = null;
    }
    // Also remove floating container if it exists
    const floatingContainer = document.getElementById('grove-floating-container');
    if (floatingContainer) {
      floatingContainer.remove();
    }
    if (typeof HoverCardHandler !== 'undefined') {
      HoverCardHandler.stopObserving();
    }
    if (tweetObserver) {
      tweetObserver.disconnect();
      tweetObserver = null;
    }
    if (tipPopover) {
      tipPopover.hide();
      tipPopover = null;
    }
    if (firstTipModal) {
      firstTipModal.hide();
      firstTipModal = null;
    }
    currentAdapter = null;
    resolvedAddress = null;
    // Note: We don't clear addressCache on navigation as it helps with re-visiting profiles
  }

  /**
   * Watch for navigation changes (SPAs like Twitter)
   */
  function watchForNavigation() {
    // Clean up existing observer if any
    if (navigationObserver) {
      navigationObserver.disconnect();
    }

    let lastUrl = window.location.href;

    // Use MutationObserver to detect URL changes in SPAs
    navigationObserver = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        cleanup();
        setTimeout(init, 1000); // Wait for page to settle
      }
    });

    navigationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Start the extension
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Watch for navigation changes
  watchForNavigation();

})();
