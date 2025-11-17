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

  /**
   * Initialize the extension
   */
  async function init() {
    console.log("[Grove Extension] Initializing...");

    // Detect platform and create appropriate adapter
    currentAdapter = detectPlatform();

    if (!currentAdapter) {
      console.log("[Grove Extension] No supported platform detected");
      return;
    }

    console.log(
      `[Grove Extension] Platform detected: ${currentAdapter.getPlatformName()}`
    );

    // For Reddit, handle both hover cards and profile pages
    if (currentAdapter.getPlatformName() === "reddit") {
      console.log("[Grove Extension] Setting up Reddit hover card observer");
      setupRedditHoverCardObserver();

      // Also check if we're on a profile page and handle it
      if (currentAdapter.detectProfilePage()) {
        console.log("[Grove Extension] Reddit profile page detected, initializing button");
        await initializeProfileButton();
      }
      return;
    }

    // Check if we're on a profile page
    try {
      if (!currentAdapter.detectProfilePage()) {
        console.log("[Grove Extension] Not a profile page");
        return;
      }
    } catch (error) {
      console.error("[Grove Extension] Error detecting profile page:", error);
      return;
    }

    console.log("[Grove Extension] Profile page detected");

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

    // TODO: Add more platform adapters
    // if (hostname.includes('github.com')) {
    //   return new GitHubAdapter();
    // }

    return null;
  }

  /**
   * Initialize profile button (reusable for different profile types)
   * Handles profile page logic for extracting bio, checking for addresses, and injecting button
   */
  async function initializeProfileButton() {
    console.log("[Grove Extension] Initializing profile button...");

    try {
      // Wait for profile to load (if adapter supports it)
      if (typeof currentAdapter.waitForProfileLoad === "function") {
        const loaded = await currentAdapter.waitForProfileLoad();
        if (!loaded) {
          console.log("[Grove Extension] Profile load timeout");
          return;
        }
      }

      console.log("[Grove Extension] Profile loaded");

      // Extract bio to check for addresses
      const bio = currentAdapter.extractBio();
      if (!bio) {
        console.log("[Grove Extension] No bio found - not showing button");
        return;
      }

      console.log("[Grove Extension] Bio extracted");

      // Check if bio contains tippable address
      const hasAddress = AddressParser.hasAddresses(bio);
      if (!hasAddress) {
        console.log(
          "[Grove Extension] No tippable address found in bio - not showing button"
        );
        return;
      }

      console.log(
        "[Grove Extension] Tippable address detected - showing button"
      );

      // Get button placement location
      const placement = currentAdapter.getButtonPlacement();
      if (!placement) {
        console.log(
          "[Grove Extension] Could not find button placement location"
        );
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

      const injected = currentButton.inject(placement);

      if (injected) {
        console.log("[Grove Extension] Tip button injected successfully");
      } else {
        console.log("[Grove Extension] Failed to inject tip button");
      }
    } catch (error) {
      console.error("[Grove Extension] Error initializing profile button:", error);
    }
  }

  /**
   * Handle tip button click
   */
  async function handleTipClick() {
    console.log("[Grove Extension] Processing tip...");

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

      console.log("[Grove Extension] JWT loaded:", jwt ? 'Yes' : 'No');
      console.log("[Grove Extension] Tip amount:", tipAmount);

      if (!jwt) {
        console.error("[Grove Extension] No JWT token found. Please configure in settings.");
        if (currentButton) {
          currentButton.setError();
        }
        return;
      }
    } catch (error) {
      console.error("[Grove Extension] Error loading settings:", error);
      if (currentButton) {
        currentButton.setError();
      }
      return;
    }

    // Get current page URL
    const pageUrl = window.location.href;
    console.log("[Grove Extension] Sending tip for URL:", pageUrl);

    // Send tip via API with JWT and amount
    const response = await GroveAPI.sendTip(pageUrl, tipAmount, jwt);

    // Handle response with animations
    if (response.success) {
      console.log("[Grove Extension] Tip successful!", response.data);
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
              console.log("[Grove Extension] Reddit hover card detected!");
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

    console.log("[Grove Extension] Reddit hover card observer started");
  }

  /**
   * Inject button into Reddit hover card
   * @param {Element} hoverCard - The hover card element
   */
  async function injectButtonIntoHoverCard(hoverCard) {
    console.log("[Grove Extension] Processing hover card...");

    // Check if button already exists in this hover card
    if (hoverCard.querySelector("#grove-tip-button")) {
      console.log("[Grove Extension] Button already exists in hover card");
      return;
    }

    // Extract bio from hover card
    const bioSpan = hoverCard.querySelector(".whitespace-normal");
    if (!bioSpan) {
      console.log("[Grove Extension] No bio found in hover card");
      return;
    }

    const bio = bioSpan.textContent;
    console.log("[Grove Extension] Bio extracted:", bio);

    // Check if bio contains tippable address
    const hasAddress = AddressParser.hasAddresses(bio);
    if (!hasAddress) {
      console.log("[Grove Extension] No tippable address found in hover card bio");
      return;
    }

    console.log("[Grove Extension] Tippable address detected in hover card!");

    // Find the main content div that contains everything
    const contentDiv = hoverCard.querySelector(".p-md.flex.flex-col");
    if (!contentDiv) {
      console.log("[Grove Extension] Could not find content div in hover card");
      return;
    }

    // Find the top row with avatar and user info
    const topRow = contentDiv.querySelector(".flex.flex-row.justify-items-start.items-center");
    if (!topRow) {
      console.log("[Grove Extension] Could not find top row in hover card");
      return;
    }

    // Create and inject tip button with click handler
    const tipButton = new TipButton(async () => {
      console.log("[Grove Extension] Processing hover card tip...");

      // Show loading animation
      tipButton.setLoading();

      // Get JWT and tip amount from storage
      let jwt = '';
      let tipAmount = 0.05; // default

      try {
        const result = await chrome.storage.local.get(['GROVE_API_JWT', 'GROVE_TIP_AMOUNT']);
        jwt = result.GROVE_API_JWT || '';
        tipAmount = result.GROVE_TIP_AMOUNT || 0.05;

        console.log("[Grove Extension] JWT loaded:", jwt ? 'Yes' : 'No');
        console.log("[Grove Extension] Tip amount:", tipAmount);

        if (!jwt) {
          console.error("[Grove Extension] No JWT token found. Please configure in settings.");
          tipButton.setError();
          return;
        }
      } catch (error) {
        console.error("[Grove Extension] Error loading settings:", error);
        tipButton.setError();
        return;
      }

      // Get current page URL
      const pageUrl = window.location.href;

      // Send tip via API with JWT and amount
      const response = await GroveAPI.sendTip(pageUrl, tipAmount, jwt);

      // Handle response with animations
      if (response.success) {
        console.log("[Grove Extension] Tip successful!", response.data);
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
    console.log("[Grove Extension] Tip button appended to top row");
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
    let lastUrl = window.location.href;

    // Use MutationObserver to detect URL changes in SPAs
    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log("[Grove Extension] Navigation detected, reinitializing...");
        cleanup();
        setTimeout(init, 1000); // Wait for page to settle
      }
    });

    observer.observe(document.body, {
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

  console.log("[Grove Extension] Content script loaded");
})();
