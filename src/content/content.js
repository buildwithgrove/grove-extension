/**
 * Grove Extension Content Script
 * Main orchestrator that detects platform, extracts addresses, and injects tip button
 */

(function () {
  "use strict";

  // JWT Storage Keys (must match keyManager.js and popup.js)
  const JWT_KEYS = {
    PRODUCTION: 'GROVE_JWT_PRODUCTION',
    TESTNET: 'GROVE_JWT_TESTNET',
    LOCALHOST: 'GROVE_JWT_LOCALHOST',
    ENVIRONMENT: 'groveEnvironment',
    ENDPOINT: 'groveEndpoint',
  };

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
        chrome.storage.local.get([JWT_KEYS.PRODUCTION, JWT_KEYS.TESTNET, JWT_KEYS.LOCALHOST, JWT_KEYS.ENVIRONMENT, JWT_KEYS.ENDPOINT], (result) => {
          // Check for Chrome runtime errors (e.g., context invalidated during the call)
          if (chrome.runtime.lastError) {
            reject(new Error('Extension was reloaded. Please refresh the page.'));
            return;
          }

          const isDevMode = result[JWT_KEYS.ENVIRONMENT] === 'local';
          const endpoint = result[JWT_KEYS.ENDPOINT] || 'production';

          let jwt;
          if (!isDevMode) {
            jwt = result[JWT_KEYS.PRODUCTION];
          } else if (endpoint === 'localhost') {
            jwt = result[JWT_KEYS.LOCALHOST];
          } else if (endpoint === 'testnet') {
            jwt = result[JWT_KEYS.TESTNET];
          } else {
            jwt = result[JWT_KEYS.PRODUCTION];
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

  // Configuration
  const ADVERTISING_MODE = true; // Set to true for more prominent button animation

  // State
  let currentButton = null;
  let currentAdapter = null;
  let hoverCardObserver = null;
  let navigationObserver = null;
  let tweetObserver = null;
  let tipPopover = null;
  let firstTipModal = null;
  let resolvedAddress = null; // Stores address info (0x address or ENS name)

  // Address cache: maps username -> { address, type, original, timestamp }
  // Cache entries expire after 10 minutes
  const addressCache = new Map();
  const ADDRESS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // Track which tweets already have buttons to avoid duplicates
  const processedTweets = new WeakSet();

  // Bio fetch queue: usernames pending background bio fetch
  const bioFetchQueue = new Set();
  const bioFetchInProgress = new Set();
  const BIO_FETCH_INTERVAL = 300; // ms between fetches (rate limiting)
  const BIO_FETCH_MAX_CONCURRENT = 3; // Allow some parallelism
  let bioFetchTimer = null;
  let bioFetchActiveCount = 0;

  // Track tweet elements by username for button injection after bio fetch
  // Maps username -> Set of { tweetElement, tweetUrl, dateElement, isQuotedTweet }
  const pendingTweetButtons = new Map();

  // Twitter API configuration for bio fetching
  // Bearer token is public and used by Twitter's web client
  const TWITTER_BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
  // GraphQL query ID for UserByScreenName - Twitter rotates these, may need updating
  // To find current ID: open x.com profile, check Network tab for UserByScreenName request
  const TWITTER_USER_BY_SCREEN_NAME_QUERY_ID = 'G3KGOASz96M-Qu0nwmGXNg';
  let twitterCsrfToken = null;

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

    // Reddit support commented out - X only for now
    // if (currentAdapter.getPlatformName() === "reddit") {
    //   setupRedditHoverCardObserver();
    //
    //   // Also check if we're on a profile page and handle it
    //   if (currentAdapter.detectProfilePage()) {
    //     await initializeProfileButton();
    //   }
    //   return;
    // }

    // For Twitter/X, handle tweet tip buttons on all pages
    if (currentAdapter.getPlatformName() === "twitter") {
      // If on a profile page, initialize profile button first (this caches the address)
      if (currentAdapter.detectProfilePage()) {
        await initializeProfileButton();
      }

      // Always set up tweet observer on Twitter (after profile init so cache is populated)
      setupTwitterTweetObserver();

      // Also set up hover card observer for profile popups
      setupTwitterHoverCardObserver();
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
    await initializeProfileButton();
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

    // Reddit support commented out - X only for now
    // if (hostname.includes("reddit.com")) {
    //   return new RedditAdapter();
    // }

    // YouTube support commented out - X only for now
    // if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    //   return new YouTubeAdapter();
    // }

    // Return GenericAdapter for all other websites
    // Only if GenericAdapter is available (loaded via manifest)
    if (typeof GenericAdapter !== 'undefined') {
      return new GenericAdapter();
    }

    return null;
  }

  /**
   * Initialize profile button (reusable for different profile types)
   * Handles profile page logic for extracting bio, checking for addresses, and injecting button
   */
  async function initializeProfileButton() {

    try {
      // Wait for profile to load (if adapter supports it)
      if (typeof currentAdapter.waitForProfileLoad === "function") {
        const loaded = await currentAdapter.waitForProfileLoad();
        if (!loaded) {
          return;
        }
      }


      // Extract bio to check for addresses
      const bio = currentAdapter.extractBio();

      // YouTube support commented out - X only for now
      // if (currentAdapter.getPlatformName() !== 'youtube') {
      if (true) {
        if (!bio) {
          console.log("[Grove Extension] No bio found - not showing button");
          return;
        }

        console.log("[Grove Extension] Bio extracted");

        // Check if bio contains tippable address
        const hasAddress = AddressParser.hasAddresses(bio);
        if (!hasAddress) {
          console.log("[Grove Extension] No tippable address found in bio - not showing button");
          return;
        }

        // Extract address (ENS names are resolved by the backend)
        const result = AddressParser.resolveAddress(bio);
        if (!result.address) {
          console.log("[Grove Extension] Could not extract address - not showing button");
          return;
        }

        resolvedAddress = result;
        console.log(`[Grove Extension] ✅ Address detected: ${result.address} (type: ${result.type})`)

        // Cache the address by username for tweet tip buttons
        if (currentAdapter.getPlatformName() === 'twitter') {
          const username = extractUsernameFromUrl(window.location.href);
          if (username) {
            setCachedAddress(username, result);
            console.log(`[Grove Extension] Cached address for @${username}`);
          }
        }
      // YouTube support commented out - X only for now
      // } else {
      //   console.log("[Grove Extension] YouTube detected - skipping address validation");
      }

      // Get button placement location
      const placement = currentAdapter.getButtonPlacement();
      if (!placement) {
        console.log("[Grove Extension] Could not find button placement location");
        return;
      }

      // Create and inject tip button
      const platformName = currentAdapter.getPlatformName();
      currentButton = new TipButton(handleTipClick, platformName);

      const button = currentButton.create();

      // Apply advertising mode class if enabled
      if (ADVERTISING_MODE) {
        button.classList.add("grove-ad-mode");
      }

      currentButton.inject(placement);
    } catch (error) {
      console.error("[Grove Extension] Button initialization failed:", error);
    }
  }

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
    let tipAmount = 0.10; // default
    let confirmBeforeTipping = false; // default off
    let hasTipped = false; // whether user has tipped before

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['GROVE_TIP_AMOUNT', 'GROVE_CONFIRM_TIP', 'GROVE_HAS_TIPPED']);
        tipAmount = result.GROVE_TIP_AMOUNT || 0.10;
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
            message: 'Missing secret key in the extension settings.',
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

    // Determine tip destination: use ENS name directly if available, otherwise page URL
    let tipDestination = window.location.href;
    if (resolvedAddress && resolvedAddress.type === 'ens') {
      tipDestination = resolvedAddress.address; // e.g., "vitalik.eth"
      console.log(`[Grove Extension] Tipping to ENS name: ${tipDestination}`);
    }

    // Build context metadata for the tip
    // Note: sender_platform can be 'x' or 'twitter' - both map to X/Twitter
    const username = extractUsernameFromUrl(window.location.href);
    const context = {
      source_post_url: window.location.href,
      sender_platform: 'x'
    };
    if (username) {
      context.recipient_username = username;
      context.recipient_profile_url = `https://x.com/${username}`;
    }

    // Add sender info if X is authenticated with real username
    if (typeof XAuth !== 'undefined') {
      try {
        const senderInfo = await XAuth.getStoredUserInfo();
        // Only use if we have a real username (not the fallback 'Connected')
        if (senderInfo && senderInfo.username && senderInfo.username !== 'Connected') {
          context.sender_username = senderInfo.username;
          context.sender_profile_url = `https://x.com/${senderInfo.username}`;
        }
      } catch (e) {
        // Ignore - sender info is optional
      }
    }

    // Send tip via API with JWT, amount, and context
    const response = await GroveAPI.sendTip(tipDestination, tipAmount, jwt, context);

    const parsedError = (!response.success && typeof TipErrorHandler !== 'undefined')
      ? TipErrorHandler.parse(response)
      : null;

    // Handle response with animations
    if (response.success) {
      if (button) {
        button.setSuccess();
      }
    } else {
      console.error("[Grove Extension] Tip failed:", response.error);
      if (button) {
        button.setError();
        showInlineTipError(button.button, parsedError || response.error || 'Tip failed. Please try again.');
      }
    }
  }

  // Reddit hover card functions commented out - X only for now
  // /**
  //  * Setup observer for Reddit hover cards
  //  * Reddit hover cards appear dynamically, so we need to watch for them
  //  */
  // function setupRedditHoverCardObserver() {
  //   // Clean up existing observer
  //   if (hoverCardObserver) {
  //     hoverCardObserver.disconnect();
  //   }
  //
  //   hoverCardObserver = new MutationObserver((mutations) => {
  //     for (const mutation of mutations) {
  //       for (const node of mutation.addedNodes) {
  //         if (node.nodeType === Node.ELEMENT_NODE) {
  //           // Check if this is a hover card
  //           const hoverCard = node.querySelector
  //             ? node.querySelector('[data-testid="user-hover-card"]')
  //             : null;
  //
  //           if (hoverCard || (node.dataset && node.dataset.testid === "user-hover-card")) {
  //             injectButtonIntoHoverCard(hoverCard || node);
  //           }
  //         }
  //       }
  //     }
  //   });
  //
  //   // Start observing the document body for new elements
  //   hoverCardObserver.observe(document.body, {
  //     childList: true,
  //     subtree: true,
  //   });
  //
  // }
  //
  // /**
  //  * Inject button into Reddit hover card
  //  * @param {Element} hoverCard - The hover card element
  //  */
  // async function injectButtonIntoHoverCard(hoverCard) {
  //
  //   // Check if button already exists in this hover card
  //   if (hoverCard.querySelector("#grove-tip-button")) {
  //     return;
  //   }
  //
  //   // Extract bio from hover card
  //   const bioSpan = hoverCard.querySelector(".whitespace-normal");
  //   if (!bioSpan) {
  //     return;
  //   }
  //
  //   const bio = bioSpan.textContent;
  //
  //   // Check if bio contains tippable address
  //   const hasAddress = AddressParser.hasAddresses(bio);
  //   if (!hasAddress) {
  //     return;
  //   }
  //
  //   // Extract address (ENS names are resolved by the backend)
  //   const result = AddressParser.resolveAddress(bio);
  //   if (!result.address) {
  //     console.log("[Grove Extension] Could not extract address in hover card");
  //     return;
  //   }
  //
  //   console.log(`[Grove Extension] Address found in hover card: ${result.address} (type: ${result.type})`)
  //
  //   // Store for this hover card's tip button
  //   const hoverCardResolvedAddress = result;
  //
  //   // Find the main content div that contains everything
  //   const contentDiv = hoverCard.querySelector(".p-md.flex.flex-col");
  //   if (!contentDiv) {
  //     return;
  //   }
  //
  //   // Find the top row with avatar and user info
  //   const topRow = contentDiv.querySelector(".flex.flex-row.justify-items-start.items-center");
  //   if (!topRow) {
  //     return;
  //   }
  //
  //   // Create and inject tip button with click handler
  //   const tipButton = new TipButton(() => {
  //     handleTipClick(tipButton);
  //   }, "reddit");
  //
  //   const button = tipButton.create();
  //
  //   // Apply advertising mode class if enabled
  //   if (ADVERTISING_MODE) {
  //     button.classList.add("grove-ad-mode");
  //   }
  //
  //   // Append button to the end of the top row (after user info)
  //   topRow.appendChild(button);
  // }

  /**
   * Setup observer for Twitter hover cards (profile popups)
   */
  function setupTwitterHoverCardObserver() {
    // Use the existing hoverCardObserver variable
    if (hoverCardObserver) {
      hoverCardObserver.disconnect();
    }

    hoverCardObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Twitter hover cards appear in a div with data-testid="HoverCard"
            // or in a [data-testid="hoverCardParent"]
            let hoverCard = null;

            if (node.matches && node.matches('[data-testid="HoverCard"]')) {
              hoverCard = node;
            } else if (node.querySelector) {
              hoverCard = node.querySelector('[data-testid="HoverCard"]');
            }

            if (hoverCard) {
              injectButtonIntoTwitterHoverCard(hoverCard);
            }
          }
        }
      }
    });

    hoverCardObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Inject tip button into Twitter hover card
   * @param {Element} hoverCard - The hover card element
   */
  function injectButtonIntoTwitterHoverCard(hoverCard) {
    // Check if button already exists
    if (hoverCard.querySelector('.grove-hovercard-tip-button')) {
      return;
    }

    // Find the top-right area - look for the follow button or the card header
    // The hover card has a structure with user info at the top
    const followButton = hoverCard.querySelector('[data-testid$="-follow"]') ||
                         hoverCard.querySelector('[data-testid$="-unfollow"]');

    if (!followButton) {
      // Try to find any button container in the top area
      return;
    }

    const buttonContainer = followButton.parentElement;
    if (!buttonContainer) return;

    // Get the username from the hover card to build the profile URL
    const usernameLink = hoverCard.querySelector('a[href^="/"][role="link"]');
    let profileUrl = null;
    let username = null;
    if (usernameLink) {
      const href = usernameLink.getAttribute('href');
      if (href && /^\/[a-zA-Z0-9_]+$/.test(href)) {
        profileUrl = `https://x.com${href}`;
        username = href.substring(1); // Remove leading slash
      }
    }

    if (!profileUrl) return;

    // Check if user has a tippable address in display name or bio
    // First check the cache
    if (username) {
      const cached = getCachedAddress(username);
      if (cached === 'no-address') {
        return; // Already checked, no address found
      }
      if (cached && cached.address) {
        // Has cached address, proceed to show button
      } else {
        // Not cached, need to check display name and bio
        let hasTippableAddress = false;

        // Check display name (the bold name shown in hover card)
        const displayNameElement = hoverCard.querySelector('[data-testid="UserName"]') ||
                                   hoverCard.querySelector('a[href^="/"][role="link"] span');
        const displayName = displayNameElement?.textContent || '';

        if (displayName && AddressParser.hasAddresses(displayName)) {
          const addressResult = AddressParser.resolveAddress(displayName);
          if (addressResult.address) {
            hasTippableAddress = true;
            setCachedAddress(username, addressResult);
            console.log(`[Grove Extension] Hover card: Found address in display name for @${username}: ${addressResult.address}`);
          }
        }

        // If not in display name, check bio/description
        if (!hasTippableAddress) {
          const bioElement = hoverCard.querySelector('[data-testid="UserDescription"]');
          const bio = bioElement?.textContent || '';

          if (bio && AddressParser.hasAddresses(bio)) {
            const addressResult = AddressParser.resolveAddress(bio);
            if (addressResult.address) {
              hasTippableAddress = true;
              setCachedAddress(username, addressResult);
              console.log(`[Grove Extension] Hover card: Found address in bio for @${username}: ${addressResult.address}`);
            }
          }
        }

        // If no tippable address found, cache negative result and return
        if (!hasTippableAddress) {
          setCachedAddress(username, 'no-address');
          return;
        }
      }
    }

    // Create the tip button
    const isDarkMode = detectDarkMode();
    const bgColor = isDarkMode ? '#1a1a1a' : '#ffffff';
    const bgHoverColor = isDarkMode ? '#252525' : '#f0f0f0';
    const textColor = isDarkMode ? '#ffffff' : '#1a1a1a';

    const button = document.createElement('button');
    button.className = 'grove-hovercard-tip-button';
    button.setAttribute('aria-label', 'Send a tip');
    button.setAttribute('type', 'button');

    button.style.cssText = `
      background: ${bgColor} !important;
      border: 2px solid ${GROVE_COLORS.primary} !important;
      border-radius: 9999px !important;
      padding: 0 16px !important;
      height: 32px !important;
      min-height: 32px !important;
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
      line-height: 1 !important;
    `;

    // Create text span
    const textSpan = document.createElement('span');
    textSpan.textContent = 'Tip';
    textSpan.style.cssText = `
      color: ${textColor} !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      position: relative !important;
      z-index: 2 !important;
      display: flex !important;
      align-items: center !important;
    `;

    // Create emoji span
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = '🌿';
    emojiSpan.style.cssText = `
      font-size: 15px !important;
      margin-left: 4px !important;
      position: relative !important;
      z-index: 2 !important;
    `;

    // Create sheen overlay
    const sheenOverlay = document.createElement('div');
    sheenOverlay.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent) !important;
      pointer-events: none !important;
      z-index: 1 !important;
      animation: grove-sheen-slide 3s ease-in-out infinite !important;
    `;
    const defaultSheenBackground = sheenOverlay.style.background;

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
          if (button._loadingInterval) clearInterval(button._loadingInterval);
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
          if (button._loadingInterval) clearInterval(button._loadingInterval);
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

      await handleTweetTipClick(buttonWrapper, profileUrl);
    });

    // Create a wrapper to hold both buttons in a row
    const wrapper = document.createElement('div');
    wrapper.className = 'grove-hovercard-buttons';
    wrapper.style.cssText = `
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 8px !important;
    `;

    // Insert wrapper where follow button is, then move follow button into wrapper
    followButton.parentElement.insertBefore(wrapper, followButton);
    wrapper.appendChild(button);
    wrapper.appendChild(followButton);
  }

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
   * @param {string} username - Twitter username
   * @returns {Object|string|null} - Cached address result, 'no-address', or null if not cached/expired
   */
  function getCachedAddress(username) {
    const cached = addressCache.get(username);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > ADDRESS_CACHE_TTL) {
      addressCache.delete(username);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached address for a username
   * @param {string} username - Twitter username
   * @param {Object|string} data - Address result or 'no-address'
   */
  function setCachedAddress(username, data) {
    addressCache.set(username, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Queue a username for background bio fetch
   * @param {string} username - Twitter username
   * @param {Element} tweetElement - The tweet element to inject button into
   * @param {string} tweetUrl - The tweet URL
   * @param {Element} dateElement - The date element for button placement
   * @param {boolean} isQuotedTweet - Whether this is a quoted tweet
   */
  function queueBioFetch(username, tweetElement, tweetUrl, dateElement, isQuotedTweet = false) {
    // Don't queue if already cached, in progress, or queued
    const cached = getCachedAddress(username);
    if (cached !== null) {
      console.log(`[Grove Extension] queueBioFetch: @${username} already cached`);
      return;
    }
    if (bioFetchInProgress.has(username)) {
      console.log(`[Grove Extension] queueBioFetch: @${username} already in progress`);
      // Still add to pending tweets so button gets injected when fetch completes
    } else if (bioFetchQueue.has(username)) {
      console.log(`[Grove Extension] queueBioFetch: @${username} already in queue`);
      // Still add to pending tweets
    } else {
      // Add to queue
      console.log(`[Grove Extension] queueBioFetch: Adding @${username} to queue (queue size: ${bioFetchQueue.size})`);
      bioFetchQueue.add(username);
    }

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

    // Start processing queue
    scheduleNextBioFetch();
  }

  /**
   * Get Twitter CSRF token from cookies
   * @returns {string|null}
   */
  function getTwitterCsrfToken() {
    if (twitterCsrfToken) return twitterCsrfToken;

    // Extract ct0 cookie (CSRF token used by Twitter)
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'ct0') {
        twitterCsrfToken = value;
        return value;
      }
    }
    return null;
  }

  /**
   * Fetch user bio using Twitter's REST API (v1.1 style via GraphQL gateway)
   * This works because the content script runs in x.com context with user's cookies
   * @param {string} username - Twitter username
   * @returns {Promise<{displayName: string|null, bio: string|null, error?: string}>}
   */
  async function fetchTwitterUserBio(username) {
    console.log(`[Grove Extension] Fetching bio for @${username}...`);

    const csrfToken = getTwitterCsrfToken();
    if (!csrfToken) {
      console.log(`[Grove Extension] No CSRF token found for @${username}`);
      return { displayName: null, bio: null, error: 'No CSRF token found' };
    }

    // Use Twitter's user lookup endpoint (more stable than GraphQL)
    const url = `https://x.com/i/api/graphql/BQ6xjFU6Mgm-WhEP3OiT9w/UserByScreenName?variables=${encodeURIComponent(JSON.stringify({
      screen_name: username,
      withSafetyModeUserFields: true
    }))}&features=${encodeURIComponent(JSON.stringify({
      hidden_profile_subscriptions_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      subscriptions_verification_info_is_identity_verified_enabled: true,
      subscriptions_verification_info_verified_since_enabled: true,
      highlights_tweets_tab_ui_enabled: true,
      responsive_web_twitter_article_notes_tab_enabled: true,
      subscriptions_feature_can_gift_premium: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true
    }))}&fieldToggles=${encodeURIComponent(JSON.stringify({
      withAuxiliaryUserLabels: false
    }))}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${decodeURIComponent(TWITTER_BEARER_TOKEN)}`,
          'x-csrf-token': csrfToken,
          'x-twitter-active-user': 'yes',
          'x-twitter-auth-type': 'OAuth2Session',
          'x-twitter-client-language': 'en',
          'content-type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        // Try to get error details
        const errorText = await response.text().catch(() => '');
        console.log(`[Grove Extension] API response for @${username}: ${response.status} - ${errorText.substring(0, 200)}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Extract user data from GraphQL response
      const user = data?.data?.user?.result;
      if (!user || user.__typename === 'UserUnavailable') {
        return { displayName: null, bio: null, error: 'User not found' };
      }

      const legacy = user.legacy || {};
      console.log(`[Grove Extension] Got bio for @${username}: "${legacy.description?.substring(0, 100)}..."`);
      return {
        displayName: legacy.name || null,
        bio: legacy.description || null
      };
    } catch (error) {
      console.error(`[Grove Extension] Twitter API error for @${username}:`, error);
      return { displayName: null, bio: null, error: error.message };
    }
  }

  /**
   * Process a single bio fetch
   * @param {string} username - Twitter username to fetch
   */
  async function processSingleBioFetch(username) {
    bioFetchActiveCount++;

    try {
      // Fetch bio using Twitter's GraphQL API directly from content script
      const response = await fetchTwitterUserBio(username);

      bioFetchInProgress.delete(username);

      if (response && !response.error) {
        const { displayName, bio } = response;
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
      } else {
        // Fetch failed - cache negative result to avoid retrying
        console.log(`[Grove Extension] Bio fetch failed for @${username}: ${response?.error || 'unknown error'}`);
        setCachedAddress(username, 'no-address');
      }
    } catch (error) {
      bioFetchInProgress.delete(username);
      console.error(`[Grove Extension] Bio fetch error for @${username}:`, error);
      // Don't cache on error - allow retry later
    }

    // Clean up pending tweets for this user
    pendingTweetButtons.delete(username);
    bioFetchActiveCount--;

    // Continue processing queue
    scheduleNextBioFetch();
  }

  /**
   * Schedule the next bio fetch from the queue
   */
  function scheduleNextBioFetch() {
    // Don't schedule if already at max concurrent or queue is empty
    if (bioFetchActiveCount >= BIO_FETCH_MAX_CONCURRENT) return;
    if (bioFetchQueue.size === 0) return;
    if (bioFetchTimer) return; // Already scheduled

    bioFetchTimer = setTimeout(() => {
      bioFetchTimer = null;
      processBioFetchQueue();
    }, BIO_FETCH_INTERVAL);
  }

  /**
   * Process the bio fetch queue - fetches multiple users in parallel
   */
  function processBioFetchQueue() {
    // Process up to MAX_CONCURRENT users
    while (bioFetchActiveCount < BIO_FETCH_MAX_CONCURRENT && bioFetchQueue.size > 0) {
      const username = bioFetchQueue.values().next().value;
      if (!username) break;

      bioFetchQueue.delete(username);
      bioFetchInProgress.add(username);

      // Start fetch (don't await - let it run in parallel)
      processSingleBioFetch(username);
    }

    // Schedule more if queue still has items
    if (bioFetchQueue.size > 0 && bioFetchActiveCount < BIO_FETCH_MAX_CONCURRENT) {
      scheduleNextBioFetch();
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
    let tipAmount = 0.10;
    let confirmBeforeTipping = false;
    let hasTipped = false;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['GROVE_TIP_AMOUNT', 'GROVE_CONFIRM_TIP', 'GROVE_HAS_TIPPED']);
        tipAmount = result.GROVE_TIP_AMOUNT || 0.10;
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

  // Default auto-reply message template (must match popup.js)
  const DEFAULT_AUTO_REPLY_MESSAGE = `Hey @{username}, I just sent you a {amount} tip on {chain}! #TipWithGrove

Tx: {tx_link}

Tip creators you love → {grove_link}`;

  /**
   * Build auto-reply message from template
   * @param {string} template - Message template with placeholders
   * @param {Object} values - Object containing placeholder values
   * @returns {string} - Formatted message
   */
  function buildAutoReplyMessage(template, values) {
    return template
      .replace(/\{username\}/g, values.username || '')
      .replace(/\{amount\}/g, values.amount || '')
      .replace(/\{chain\}/g, values.chain || '')
      .replace(/\{tx_link\}/g, values.tx_link || '')
      .replace(/\{grove_link\}/g, values.grove_link || 'grove.city');
  }

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
    let autoReplyEnabled = true;
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
      // Auto-reply defaults to true
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
          message: 'Missing secret key in the extension settings.',
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

    // Add sender info if X is authenticated with real username
    if (typeof XAuth !== 'undefined') {
      try {
        const senderInfo = await XAuth.getStoredUserInfo();
        // Only use if we have a real username (not the fallback 'Connected')
        if (senderInfo && senderInfo.username && senderInfo.username !== 'Connected') {
          context.sender_username = senderInfo.username;
          context.sender_profile_url = `https://x.com/${senderInfo.username}`;
        }
      } catch (e) {
        // Ignore - sender info is optional
      }
    }

    // Send tip via API with context
    const response = await GroveAPI.sendTip(tipDestination, tipAmount, jwt, context);
    const parsedError = (!response.success && typeof TipErrorHandler !== 'undefined')
      ? TipErrorHandler.parse(response)
      : null;

    if (response.success) {
      buttonWrapper.setSuccess();

      // Like and/or reply if X features are enabled
      if ((likeOnTipEnabled || autoReplyEnabled) && typeof XAuth !== 'undefined') {
        try {
          const tweetId = XAuth.extractTweetId(tweetUrl);
          if (tweetId) {
            const isLoggedIn = await XAuth.isLoggedIn();
            if (isLoggedIn) {
              // Like the tweet if enabled
              if (likeOnTipEnabled) {
                try {
                  await XAuth.likeTweet(tweetId);
                  console.log("[Grove Extension] Tweet liked successfully");
                } catch (likeError) {
                  // Don't fail if like fails (might already be liked)
                  console.error("[Grove Extension] Like failed:", likeError);
                }
              }

              // Post auto-reply if enabled
              if (autoReplyEnabled) {
                const txHash = response.data?.tx_hash || '';
                const txLink = `${explorerBaseUrl}${txHash}${explorerSuffix}`;

                // Build reply text from template
                const replyText = buildAutoReplyMessage(autoReplyMessage, {
                  username: username,
                  amount: `$${tipAmount.toFixed(2)} USDC`,
                  chain: chainName,
                  tx_link: txLink,
                  grove_link: 'grove.city'
                });

                await XAuth.postReply(tweetId, replyText);
                console.log("[Grove Extension] Auto-reply posted successfully");
              }
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
      console.error("[Grove Extension] Tweet tip failed:", response.error);
      buttonWrapper.setError();
      showInlineTipError(buttonWrapper.button, parsedError || response.error || 'Tip failed. Please try again.');
    }
  }

  /**
   * Detect if page is in dark mode
   * @returns {boolean}
   */
  function detectDarkMode() {
    // Check Twitter's background color
    const bg = document.body.style.backgroundColor ||
               window.getComputedStyle(document.body).backgroundColor;
    if (bg) {
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const luminance = (0.299 * parseInt(match[1]) + 0.587 * parseInt(match[2]) + 0.114 * parseInt(match[3])) / 255;
        return luminance < 0.5;
      }
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

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
    if (hoverCardObserver) {
      hoverCardObserver.disconnect();
      hoverCardObserver = null;
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
