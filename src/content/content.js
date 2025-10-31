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

    console.log('[Grove Extension] Profile loaded - showing tip button');

    // Get button placement location
    const placement = currentAdapter.getButtonPlacement();
    if (!placement) {
      console.log('[Grove Extension] Could not find button placement location');
      return;
    }

    // Create and inject tip button
    currentButton = new TipButton(handleTipClick);

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
   */
  async function handleTipClick() {
    console.log('[Grove Extension] Processing tip...');

    // Get current page URL
    const pageUrl = window.location.href;

    // Send tip via API (just URL and default amount)
    const response = await GroveAPI.sendTip(pageUrl);

    // Handle response
    if (response.success) {
      console.log('[Grove Extension] Tip successful!', response.data);
      // TODO_IN_THIS_PR: Add success feedback (toast notification, etc.)
    } else {
      console.error('[Grove Extension] Tip failed:', response.error);
      // Error already shown by GroveAPI.showError()
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
