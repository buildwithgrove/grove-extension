/**
 * Grove Extension Content Script
 * Main orchestrator that detects platform, extracts addresses, and injects tip button
 */

(function () {
  "use strict";

  // Configuration
  const ADVERTISING_MODE = true; // Set to true for more prominent button animation

  // State
  let currentButton = null;
  let currentAdapter = null;
  let hoverCardObserver = null;
  let navigationObserver = null;

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

    // For Reddit, handle both hover cards and profile pages
    if (currentAdapter.getPlatformName() === "reddit") {
      setupRedditHoverCardObserver();

      // Also check if we're on a profile page and handle it
      if (currentAdapter.detectProfilePage()) {
        await initializeProfileButton();
      }
      return;
    }

    // Check if we're on a profile page
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
   * Detect which platform we're on and return appropriate adapter
   * @returns {BaseAdapter|null}
   */
  function detectPlatform() {
    const hostname = window.location.hostname;

    if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      return new TwitterAdapter();
    }

    if (hostname.includes("reddit.com")) {
      return new RedditAdapter();
    }

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return new YouTubeAdapter();
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

      // Skip address validation for YouTube
      if (currentAdapter.getPlatformName() !== 'youtube') {
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

        console.log("[Grove Extension] Tippable address detected - showing button");
      } else {
        console.log("[Grove Extension] YouTube detected - skipping address validation");
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
   * Handle tip button click
   */
  async function handleTipClick() {

    // Show loading animation
    if (currentButton) {
      currentButton.setLoading();
    }

    // Get JWT and tip amount from storage
    let jwt = '';
    let tipAmount = 0.05; // default

    try {
      const result = await chrome.storage.local.get(['GROVE_API_JWT', 'GROVE_TIP_AMOUNT']);
      jwt = result.GROVE_API_JWT || '';
      tipAmount = result.GROVE_TIP_AMOUNT || 0.05;


      if (!jwt) {
        console.error("[Grove Extension] No API key configured");
        if (currentButton) {
          currentButton.setError();
        }
        return;
      }
    } catch (error) {
      console.error("[Grove Extension] Settings load failed:", error);
      if (currentButton) {
        currentButton.setError();
      }
      return;
    }

    // Get current page URL
    const pageUrl = window.location.href;

    // Send tip via API with JWT and amount
    const response = await GroveAPI.sendTip(pageUrl, tipAmount, jwt);

    // Handle response with animations
    if (response.success) {
      if (currentButton) {
        currentButton.setSuccess();
      }
    } else {
      console.error("[Grove Extension] Tip failed:", response.error);
      if (currentButton) {
        currentButton.setError();
      }
    }
  }

  /**
   * Setup observer for Reddit hover cards
   * Reddit hover cards appear dynamically, so we need to watch for them
   */
  function setupRedditHoverCardObserver() {
    // Clean up existing observer
    if (hoverCardObserver) {
      hoverCardObserver.disconnect();
    }

    hoverCardObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this is a hover card
            const hoverCard = node.querySelector
              ? node.querySelector('[data-testid="user-hover-card"]')
              : null;

            if (hoverCard || (node.dataset && node.dataset.testid === "user-hover-card")) {
              injectButtonIntoHoverCard(hoverCard || node);
            }
          }
        }
      }
    });

    // Start observing the document body for new elements
    hoverCardObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

  }

  /**
   * Inject button into Reddit hover card
   * @param {Element} hoverCard - The hover card element
   */
  async function injectButtonIntoHoverCard(hoverCard) {

    // Check if button already exists in this hover card
    if (hoverCard.querySelector("#grove-tip-button")) {
      return;
    }

    // Extract bio from hover card
    const bioSpan = hoverCard.querySelector(".whitespace-normal");
    if (!bioSpan) {
      return;
    }

    const bio = bioSpan.textContent;

    // Check if bio contains tippable address
    const hasAddress = AddressParser.hasAddresses(bio);
    if (!hasAddress) {
      return;
    }


    // Find the main content div that contains everything
    const contentDiv = hoverCard.querySelector(".p-md.flex.flex-col");
    if (!contentDiv) {
      return;
    }

    // Find the top row with avatar and user info
    const topRow = contentDiv.querySelector(".flex.flex-row.justify-items-start.items-center");
    if (!topRow) {
      return;
    }

    // Create and inject tip button with click handler
    const tipButton = new TipButton(async () => {

      // Show loading animation
      tipButton.setLoading();

      // Get JWT and tip amount from storage
      let jwt = '';
      let tipAmount = 0.05; // default

      try {
        const result = await chrome.storage.local.get(['GROVE_API_JWT', 'GROVE_TIP_AMOUNT']);
        jwt = result.GROVE_API_JWT || '';
        tipAmount = result.GROVE_TIP_AMOUNT || 0.05;


        if (!jwt) {
          console.error("[Grove Extension] No API key configured");
          tipButton.setError();
          return;
        }
      } catch (error) {
        console.error("[Grove Extension] Settings load failed:", error);
        tipButton.setError();
        return;
      }

      // Get current page URL
      const pageUrl = window.location.href;

      // Send tip via API with JWT and amount
      const response = await GroveAPI.sendTip(pageUrl, tipAmount, jwt);

      // Handle response with animations
      if (response.success) {
          tipButton.setSuccess();
      } else {
        console.error("[Grove Extension] Tip failed:", response.error);
        tipButton.setError();
      }
    }, "reddit");

    const button = tipButton.create();

    // Apply advertising mode class if enabled
    if (ADVERTISING_MODE) {
      button.classList.add("grove-ad-mode");
    }

    // Append button to the end of the top row (after user info)
    topRow.appendChild(button);
  }

  /**
   * Clean up when page changes
   */
  function cleanup() {
    if (currentButton) {
      currentButton.remove();
      currentButton = null;
    }
    if (hoverCardObserver) {
      hoverCardObserver.disconnect();
      hoverCardObserver = null;
    }
    currentAdapter = null;
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
