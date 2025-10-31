/**
 * Grove Extension Content Script
 * Main orchestrator that detects platform, extracts addresses, and injects tip button
 */

(function() {
  'use strict';

  // State
  let currentButton = null;
  let currentAdapter = null;

  /**
   * Initialize the extension
   */
  async function init() {
    console.log('[Grove Extension] Initializing...');

    // Detect platform and create appropriate adapter
    currentAdapter = detectPlatform();

    if (!currentAdapter) {
      console.log('[Grove Extension] No supported platform detected');
      return;
    }

    console.log(`[Grove Extension] Platform detected: ${currentAdapter.getPlatformName()}`);

    // Check if we're on a profile page
    if (!currentAdapter.detectProfilePage()) {
      console.log('[Grove Extension] Not a profile page');
      return;
    }

    console.log('[Grove Extension] Profile page detected');

    // Wait for profile to load (if adapter supports it)
    if (typeof currentAdapter.waitForProfileLoad === 'function') {
      const loaded = await currentAdapter.waitForProfileLoad();
      if (!loaded) {
        console.log('[Grove Extension] Profile load timeout');
        return;
      }
    }

    // Extract bio
    const bio = currentAdapter.extractBio();
    if (!bio) {
      console.log('[Grove Extension] No bio found');
      return;
    }

    console.log('[Grove Extension] Bio extracted');

    // Parse addresses from bio
    const addresses = AddressParser.parse(bio);
    if (addresses.length === 0) {
      console.log('[Grove Extension] No addresses found in bio');
      return;
    }

    console.log(`[Grove Extension] Found ${addresses.length} address(es):`, addresses);

    // Use the first address found
    const addressData = addresses[0];

    // Get user identifier
    const userIdentifier = currentAdapter.getUserIdentifier();
    if (!userIdentifier) {
      console.log('[Grove Extension] Could not determine user identifier');
      return;
    }

    console.log(`[Grove Extension] User: ${userIdentifier}`);

    // Get button placement location
    const placement = currentAdapter.getButtonPlacement();
    if (!placement) {
      console.log('[Grove Extension] Could not find button placement location');
      return;
    }

    // Create and inject tip button
    currentButton = new TipButton(
      addressData,
      currentAdapter.getPlatformName(),
      userIdentifier,
      handleTipClick
    );

    const button = currentButton.create();
    const injected = currentButton.inject(placement);

    if (injected) {
      console.log('[Grove Extension] Tip button injected successfully');
    } else {
      console.log('[Grove Extension] Failed to inject tip button');
    }
  }

  /**
   * Detect which platform we're on and return appropriate adapter
   * @returns {BaseAdapter|null}
   */
  function detectPlatform() {
    const hostname = window.location.hostname;

    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return new TwitterAdapter();
    }

    // TODO: Add more platform adapters
    // if (hostname.includes('github.com')) {
    //   return new GitHubAdapter();
    // }
    // if (hostname.includes('reddit.com')) {
    //   return new RedditAdapter();
    // }

    return null;
  }

  /**
   * Handle tip button click
   * @param {Object} tipData - Tip information
   */
  async function handleTipClick(tipData) {
    console.log('[Grove Extension] Processing tip...');

    // Validate data
    if (!GroveAPI.validateTipData(tipData)) {
      console.error('[Grove Extension] Invalid tip data', tipData);
      return;
    }

    // Send tip via API
    try {
      const response = await GroveAPI.sendTip(tipData);
      console.log('[Grove Extension] Tip response:', response);

      // TODO_IN_THIS_PR: Add user feedback (toast notification, etc.)
    } catch (error) {
      console.error('[Grove Extension] Tip failed:', error);
      // TODO_IN_THIS_PR: Add error handling UI
    }
  }

  /**
   * Clean up when page changes
   */
  function cleanup() {
    if (currentButton) {
      currentButton.remove();
      currentButton = null;
    }
    currentAdapter = null;
  }

  /**
   * Watch for navigation changes (SPAs like Twitter)
   */
  function watchForNavigation() {
    let lastUrl = window.location.href;

    // Use MutationObserver to detect URL changes in SPAs
    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('[Grove Extension] Navigation detected, reinitializing...');
        cleanup();
        setTimeout(init, 1000); // Wait for page to settle
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Start the extension
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Watch for navigation changes
  watchForNavigation();

  console.log('[Grove Extension] Content script loaded');
})();
