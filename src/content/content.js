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

          const envId = GroveEnv.resolveActiveEnvId(result[STORAGE_KEYS.ENVIRONMENT], result[STORAGE_KEYS.ENDPOINT]);
          const jwt = result[GroveEnv.jwtKeyForEnv(envId)] || null;
          resolve(jwt);
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
  let soundCloudTrackObserver = null;
  let tipModal = null;
  let resolvedAddress = null; // Stores address info (0x address or ENS name)

  // Address cache: uses shared AddressCache class from src/utils/addressCache.js
  // Cache entries expire after 10 minutes (configured in ADDRESS_CACHE_TTL)
  const addressCache = new AddressCache();

  // Track which SoundCloud tracks already have buttons to avoid duplicates
  const processedSoundCloudTracks = new WeakSet();

  /**
   * Ensure the SoundCloud button ordering CSS is loaded once
   */
  function ensureSoundCloudOrderStyles() {
    if (document.querySelector('#grove-soundcloud-order-fix')) return;
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

  // Tweet processing state (processedTweets, pendingTweetButtons, tweetObserver)
  // is now managed by TweetProcessor module

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
            if (typeof TweetProcessor !== 'undefined') {
              TweetProcessor.injectPendingButtons(username);
            }
          } else {
            // No valid address found
            setCachedAddress(username, 'no-address');
            if (typeof TweetProcessor !== 'undefined') {
              TweetProcessor.clearPendingButtons(username);
            }
          }
        } else {
          // No address in bio/display name
          setCachedAddress(username, 'no-address');
          if (typeof TweetProcessor !== 'undefined') {
            TweetProcessor.clearPendingButtons(username);
          }
        }
      },
      onFetchError: (username, error) => {
        console.log(`[Grove Extension] Bio fetch failed for @${username}: ${error}`);
        // Don't cache on error - allow retry later
        if (typeof TweetProcessor !== 'undefined') {
          TweetProcessor.clearPendingButtons(username);
        }
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

  // Initialize TweetProcessor with callbacks
  if (typeof TweetProcessor !== 'undefined') {
    TweetProcessor.init({
      getAdapter: () => currentAdapter,
      getCachedAddress: getCachedAddress,
      setCachedAddress: setCachedAddress,
      hasAddresses: (text) => AddressParser.hasAddresses(text),
      resolveAddress: (text) => AddressParser.resolveAddress(text),
      injectTipButton: (tweetEl, dateEl, url, isQuoted) => TweetTipHandler.injectButton(tweetEl, dateEl, url, isQuoted),
      queueBioFetch: (username) => {
        if (typeof BioFetcher !== 'undefined') {
          BioFetcher.queueFetch(username);
        }
      }
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
      // If on a tippable page (profile or tweet), initialize profile button first (this caches the address)
      if (currentAdapter.detectTippablePage()) {
        if (typeof ProfilePageHandler !== 'undefined') {
          const result = await ProfilePageHandler.initialize(currentAdapter);
          if (result) {
            resolvedAddress = result;
            currentButton = ProfilePageHandler.getButton();
          }
        }
      }

      // Always set up tweet observer on Twitter (after profile init so cache is populated)
      if (typeof TweetProcessor !== 'undefined') {
        TweetProcessor.startObserving();
      }

      // Also set up hover card observer for profile popups
      if (typeof HoverCardHandler !== 'undefined') {
        HoverCardHandler.startObserving();
      }
      return;
    }

    // For SoundCloud, handle profile page and track tip buttons
    if (currentAdapter.getPlatformName() === "soundcloud") {
      ensureSoundCloudOrderStyles();
      // If on a tippable page, initialize profile button first (this caches the address)
      if (currentAdapter.detectTippablePage()) {
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

    // For YouTube, use ProfilePageHandler (simple path like SoundCloud without track observer)
    if (currentAdapter.getPlatformName() === "youtube") {
      if (currentAdapter.detectTippablePage()) {
        if (typeof ProfilePageHandler !== 'undefined') {
          const result = await ProfilePageHandler.initialize(currentAdapter);
          if (result) {
            resolvedAddress = result;
            currentButton = ProfilePageHandler.getButton();
          }
        }
      }
      return;
    }

    // For Substack, use ProfilePageHandler for full pages (API-first), and SubstackHandler for hover cards
    if (currentAdapter.getPlatformName() === "substack") {
      const isSubstackTippablePage = currentAdapter.detectTippablePage();
      const hasProfilePageHandler = typeof ProfilePageHandler !== 'undefined';
      console.log('[Grove Substack] Full-page init precheck:', {
        isSubstackTippablePage,
        hasProfilePageHandler
      });

      // Page-level button: resolve via API first (fallback to DOM parsing)
      if (isSubstackTippablePage) {
        if (hasProfilePageHandler) {
          const result = await ProfilePageHandler.initialize(currentAdapter);
          if (result) {
            resolvedAddress = result;
            currentButton = ProfilePageHandler.getButton();
          }
        } else {
          console.warn('[Grove Substack] ProfilePageHandler is undefined; skipping full-page API/DOM resolution');
        }
      } else {
        console.log('[Grove Substack] Page did not match detectTippablePage(); skipping full-page resolution');
      }

      // Hover card buttons: Substack-specific
      if (typeof SubstackHandler !== 'undefined') {
        SubstackHandler.init({
          hasAddresses: (text) => AddressParser.hasAddresses(text),
          resolveAddress: (text) => AddressParser.resolveAddress(text),
          onTipClick: handleTipClick,
          createTipButton: (onClick, platform) => new TipButton(onClick, platform),
        });

        // Does not inject page-level buttons (handled above); only observes hover cards.
        SubstackHandler.initialize(currentAdapter).catch((err) => {
          console.error('[Grove Substack] Hover card init failed:', err);
        });
      }
      return;
    }

    // For generic websites, check for metadata files
    if (currentAdapter.getPlatformName() === "generic") {
      await initializeGenericWebsite();
      return;
    }

    // Check if we're on a tippable page (for other platforms)
    try {
      if (!currentAdapter.detectTippablePage()) {
        return;
      }
    } catch (error) {
      console.error("[Grove Extension] Tippable page detection failed:", error);
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
   * Fetches llms.txt/ai.txt and shows floating button if address found.
   * Falls back to API resolution for sites claimed on Grove profiles.
   */
  async function initializeGenericWebsite() {
    try {
      // Fetch metadata files
      const metadata = await currentAdapter.fetchMetadata();

      if (metadata.found) {
        console.log(`[Grove Extension] Found address in ${metadata.source}: ${metadata.address.original || metadata.address.address}`);
        resolvedAddress = metadata.address;
        injectGenericFloatingButton();
        return;
      }

      // No metadata files — try API resolution as fallback
      // This enables tip buttons on personal sites claimed via Grove profiles
      console.log("[Grove Extension] No metadata files found, trying API resolve fallback");

      if (typeof GroveAPI === 'undefined' || typeof GroveAPI.resolveDestination !== 'function') {
        console.log("[Grove Extension] GroveAPI.resolveDestination not available");
        return;
      }

      const result = await GroveAPI.resolveDestination(window.location.origin);

      if (!result.tippable || !result.addresses || result.addresses.length === 0) {
        console.log("[Grove Extension] API resolve returned non-tippable for this site");
        return;
      }

      // Validate the address client-side (same pattern as ProfilePageHandler)
      const primaryAddress = result.addresses[0];
      if (!primaryAddress?.address) {
        console.log("[Grove Extension] API resolve returned empty address");
        return;
      }

      const validation = AddressParser.resolveAddress(primaryAddress.address);
      if (!validation?.address) {
        console.log("[Grove Extension] API resolve returned address that failed client-side validation:", primaryAddress.address);
        return;
      }

      resolvedAddress = {
        address: validation.address,
        type: primaryAddress.source || validation.type || 'grove_profile',
        token: primaryAddress.token,
        chain: primaryAddress.chain
      };

      console.log(`[Grove Extension] ✅ Address resolved via API fallback: ${resolvedAddress.address} (source: ${resolvedAddress.type})`);
      injectGenericFloatingButton();

    } catch (error) {
      console.error("[Grove Extension] Generic website initialization failed:", error);
    }
  }

  /**
   * Create and inject the floating tip button for generic websites
   */
  function injectGenericFloatingButton() {
    currentButton = new TipButton(handleTipClick, 'generic');
    currentButton.create();
    currentButton.injectFloating();
    console.log("[Grove Extension] Floating tip button injected");
  }

  /**
   * Detect which platform we're on and return appropriate adapter
   * @returns {BaseAdapter|null}
   *
   * TODO_TECHDEBT: Implement PlatformRegistry pattern for cleaner extensibility
   *   Why: Current detectPlatform() is a conditional chain requiring edits to add platforms
   *   Approach: Create registry where adapters self-register with matcher functions
   *   File: Consider src/config/platformRegistry.js for registry implementation
   */
  function detectPlatform() {
    const hostname = window.location.hostname;
    console.log(`[Grove Extension] detectPlatform() called, hostname: ${hostname}`);

    if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      console.log('[Grove Extension] Detected Twitter/X');
      return new window.TwitterAdapter();
    }

    if (hostname.includes("soundcloud.com")) {
      console.log('[Grove Extension] Detected SoundCloud');
      return new window.SoundCloudAdapter();
    }

    if (hostname.includes("youtube.com")) {
      console.log('[Grove Extension] Detected YouTube');
      return new window.YouTubeAdapter();
    }

    if (hostname.includes("substack.com")) {
      console.log('[Grove Extension] Detected Substack');
      if (typeof window.SubstackAdapter === 'undefined') {
        console.error('[Grove Extension] SubstackAdapter not loaded!');
        return null;
      }
      return new window.SubstackAdapter();
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
   * @param {Object|null} tipOverrides - Optional overrides for destination/context (e.g., hover cards)
   */
  async function handleTipClick(buttonInstance, tipOverrides = null) {
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
    let confirmBeforeTipping = true; // default on
    let hasTipped = false; // whether user has tipped before
    let likeOnTip = true;
    let autoReply = true;
    let isXConnected = false;

    let autoReplyMessage = DEFAULT_AUTO_REPLY_MESSAGE;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get([
          'GROVE_TIP_AMOUNT',
          'GROVE_CONFIRM_TIP',
          'GROVE_CONFIRM_TIP_V2',
          'GROVE_HAS_TIPPED',
          'GROVE_LIKE_ON_TIP',
          'GROVE_AUTO_REPLY',
          'GROVE_AUTO_REPLY_MESSAGE'
        ]);
        autoReplyMessage = result.GROVE_AUTO_REPLY_MESSAGE || DEFAULT_AUTO_REPLY_MESSAGE;
        tipAmount = result.GROVE_TIP_AMOUNT || 0.02;
        hasTipped = result.GROVE_HAS_TIPPED || false;
        likeOnTip = result.GROVE_LIKE_ON_TIP !== false;
        autoReply = result.GROVE_AUTO_REPLY !== false;

        // Migration logic: if V2 flag not set, reset confirm to true (new default)
        if (!result.GROVE_CONFIRM_TIP_V2) {
          confirmBeforeTipping = true;
          await chrome.storage.local.set({
            'GROVE_CONFIRM_TIP': true,
            'GROVE_CONFIRM_TIP_V2': true
          });
        } else {
          confirmBeforeTipping = result.GROVE_CONFIRM_TIP !== false;
        }

        // Check X connection status
        if (typeof XAuth !== 'undefined') {
          isXConnected = await XAuth.isLoggedIn();
        }
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

    // If confirmation disabled, send tip directly
    if (!confirmBeforeTipping) {
      // Mark as having tipped if this is the first tip
      if (!hasTipped) {
        try {
          await chrome.storage.local.set({ 'GROVE_HAS_TIPPED': true });
        } catch (e) {
          console.error("[Grove Extension] Failed to mark first tip:", e);
        }
      }
      sendTip(tipAmount, button, null, tipOverrides);
      return;
    }

    // Show confirmation modal
    if (!tipModal && typeof TipModal !== 'undefined') {
      tipModal = new TipModal();
    }

    // Build X options for modal
    const xOptions = isXConnected ? {
      isConnected: true,
      likeOnTip: likeOnTip,
      autoReply: autoReply
    } : null;

    if (tipModal) {
      // Get username for profile tips
      const recipientUsername = tipOverrides?.recipient_username || extractUsernameFromUrl(window.location.href);

      // Detect dark mode for modal theming
      const platform = currentAdapter ? currentAdapter.getPlatformName() : null;
      const isDarkMode = typeof detectDarkMode === 'function' ? detectDarkMode(platform) : true;

      // Configure display based on whether this is the first tip
      const displayOptions = hasTipped
        ? { title: 'Confirm Tip', showConfirmCheckbox: true, isProfileTip: true, recipientUsername, autoReplyMessage, isDarkMode }
        : { title: 'Your First Tip!', showConfirmCheckbox: true, isProfileTip: true, recipientUsername, autoReplyMessage, isDarkMode };

      tipModal.show(
        buttonElement,
        tipAmount,
        true, // confirmBeforeTipping is always true here
        async ({ amount, confirmBeforeTipping: newConfirmSetting, likeOnTip: newLikeOnTip, autoReply: newAutoReply, customMessage }) => {
          // Save preferences
          try {
            const saveData = {
              'GROVE_TIP_AMOUNT': amount,
              'GROVE_CONFIRM_TIP': newConfirmSetting,
              'GROVE_HAS_TIPPED': true
            };
            // Save X preferences if they were set (X is connected)
            if (newLikeOnTip !== null) {
              saveData['GROVE_LIKE_ON_TIP'] = newLikeOnTip;
            }
            if (newAutoReply !== null) {
              saveData['GROVE_AUTO_REPLY'] = newAutoReply;
            }
            await chrome.storage.local.set(saveData);
          } catch (e) {
            console.error("[Grove Extension] Failed to save tip preferences:", e);
          }
          // Send the tip with custom message
          sendTip(amount, button, customMessage, tipOverrides);
        },
        () => {
          console.log("[Grove Extension] Tip cancelled");
        },
        xOptions,
        displayOptions
      );
    } else {
      // Fallback: send tip directly if modal not available
      sendTip(tipAmount, button, null, tipOverrides);
    }
  }

  /**
   * Send tip with the given amount
   * @param {number} tipAmount - The amount to tip
   * @param {TipButton} button - The button instance for state updates
   * @param {string|null} customMessage - Custom message for the tip (optional)
   * @param {Object|null} tipOverrides - Optional overrides for destination/context
   */
  async function sendTip(tipAmount, button, customMessage = null, tipOverrides = null) {
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

    // Determine tip destination: use overrides first, then resolved address, otherwise page URL
    let tipDestination = tipOverrides?.resolvedAddress?.address || window.location.href;
    if (!tipOverrides?.resolvedAddress?.address && resolvedAddress && resolvedAddress.address) {
      tipDestination = resolvedAddress.address; // e.g., "vitalik.eth" or "0x..."
      console.log(`[Grove Extension] Tipping to ${resolvedAddress.type} address: ${tipDestination}`);
    } else if (tipOverrides?.resolvedAddress?.address) {
      console.log(`[Grove Extension] Tipping to ${tipOverrides.resolvedAddress.type} address (override): ${tipDestination}`);
    }

    // Build context metadata for the tip
    const platformName = currentAdapter?.getPlatformName?.() || 'generic';
    const recipientUsername = tipOverrides?.recipient_username || extractUsernameFromUrl(window.location.href);
    
    // Determine platform name from adapter, default to generic
    const senderPlatform = currentAdapter ? currentAdapter.getApiPlatformName() : 'generic';

    const context = {
      source_post_url: tipOverrides?.source_post_url || window.location.href
    };

    if (senderPlatform && senderPlatform !== 'generic') {
      context.sender_platform = senderPlatform;
    }
    if (recipientUsername) {
      context.recipient_username = recipientUsername;
      // Use adapter's getProfileUrl if available, otherwise fall back to hardcoded patterns
      if (currentAdapter && typeof currentAdapter.getProfileUrl === 'function') {
        const profileUrl = currentAdapter.getProfileUrl(recipientUsername);
        if (profileUrl) {
          context.recipient_profile_url = profileUrl;
        }
      }
    }
    if (tipOverrides?.recipient_profile_url) {
      context.recipient_profile_url = tipOverrides.recipient_profile_url;
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
          const xSettings = await chrome.storage.local.get(['GROVE_AUTO_REPLY', 'GROVE_AUTO_REPLY_MESSAGE', 'GROVE_REFERRAL_CODE', 'groveChain', 'groveEndpoint', 'groveEnvironment']);
            const autoReplyEnabled = xSettings.GROVE_AUTO_REPLY !== false;

            if (autoReplyEnabled) {
              const isLoggedIn = await XAuth.isLoggedIn();
              if (isLoggedIn && recipientUsername) {
              // Get chain config for the message from centralized config
              // Use testnet explorer URL when on localhost or testnet endpoints
              const rawChain = xSettings.groveChain || 'base';
              const explorerChain = getExplorerChain(rawChain, xSettings);
              const config = getChainConfig(explorerChain);
              const chainName = config.name;
              const explorerBaseUrl = `${config.explorerUrl}/tx/`;

              const txHash = response.data?.tx_hash || '';
              const txLink = `${explorerBaseUrl}${txHash}`;

              // Build tweet text from template (prefer custom message from modal)
                const autoReplyMessage = customMessage || xSettings.GROVE_AUTO_REPLY_MESSAGE || DEFAULT_AUTO_REPLY_MESSAGE;
                const referralCode = xSettings.GROVE_REFERRAL_CODE;
                // TODO_CONSIDERATION: Referral links always point to production — intentional?
                //   Why: During local/testnet dev, auto-reply tweets still link to production app
                //   How: Use GroveEnv.get(envId).appUrl if referrals should match the active environment
                const referralLink = referralCode ? `https://grove.city/?ref=${encodeURIComponent(referralCode)}` : 'grove.city';
                const tweetText = buildAutoReplyMessage(autoReplyMessage, {
                  username: recipientUsername,
                  amount: tipAmount,
                  chain: chainName,
                  tx_link: txLink,
                  grove_link: 'grove.city',
                  referral_link: referralLink
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
  // Tweet processing is now handled by TweetProcessor module

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
   * Extract username from a platform URL
   * Delegates to the current adapter if available, with hardcoded fallback
   * @param {string} url - The URL to parse
   * @returns {string|null} - Username or null
   */
  function extractUsernameFromUrl(url) {
    // Delegate to adapter if available
    if (currentAdapter && typeof currentAdapter.extractUsernameFromUrl === 'function') {
      const result = currentAdapter.extractUsernameFromUrl(url);
      if (result) return result;
    }

    // Fallback: hardcoded patterns for backward compatibility
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
   * @param {string} username - Twitter username
   * @returns {Object|string|null} - Cached address result, 'no-address', or null if not cached/expired
   */
  function getCachedAddress(username) {
    return addressCache.get(username);
  }

  /**
   * Set cached address for a username
   * @param {string} username - Twitter username
   * @param {Object|string} data - Address result or 'no-address'
   */
  function setCachedAddress(username, data) {
    addressCache.set(username, data);
  }

  // Tweet processing (queueBioFetch, injectPendingButtons) is now handled by TweetProcessor
  // Tweet tip button injection and tip flow is handled by TweetTipHandler

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
    if (typeof TweetProcessor !== 'undefined') {
      TweetProcessor.reset();
    }
    if (typeof SubstackHandler !== 'undefined') {
      SubstackHandler.reset();
    }
    if (typeof ProfilePageHandler !== 'undefined') {
      ProfilePageHandler.reset();
    }
    if (tipModal) {
      tipModal.hide();
      tipModal = null;
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

    // YouTube fires a custom event on SPA navigation that is more reliable
    // than MutationObserver-based URL polling for its Web Component architecture
    if (window.location.hostname.includes('youtube.com')) {
      document.addEventListener('yt-navigate-finish', () => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          cleanup();
          setTimeout(init, 1000);
        }
      });
    }
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
