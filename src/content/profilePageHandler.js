/**
 * Profile Page Handler Module
 * Handles tip button initialization on profile pages
 */

const ProfilePageHandler = {
  // Callbacks for interacting with parent context
  callbacks: {
    hasAddresses: null,        // (text) => boolean
    resolveAddress: null,      // (text) => { address, type }
    setCachedAddress: null,    // (username, result) => void
    onTipClick: null,          // (buttonInstance) => void
    extractUsernameFromUrl: null, // (url) => string|null
  },

  // State
  currentButton: null,
  resolvedAddress: null,

  /**
   * Initialize the handler with callbacks
   * @param {Object} callbacks - Callback functions for address handling and tip clicks
   */
  init(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  },

  /**
   * Initialize profile button for the current page
   * @param {Object} adapter - The platform adapter
   * @returns {Promise<Object|null>} - The resolved address or null
   */
  async initialize(adapter) {
    if (!adapter) {
      console.log('[Grove Extension] ProfilePageHandler: No adapter provided');
      return null;
    }

    try {
      // Wait for profile to load (if adapter supports it)
      if (typeof adapter.waitForProfileLoad === 'function') {
        const loaded = await adapter.waitForProfileLoad();
        if (!loaded) {
          return null;
        }
      }

      // Extract bio to check for addresses
      const bio = adapter.extractBio();

      if (!bio) {
        console.log('[Grove Extension] No bio found - not showing button');
        return null;
      }

      console.log('[Grove Extension] Bio extracted');

      // Check if bio contains tippable address
      if (!this.callbacks.hasAddresses || !this.callbacks.hasAddresses(bio)) {
        console.log('[Grove Extension] No tippable address found in bio - not showing button');
        return null;
      }

      // Extract address (ENS names are resolved by the backend)
      if (!this.callbacks.resolveAddress) {
        console.log('[Grove Extension] No resolveAddress callback provided');
        return null;
      }

      const result = this.callbacks.resolveAddress(bio);
      if (!result || !result.address) {
        console.log('[Grove Extension] Could not extract address - not showing button');
        return null;
      }

      this.resolvedAddress = result;
      console.log(`[Grove Extension] ✅ Address detected: ${result.address} (type: ${result.type})`);

      // Cache the address by username for tweet tip buttons
      if (adapter.getPlatformName() === 'twitter') {
        const username = this.callbacks.extractUsernameFromUrl
          ? this.callbacks.extractUsernameFromUrl(window.location.href)
          : null;
        if (username && this.callbacks.setCachedAddress) {
          this.callbacks.setCachedAddress(username, result);
          console.log(`[Grove Extension] Cached address for @${username}`);
        }
      }

      // Get button placement location
      const placement = adapter.getButtonPlacement();
      if (!placement) {
        console.log('[Grove Extension] Could not find button placement location');
        return null;
      }

      // Create and inject tip button
      const platformName = adapter.getPlatformName();
      this.currentButton = new TipButton(
        (buttonInstance) => {
          if (this.callbacks.onTipClick) {
            this.callbacks.onTipClick(buttonInstance);
          }
        },
        platformName
      );

      const button = this.currentButton.create();
      button.classList.add('grove-ad-mode');

      // For SoundCloud, use CSS order to position button first (left of Station)
      if (platformName === 'soundcloud') {
        // Inject CSS rule with high specificity to force order
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
        button.style.setProperty('float', 'left', 'important');
        button.style.setProperty('order', '-999', 'important');
        placement.insertBefore(button, placement.firstElementChild);
        console.log('[Grove Extension] Inserted tip button with float/spacing + order: -999 !important + CSS rule');
      } else {
        this.currentButton.inject(placement);
      }

      return this.resolvedAddress;
    } catch (error) {
      console.error('[Grove Extension] Profile button initialization failed:', error);
      return null;
    }
  },

  /**
   * Get the current button instance
   * @returns {TipButton|null}
   */
  getButton() {
    return this.currentButton;
  },

  /**
   * Get the resolved address
   * @returns {Object|null}
   */
  getResolvedAddress() {
    return this.resolvedAddress;
  },

  /**
   * Reset state (for page navigation)
   */
  reset() {
    this.currentButton = null;
    this.resolvedAddress = null;
  }
};
