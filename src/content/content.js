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
  let soundCloudTrackObserver = null;
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

  // Track which SoundCloud tracks already have buttons to avoid duplicates
  const processedSoundCloudTracks = new WeakSet();

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
        onTipClick: (buttonWrapper, tweetUrl) => TweetTipHandler.handleTipClick(buttonWrapper, tweetUrl),
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

  // Initialize TweetTipHandler with callbacks
  if (typeof TweetTipHandler !== 'undefined') {
    TweetTipHandler.init(
      {
        detectDarkMode: detectDarkMode,
        ensureEllipsisStyles: ensureEllipsisAnimationStyles,
        formatTipAmount: formatTipAmount,
        isExtensionContextValid: isExtensionContextValid,
        showInlineTipError: showInlineTipError,
        getActiveJWT: getActiveJWT,
        getCachedAddress: getCachedAddress,
        extractUsernameFromUrl: extractUsernameFromUrl,
        addXSenderInfo: typeof addXSenderInfo === 'function' ? addXSenderInfo : null,
        buildAutoReplyMessage: typeof buildAutoReplyMessage === 'function' ? buildAutoReplyMessage : null,
        getDefaultAutoReplyMessage: () => DEFAULT_AUTO_REPLY_MESSAGE
      },
      typeof GROVE_COLORS !== 'undefined' ? GROVE_COLORS : null
    );
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

    // For SoundCloud, handle profile page and track tip buttons
    if (currentAdapter.getPlatformName() === "soundcloud") {
      // If on a profile page, initialize profile button first (this caches the address)
      if (currentAdapter.detectProfilePage()) {
        if (typeof ProfilePageHandler !== 'undefined') {
          const result = await ProfilePageHandler.initialize(currentAdapter);
          if (result) {
            resolvedAddress = result;
            currentButton = ProfilePageHandler.getButton();

            // Set up track observer to add tip buttons to individual tracks
            setupSoundCloudTrackObserver();
          }
        }
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
      return new window.TwitterAdapter();
    }

    if (hostname.includes("soundcloud.com")) {
      return new window.SoundCloudAdapter();
    }

    // Return GenericAdapter for all other websites
    // Only if GenericAdapter is available (loaded via manifest)
    if (typeof window.GenericAdapter !== 'undefined') {
      return new window.GenericAdapter();
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
    const platformName = currentAdapter.getPlatformName();
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
      if (platformName === 'twitter') {
        context.recipient_profile_url = `https://x.com/${username}`;
      } else if (platformName === 'soundcloud') {
        context.recipient_profile_url = `https://soundcloud.com/${username}`;
      }
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

      // For X profile tips, send a tweet mentioning the user
      if (platformName === 'twitter' && typeof XAuth !== 'undefined') {
        try {
          // Get X feature settings
          const xSettings = await chrome.storage.local.get(['GROVE_AUTO_REPLY', 'GROVE_AUTO_REPLY_MESSAGE', 'groveChain']);
          const autoReplyEnabled = xSettings.GROVE_AUTO_REPLY !== false;

          if (autoReplyEnabled) {
            const isLoggedIn = await XAuth.isLoggedIn();
            if (isLoggedIn && username) {
              // Get chain config for the message
              const rawChain = xSettings.groveChain || 'base';
              const chain = rawChain.toLowerCase().replace(/_/g, '-');
              const chainConfig = {
                'base': { name: 'Base', explorer: 'https://basescan.org/tx/' },
                'base-sepolia': { name: 'Base Sepolia', explorer: 'https://sepolia.basescan.org/tx/' }
              };
              const config = chainConfig[chain] || chainConfig['base'];
              const chainName = config.name;
              const explorerBaseUrl = config.explorer;

              const txHash = response.data?.tx_hash || '';
              const txLink = `${explorerBaseUrl}${txHash}`;

              // Build tweet text from template
              const autoReplyMessage = xSettings.GROVE_AUTO_REPLY_MESSAGE || DEFAULT_AUTO_REPLY_MESSAGE;
              const tweetText = buildAutoReplyMessage(autoReplyMessage, {
                username: username,
                chain: chainName,
                tx_link: txLink,
                grove_link: 'grove.city'
              });

              try {
                await XAuth.postTweet(tweetText);
                console.log("[Grove Extension] Profile tip tweet posted successfully");
                // Show success feedback
                setTimeout(() => {
                  showInlineTipError(button.button, { message: 'Tweet sent!', variant: 'success' });
                }, 100);
              } catch (tweetError) {
                console.error("[Grove Extension] Profile tip tweet failed:", tweetError);
                setTimeout(() => {
                  showInlineTipError(button.button, { message: 'Tweet failed (rate limited?)', variant: 'warning' });
                }, 100);
              }
            } else {
              console.log("[Grove Extension] Skipping profile tweet - not logged in or no username");
            }
          }
        } catch (error) {
          // Don't fail the whole tip if X features fail
          console.error("[Grove Extension] X features failed for profile tip:", error);
        }
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

  // ============= SoundCloud Track Handling =============

  /**
   * Setup observer for SoundCloud tracks
   * Watches for new tracks and injects tip buttons
   */
  function setupSoundCloudTrackObserver() {
    // Clean up existing observer
    if (soundCloudTrackObserver) {
      soundCloudTrackObserver.disconnect();
    }

    console.log("[Grove Extension] Setting up SoundCloud track observer");

    // Process existing tracks first
    processExistingSoundCloudTracks();

    // Watch for new tracks being added to the DOM (SoundCloud uses infinite scroll)
    soundCloudTrackObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node contains like buttons
            if (node.querySelectorAll) {
              const likeButtons = node.querySelectorAll('.sc-button-like');
              likeButtons.forEach(processSoundCloudTrackLikeButton);
            }
            // Also check if the node itself is a like button
            if (node.classList && node.classList.contains('sc-button-like')) {
              processSoundCloudTrackLikeButton(node);
            }
          }
        }
      }
    });

    soundCloudTrackObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Process all existing SoundCloud tracks on the page
   */
  function processExistingSoundCloudTracks() {
    if (!currentAdapter || currentAdapter.getPlatformName() !== 'soundcloud') return;

    const likeButtons = currentAdapter.getAllTrackLikeButtons();
    console.log(`[Grove Extension] Found ${likeButtons.length} existing SoundCloud track like buttons`);
    likeButtons.forEach(processSoundCloudTrackLikeButton);
  }

  /**
   * Process a single SoundCloud track by its like button and inject tip button before it
   * @param {Element} likeButton - The track's like button element
   */
  function processSoundCloudTrackLikeButton(likeButton) {
    // Skip if already processed
    if (processedSoundCloudTracks.has(likeButton)) return;
    processedSoundCloudTracks.add(likeButton);

    // Skip if tip button already exists next to this like button
    if (currentAdapter.hasTrackTipButton(likeButton)) return;

    // Get the parent button group
    const buttonGroup = currentAdapter.getTrackButtonGroup(likeButton);
    if (!buttonGroup) return;

    if (!document.querySelector('#grove-soundcloud-order-fix')) {
      const style = document.createElement('style');
      style.id = 'grove-soundcloud-order-fix';
      style.textContent = `
        .sc-button-group > .grove-tip-button,
        .sc-button-group > .grove-track-tip-button {
          float: left !important;
          margin-right: 16px !important;
          order: -999 !important;
        }
        .playbackSoundBadge__actions > .grove-track-tip-button {
          margin-right: 8px !important;
        }
        @media (max-width: 1079px) {
          .sc-button-group > .grove-tip-button,
          .sc-button-group > .grove-track-tip-button {
            margin-right: 8px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Create tip button using the same TipButton class as the profile button
    const tipButtonInstance = new TipButton(
      (buttonInstance) => handleTipClick(buttonInstance),
      'soundcloud'
    );

    const tipButton = tipButtonInstance.create();
    tipButton.classList.add('grove-track-tip-button');
    tipButton.id = ''; // Remove ID to allow multiple track buttons

    // SoundCloud button groups rely on floats; apply only to matching groups.
    if (buttonGroup.classList.contains('sc-button-group')) {
      tipButton.style.setProperty('float', 'left', 'important');
    }
    // Keep order for any flex-based layouts.
    tipButton.style.setProperty('order', '-999', 'important');
    if (buttonGroup.classList.contains('playbackSoundBadge__actions')) {
      tipButton.classList.add('sc-mr-1x');
    }

    // Insert before the like button in DOM (order CSS will handle visual positioning)
    buttonGroup.insertBefore(tipButton, likeButton);
    console.log('[Grove Extension] Inserted tip button with float/spacing + order: -999 !important');
  }

  // ============= End SoundCloud Track Handling =============

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
          TweetTipHandler.injectButton(tweetElement, dateElement, tweetUrl);
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
              TweetTipHandler.injectButton(quotedTweetEl, placement, quotedTweetUrl, true);
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
    // Twitter/X pattern
    const xMatch = url.match(/^https:\/\/(twitter|x)\.com\/([^\/\?]+)\/?/);
    if (xMatch && xMatch[2] && !['home', 'explore', 'search', 'notifications', 'messages', 'settings', 'i'].includes(xMatch[2])) {
      return xMatch[2];
    }

    // SoundCloud pattern
    const scMatch = url.match(/^https:\/\/soundcloud\.com\/([^\/\?]+)\/?/);
    if (scMatch && scMatch[1] && !['discover', 'feed', 'notifications', 'messages', 'upload', 'settings', 'you', 'artists', 'search'].includes(scMatch[1])) {
      return scMatch[1];
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
          TweetTipHandler.injectButton(quotedTweetEl, dateElement, tweetUrl, true);
        }
      } else {
        TweetTipHandler.injectButton(tweetElement, dateElement, tweetUrl, false);
      }
    }
  }

  // Tweet tip button injection and tip flow is now handled by TweetTipHandler
  // (src/content/tweetTipHandler.js)

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
    if (typeof TweetTipHandler !== 'undefined') {
      TweetTipHandler.reset();
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
