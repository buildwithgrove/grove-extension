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
  let tweetObserver = null;
  let tipPopover = null;
  let resolvedAddress = null; // Stores resolved EVM address (from 0x or ENS)

  // Address cache: maps username -> { address, type, original, timestamp }
  // Cache entries expire after 10 minutes
  const addressCache = new Map();
  const ADDRESS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // Track which tweets already have buttons to avoid duplicates
  const processedTweets = new WeakSet();

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
          console.log(`[Grove Extension] ✅ ENS RESOLVED: ${result.original} -> ${result.address}`);
        } else {
          console.log(`[Grove Extension] ✅ Address detected: ${result.address}`);
        }

        // Cache the address by username for tweet tip buttons
        if (currentAdapter.getPlatformName() === 'twitter') {
          const username = extractUsernameFromUrl(window.location.href);
          if (username) {
            setCachedAddress(username, result);
            console.log(`[Grove Extension] Cached address for @${username}`);
          }
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
    if (usernameLink) {
      const href = usernameLink.getAttribute('href');
      if (href && /^\/[a-zA-Z0-9_]+$/.test(href)) {
        profileUrl = `https://x.com${href}`;
      }
    }

    if (!profileUrl) return;

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
        setLoading: () => {
          button.disabled = true;
          button.style.pointerEvents = 'none';
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
          button.style.setProperty('border', `2px solid ${GROVE_COLORS.primary}`, 'important');
          button.style.setProperty('box-shadow', `0 2px 8px ${GROVE_COLORS.shadow}`, 'important');
          textSpan.textContent = 'Failed ✗';
          button.classList.add('animate__animated', 'animate__shakeX');
          setTimeout(() => {
            textSpan.textContent = 'Tip';
            textSpan.appendChild(emojiSpan);
            button.classList.remove('animate__animated', 'animate__shakeX');
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
   * Process a single tweet and inject tip button only if author has tippable address
   * @param {Element} tweetElement - The tweet article element
   */
  async function processTweet(tweetElement) {
    // Skip if already processed
    if (processedTweets.has(tweetElement)) return;
    processedTweets.add(tweetElement);

    // Skip if button already exists
    if (tweetElement.querySelector('.grove-tweet-tip-button')) return;

    // Extract author info
    const authorInfo = currentAdapter.extractTweetAuthor(tweetElement);
    if (!authorInfo.username) return;

    // Check cache first (includes addresses from profile pages we've visited)
    const cached = getCachedAddress(authorInfo.username);

    // If cached as 'no-address', skip
    if (cached === 'no-address') return;

    let hasTippableAddress = false;

    // If we have a cached positive result, use it
    if (cached && cached.address) {
      hasTippableAddress = true;
    } else if (authorInfo.displayName) {
      // Check if display name contains .eth or EVM address
      const hasAddress = AddressParser.hasAddresses(authorInfo.displayName);
      if (hasAddress) {
        // Resolve the address
        const addressResult = await AddressParser.resolveAddress(authorInfo.displayName);
        if (addressResult.address) {
          hasTippableAddress = true;
          // Cache the positive result
          setCachedAddress(authorInfo.username, addressResult);
          console.log(`[Grove Extension] Tweet: Found address for @${authorInfo.username}`);
        }
      }
    }

    // Only show button if we found a tippable address
    if (!hasTippableAddress) return;

    // Get the tweet URL for tipping
    const tweetUrl = currentAdapter.getTweetUrl(tweetElement);
    if (!tweetUrl) return;

    // Find the date element to place button next to
    const dateElement = currentAdapter.getTweetDateElement(tweetElement);
    if (!dateElement) return;

    // Create and inject the tip button
    injectTweetTipButton(tweetElement, dateElement, tweetUrl);
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
   * Inject tip button next to tweet date
   * @param {Element} tweetElement - The tweet article element
   * @param {Element} dateElement - The date link element
   * @param {string} tweetUrl - The tweet URL for tipping
   */
  function injectTweetTipButton(tweetElement, dateElement, tweetUrl) {
    // Detect dark mode
    const isDarkMode = detectDarkMode();
    const bgColor = isDarkMode ? '#1a1a1a' : '#ffffff';
    const bgHoverColor = isDarkMode ? '#252525' : '#f0f0f0';
    const textColor = isDarkMode ? '#ffffff' : '#1a1a1a';

    // Create the full tip button (matching profile button style)
    const button = document.createElement('button');
    button.className = 'grove-tweet-tip-button';
    button.setAttribute('aria-label', 'Send a tip');
    button.setAttribute('type', 'button');

    button.style.cssText = `
      background: ${bgColor} !important;
      border: 2px solid ${GROVE_COLORS.primary} !important;
      border-radius: 9999px !important;
      padding: 0 12px !important;
      height: 28px !important;
      min-height: 28px !important;
      max-height: 28px !important;
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
      font-size: 13px !important;
      position: relative !important;
      z-index: 2 !important;
      display: flex !important;
      align-items: center !important;
    `;

    // Create emoji span
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = '🌿';
    emojiSpan.style.cssText = `
      font-size: 14px !important;
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
        setLoading: () => {
          button.disabled = true;
          button.style.pointerEvents = 'none';
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
          button.style.setProperty('border', `2px solid ${GROVE_COLORS.primary}`, 'important');
          button.style.setProperty('box-shadow', `0 2px 8px ${GROVE_COLORS.shadow}`, 'important');
          textSpan.textContent = 'Failed ✗';
          button.classList.add('animate__animated', 'animate__shakeX');
          setTimeout(() => {
            textSpan.textContent = 'Tip';
            textSpan.appendChild(emojiSpan);
            button.classList.remove('animate__animated', 'animate__shakeX');
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
    // Get settings from storage
    let tipAmount = 0.10;
    let confirmBeforeTipping = false;

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

  /**
   * Send tip for a tweet
   * @param {number} tipAmount - The amount to tip
   * @param {Object} buttonWrapper - Button wrapper with state methods
   * @param {string} tweetUrl - The tweet URL to tip
   */
  async function sendTweetTip(tipAmount, buttonWrapper, tweetUrl) {
    buttonWrapper.setLoading();

    // Get JWT from storage
    let jwt = '';

    try {
      const result = await chrome.storage.local.get(['GROVE_API_JWT']);
      jwt = result.GROVE_API_JWT || '';

      if (!jwt) {
        console.error("[Grove Extension] No API key configured");
        buttonWrapper.setError();
        return;
      }
    } catch (error) {
      console.error("[Grove Extension] Settings load failed:", error);
      buttonWrapper.setError();
      return;
    }

    // Use the tweet URL instead of current page URL
    const response = await GroveAPI.sendTip(tweetUrl, tipAmount, jwt);

    if (response.success) {
      buttonWrapper.setSuccess();
    } else {
      console.error("[Grove Extension] Tweet tip failed:", response.error);
      buttonWrapper.setError();
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
