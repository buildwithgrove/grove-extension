/**
 * Profile Page Handler Module
 * Handles tip button initialization on profile pages and tweet pages
 *
 * Resolution strategy:
 * - Full pages (profiles, posts): Use API /resolve for consistent resolution
 * - Inline content (feeds, hover cards): Use client-side DOM parsing (handled elsewhere)
 */
console.log('[Grove Extension] profilePageHandler.js loaded');

const ProfilePageHandler = {
  // Callbacks for interacting with parent context
  callbacks: {
    hasAddresses: null,        // (text) => boolean - for fallback DOM parsing
    resolveAddress: null,      // (text) => { address, type } - for fallback DOM parsing
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
   * Build the destination URL for API resolution
   * @returns {string} - Clean URL without trailing slash
   */
  buildDestinationUrl() {
    return window.location.href.replace(/\/$/, '');
  },

  /**
   * Initialize profile/page button for the current page
   * Uses API resolution for full page views
   * @param {Object} adapter - The platform adapter
   * @returns {Promise<Object|null>} - The resolved address or null
   */
  async initialize(adapter) {
    if (!adapter) {
      console.log('[Grove Extension] ProfilePageHandler: No adapter provided');
      return null;
    }

    try {
      // Wait for page to load (if adapter supports it)
      if (typeof adapter.waitForProfileLoad === 'function') {
        const loaded = await adapter.waitForProfileLoad();
        if (!loaded) {
          return null;
        }
      }

      // Use API for resolution (consistent pattern for all full page views)
      // TODO_IMPROVE: API /v1/destination/resolve currently returns 404 for most URLs.
      //   Once the backend fully supports profile and tweet URL resolution,
      //   the DOM fallback below can be removed or made truly exceptional.
      const destination = this.buildDestinationUrl();
      console.log('[Grove Extension] [Resolve] Calling API for full page:', {
        platform: adapter.getPlatformName?.() || 'unknown',
        destination
      });

      // Check if GroveAPI is available
      if (typeof GroveAPI === 'undefined' || typeof GroveAPI.resolveDestination !== 'function') {
        console.log('[Grove Extension] GroveAPI.resolveDestination not available, falling back to DOM parsing');
        return this.initializeWithDomParsing(adapter);
      }

      const result = await GroveAPI.resolveDestination(destination);
      console.log('[Grove Extension] [Resolve] API parsed result:', result);

      if (!result.tippable || !result.addresses || result.addresses.length === 0) {
        console.log('[Grove Extension] [Resolve] API returned non-tippable result; falling back to DOM parsing:', {
          error: result.error || 'No addresses found',
          addressesCount: result.addresses?.length || 0
        });
        // Fallback to DOM parsing for backwards compatibility
        return this.initializeWithDomParsing(adapter);
      }

      // Use first address from API response
      const primaryAddress = result.addresses[0];
      const resolvedApiAddress = primaryAddress?.address || null;

      // Guard against malformed API parsing results (e.g., random words from bio).
      // If the returned value is not a valid address/ENS by client-side parser rules,
      // treat API result as non-authoritative and fall back to DOM parsing.
      if (!resolvedApiAddress || !this.callbacks.resolveAddress) {
        console.warn('[Grove Extension] [Resolve] API returned unusable address; falling back to DOM parsing:', primaryAddress);
        return this.initializeWithDomParsing(adapter);
      }

      const validation = this.callbacks.resolveAddress(resolvedApiAddress);
      if (!validation?.address) {
        console.warn('[Grove Extension] [Resolve] API returned invalid address; falling back to DOM parsing:', primaryAddress);
        return this.initializeWithDomParsing(adapter);
      }

      this.resolvedAddress = {
        address: validation.address,
        type: primaryAddress.source || validation.type || 'api',
        token: primaryAddress.token,
        chain: primaryAddress.chain
      };

      console.log(`[Grove Extension] ✅ Address resolved via API: ${this.resolvedAddress.address} (type: ${this.resolvedAddress.type})`);

      // Cache for inline content (tweets, hover cards)
      const username = this.callbacks.extractUsernameFromUrl?.(window.location.href);
      if (username && this.callbacks.setCachedAddress) {
        this.callbacks.setCachedAddress(username, this.resolvedAddress);
        console.log(`[Grove Extension] [Cache] Stored resolved address for @${username}`);
      } else {
        console.log('[Grove Extension] [Cache] Skipping cache write: no cache key extracted from URL', window.location.href);
      }

      // Inject button
      return this.injectButton(adapter);

    } catch (error) {
      console.error('[Grove Extension] [Resolve] Profile button initialization failed; falling back to DOM parsing:', error);
      // Fallback to DOM parsing on error
      return this.initializeWithDomParsing(adapter);
    }
  },

  /**
   * Fallback initialization using DOM parsing (legacy approach)
   * Used when API is unavailable or returns no results
   * @param {Object} adapter - The platform adapter
   * @returns {Promise<Object|null>} - The resolved address or null
   */
  async initializeWithDomParsing(adapter) {
    console.log('[Grove Extension] [Resolve] Entering DOM fallback path');

    // Extract bio to check for addresses
    const bio = adapter.extractBio();

    if (!bio) {
      console.log('[Grove Extension] [Resolve] DOM fallback: no bio extracted; not showing button');
      return null;
    }

    console.log('[Grove Extension] [Resolve] DOM fallback: bio extracted');

    // Check if bio contains tippable address
    if (!this.callbacks.hasAddresses || !this.callbacks.hasAddresses(bio)) {
      console.log('[Grove Extension] [Resolve] DOM fallback: bio has no tippable address; not showing button');
      return null;
    }

    // Extract address (ENS names are resolved by the backend)
    if (!this.callbacks.resolveAddress) {
      console.log('[Grove Extension] [Resolve] DOM fallback: resolveAddress callback missing');
      return null;
    }

    const result = this.callbacks.resolveAddress(bio);
    if (!result || !result.address) {
      console.log('[Grove Extension] [Resolve] DOM fallback: could not extract address; not showing button');
      return null;
    }

    this.resolvedAddress = result;
    console.log(`[Grove Extension] ✅ Address detected via DOM: ${result.address} (type: ${result.type})`);

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

    // Inject button
    return this.injectButton(adapter);
  },

  /**
   * Inject the tip button into the page
   * @param {Object} adapter - The platform adapter
   * @returns {Object|null} - The resolved address or null
   */
  injectButton(adapter) {
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

    // For SoundCloud, position button first (left of Station)
    // CSS ordering styles are injected once by content.js ensureSoundCloudOrderStyles()
    if (platformName === 'soundcloud') {
      button.style.setProperty('float', 'left', 'important');
      button.style.setProperty('order', '-999', 'important');
      placement.insertBefore(button, placement.firstElementChild);
    } else {
      this.currentButton.inject(placement);
    }

    return this.resolvedAddress;
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

// Expose to window for browser context
if (typeof window !== 'undefined') {
  window.ProfilePageHandler = ProfilePageHandler;
}
