/**
 * Hover Card Handler Module
 * Handles Twitter hover card detection and tip button injection
 */

const HoverCardHandler = {
  observer: null,

  // Callbacks set by content.js
  callbacks: {
    getCachedAddress: null,
    setCachedAddress: null,
    checkForAddress: null, // (text) => { address, type } | null
    detectDarkMode: null,
    onTipClick: null, // (buttonWrapper, profileUrl) => Promise
    formatTipAmount: null,
    ensureEllipsisStyles: null
  },

  // Colors (set from GROVE_COLORS)
  colors: {
    primary: '#389f58',
    primaryHover: '#2f8549',
    shadow: 'rgba(56, 159, 88, 0.3)',
    shadowHover: 'rgba(56, 159, 88, 0.5)',
    error: '#ef4444',
    errorShadow: 'rgba(239, 68, 68, 0.55)'
  },

  /**
   * Initialize the hover card handler
   * @param {Object} callbacks - Callback functions
   * @param {Object} colors - Color configuration
   */
  init(callbacks, colors) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    if (colors) {
      this.colors = { ...this.colors, ...colors };
    }
  },

  /**
   * Start observing for hover cards
   */
  startObserving() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            let hoverCard = null;

            if (node.matches && node.matches('[data-testid="HoverCard"]')) {
              hoverCard = node;
            } else if (node.querySelector) {
              hoverCard = node.querySelector('[data-testid="HoverCard"]');
            }

            if (hoverCard) {
              this.injectButton(hoverCard);
            }
          }
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },

  /**
   * Stop observing
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  },

  /**
   * Extract username and profile URL from hover card
   * @param {Element} hoverCard
   * @returns {{username: string, profileUrl: string} | null}
   */
  extractUserInfo(hoverCard) {
    const usernameLink = hoverCard.querySelector('a[href^="/"][role="link"]');
    if (!usernameLink) return null;

    const href = usernameLink.getAttribute('href');
    if (!href || !/^\/[a-zA-Z0-9_]+$/.test(href)) return null;

    return {
      username: href.substring(1),
      profileUrl: `https://x.com${href}`
    };
  },

  /**
   * Check if user has a tippable address
   * @param {Element} hoverCard
   * @param {string} username
   * @returns {boolean}
   */
  checkTippableAddress(hoverCard, username) {
    const { getCachedAddress, setCachedAddress, checkForAddress } = this.callbacks;

    // Check cache first
    if (getCachedAddress) {
      const cached = getCachedAddress(username);
      if (cached === 'no-address') {
        return false;
      }
      if (cached && cached.address) {
        return true;
      }
    }

    // Check display name
    const displayNameElement = hoverCard.querySelector('[data-testid="UserName"]') ||
                               hoverCard.querySelector('a[href^="/"][role="link"] span');
    const displayName = displayNameElement?.textContent || '';

    if (displayName && checkForAddress) {
      const result = checkForAddress(displayName);
      if (result && result.address) {
        if (setCachedAddress) setCachedAddress(username, result);
        groveLog.log(`[HoverCard] Found address in display name for @${username}: ${result.address}`);
        return true;
      }
    }

    // Check bio
    const bioElement = hoverCard.querySelector('[data-testid="UserDescription"]');
    const bio = bioElement?.textContent || '';

    if (bio && checkForAddress) {
      const result = checkForAddress(bio);
      if (result && result.address) {
        if (setCachedAddress) setCachedAddress(username, result);
        groveLog.log(`[HoverCard] Found address in bio for @${username}: ${result.address}`);
        return true;
      }
    }

    // No address found
    if (setCachedAddress) setCachedAddress(username, 'no-address');
    return false;
  },

  /**
   * Create the tip button element
   * @param {string} profileUrl
   * @returns {Element}
   */
  createButton(profileUrl) {
    const isDarkMode = this.callbacks.detectDarkMode ? this.callbacks.detectDarkMode() : false;
    const bgColor = isDarkMode ? '#1a1a1a' : '#ffffff';
    const bgHoverColor = isDarkMode ? '#252525' : '#f0f0f0';
    const textColor = isDarkMode ? '#ffffff' : '#1a1a1a';

    const button = document.createElement('button');
    button.className = 'grove-hovercard-tip-button';
    button.setAttribute('aria-label', 'Send a tip');
    button.setAttribute('type', 'button');

    button.style.cssText = `
      background: ${bgColor} !important;
      border: 2px solid ${this.colors.primary} !important;
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
      box-shadow: 0 2px 8px ${this.colors.shadow} !important;
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
    emojiSpan.textContent = '\u{1F33F}';
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
      button.style.boxShadow = `0 4px 12px ${this.colors.shadowHover} !important`;
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = `${bgColor} !important`;
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = `0 2px 8px ${this.colors.shadow} !important`;
    });

    // Click handler
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const buttonWrapper = this.createButtonWrapper(button, textSpan, emojiSpan, sheenOverlay, defaultSheenBackground);

      if (this.callbacks.onTipClick) {
        await this.callbacks.onTipClick(buttonWrapper, profileUrl);
      }
    });

    return { button, textSpan, emojiSpan, sheenOverlay };
  },

  /**
   * Create button wrapper with state methods
   */
  createButtonWrapper(button, textSpan, emojiSpan, sheenOverlay, defaultSheenBackground) {
    const self = this;

    return {
      button,
      textSpan,
      emojiSpan,
      setLoading: (amount) => {
        if (self.callbacks.ensureEllipsisStyles) {
          self.callbacks.ensureEllipsisStyles();
        }
        button.disabled = true;
        button.style.pointerEvents = 'none';

        const formattedAmount = self.callbacks.formatTipAmount ? self.callbacks.formatTipAmount(amount) : amount;
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
        button.style.setProperty('border', `2px solid ${self.colors.primary}`, 'important');
        button.style.setProperty('box-shadow', `0 2px 8px ${self.colors.shadow}`, 'important');
        sheenOverlay.style.background = defaultSheenBackground;
        textSpan.classList.remove('grove-ellipsis');
        textSpan.textContent = 'Sent! \u2713';
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
        button.style.setProperty('border', `2px solid ${self.colors.error}`, 'important');
        button.style.setProperty('box-shadow', `0 0 12px ${self.colors.errorShadow}`, 'important');
        sheenOverlay.style.background = 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.35), transparent)';
        textSpan.classList.remove('grove-ellipsis');
        textSpan.textContent = 'Failed \u2717';
        button.classList.add('animate__animated', 'animate__shakeX');
        setTimeout(() => {
          textSpan.textContent = 'Tip';
          textSpan.appendChild(emojiSpan);
          button.classList.remove('animate__animated', 'animate__shakeX');
          button.style.setProperty('border', `2px solid ${self.colors.primary}`, 'important');
          button.style.setProperty('box-shadow', `0 2px 8px ${self.colors.shadow}`, 'important');
          sheenOverlay.style.background = defaultSheenBackground;
        }, 2000);
      }
    };
  },

  /**
   * Inject tip button into hover card
   * @param {Element} hoverCard
   */
  injectButton(hoverCard) {
    // Check if button already exists
    if (hoverCard.querySelector('.grove-hovercard-tip-button')) {
      return;
    }

    // Find follow button
    const followButton = hoverCard.querySelector('[data-testid$="-follow"]') ||
                         hoverCard.querySelector('[data-testid$="-unfollow"]');
    if (!followButton) return;

    const buttonContainer = followButton.parentElement;
    if (!buttonContainer) return;

    // Get user info
    const userInfo = this.extractUserInfo(hoverCard);
    if (!userInfo) return;

    // Check if user has tippable address
    if (!this.checkTippableAddress(hoverCard, userInfo.username)) {
      return;
    }

    // Create and inject button
    const { button } = this.createButton(userInfo.profileUrl);

    // Create wrapper for buttons
    const wrapper = document.createElement('div');
    wrapper.className = 'grove-hovercard-buttons';
    wrapper.style.cssText = `
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 8px !important;
    `;

    followButton.parentElement.insertBefore(wrapper, followButton);
    wrapper.appendChild(button);
    wrapper.appendChild(followButton);
  }
};
