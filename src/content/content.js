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
  let tipPopover = null;
  let resolvedAddress = null; // Stores resolved EVM address (from 0x or ENS)

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

        // Resolve address (handles both 0x and ENS)
        const result = await AddressParser.resolveAddress(bio);
        if (!result.address) {
          console.log("[Grove Extension] Could not resolve address - not showing button");
          return;
        }

        resolvedAddress = result;
        if (result.type === 'ens') {
          console.log(`[Grove Extension] ENS resolved: ${result.original} -> ${result.address}`);
        } else {
          console.log(`[Grove Extension] Address detected: ${result.address}`);
        }
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
   * Handle tip button click - shows popover for amount confirmation (if enabled)
   * @param {TipButton} buttonInstance - The button instance (for hover cards)
   */
  async function handleTipClick(buttonInstance) {
    // Use passed button instance or fall back to currentButton
    const button = buttonInstance || currentButton;

    // Get settings from storage
    let tipAmount = 0.10; // default
    let confirmBeforeTipping = false; // default off

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['GROVE_TIP_AMOUNT', 'GROVE_CONFIRM_TIP']);
        tipAmount = result.GROVE_TIP_AMOUNT || 0.10;
        confirmBeforeTipping = result.GROVE_CONFIRM_TIP || false;
      }
    } catch (error) {
      console.error("[Grove Extension] Settings load failed:", error);
    }

    // If confirmation disabled, send tip directly
    if (!confirmBeforeTipping) {
      sendTip(tipAmount, button);
      return;
    }

    // Get the button element for positioning
    const buttonElement = button?.button;
    if (!buttonElement) {
      console.error("[Grove Extension] No button element found");
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
    // Show loading animation
    if (button) {
      button.setLoading();
    }

    // Get JWT from storage
    let jwt = '';

    try {
      const result = await chrome.storage.local.get(['GROVE_API_JWT']);
      jwt = result.GROVE_API_JWT || '';

      if (!jwt) {
        console.error("[Grove Extension] No API key configured");
        if (button) {
          button.setError();
        }
        return;
      }
    } catch (error) {
      console.error("[Grove Extension] Settings load failed:", error);
      if (button) {
        button.setError();
      }
      return;
    }

    // Get current page URL
    const pageUrl = window.location.href;

    // Send tip via API with JWT and amount
    const response = await GroveAPI.sendTip(pageUrl, tipAmount, jwt);

    // Handle response with animations
    if (response.success) {
      if (button) {
        button.setSuccess();
      }
    } else {
      console.error("[Grove Extension] Tip failed:", response.error);
      if (button) {
        button.setError();
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

    // Resolve address (handles both 0x and ENS)
    const result = await AddressParser.resolveAddress(bio);
    if (!result.address) {
      console.log("[Grove Extension] Could not resolve address in hover card");
      return;
    }

    if (result.type === 'ens') {
      console.log(`[Grove Extension] ENS resolved in hover card: ${result.original} -> ${result.address}`);
    }

    // Store for this hover card's tip button
    const hoverCardResolvedAddress = result;

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
    const tipButton = new TipButton(() => {
      handleTipClick(tipButton);
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
    if (tipPopover) {
      tipPopover.hide();
      tipPopover = null;
    }
    currentAdapter = null;
    resolvedAddress = null;
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
