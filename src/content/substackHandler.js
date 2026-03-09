/**
 * Substack Handler Module
 * Handles tip button injection in Substack author hover cards
 *
 * Note: Page-level buttons (profiles/posts) are handled by ProfilePageHandler
 * (API-first with DOM fallback).
 */

const SubstackHandler = {
  // Callbacks for interacting with parent context
  callbacks: {
    hasAddresses: null,        // (text) => boolean
    resolveAddress: null,      // (text) => { address, type }
    onTipClick: null,          // (buttonInstance, tipOverrides?) => void
    createTipButton: null,     // (onTipClick, platform) => TipButton
  },

  // State
  adapter: null,

  /**
   * Initialize the handler with callbacks
   * @param {Object} callbacks - Callback functions for address handling and tip clicks
   */
  init(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  },

  /**
   * Initialize Substack handler for the current page
   * @param {Object} adapter - The Substack adapter
   * @returns {Promise<null>}
   */
  async initialize(adapter) {
    if (!adapter) {
      groveLog.log('[Substack] No adapter provided');
      return null;
    }

    this.adapter = adapter;
    groveLog.log('[Substack] Initializing hover card observer...');

    // Check if we're on a supported page (post or profile)
    if (!adapter.detectTippablePage()) {
      groveLog.log('[Substack] Not a supported page, skipping');
      return null;
    }

    // Start hover card observer (bio/address might be in hover card)
    this.startHoverCardObserver();

    return null;
  },

  /**
   * Start observing for hover cards
   */
  startHoverCardObserver() {
    if (!this.adapter) return;

    this.adapter.startHoverCardObserver((hoverCard, bioData) => {
      groveLog.log('[Substack] Hover card detected with bio:', bioData?.bio?.substring(0, 100));

      if (!bioData?.bio || !this.callbacks.hasAddresses || !this.callbacks.resolveAddress) return;
      if (!this.callbacks.hasAddresses(bioData.bio)) return;

      const addressResult = this.callbacks.resolveAddress(bioData.bio);
      groveLog.log('[Substack] Resolved address from hover card:', addressResult);

      if (!addressResult?.address) return;

      this.injectHoverCardButton(hoverCard, bioData, addressResult);
    });
  },

  /**
   * Normalize Substack profile URL.
   * Hover cards often contain `"/@handle"` relative links which should resolve against substack.com,
   * not the current publication subdomain.
   * @param {string|null} profileUrl
   * @returns {string|null}
   */
  normalizeProfileUrl(profileUrl) {
    if (!profileUrl) return null;
    try {
      if (profileUrl.startsWith('http://') || profileUrl.startsWith('https://')) {
        return profileUrl.replace(/\/$/, '');
      }
      if (profileUrl.startsWith('/@')) {
        return `https://substack.com${profileUrl}`.replace(/\/$/, '');
      }
      return new URL(profileUrl, window.location.origin).toString().replace(/\/$/, '');
    } catch {
      return profileUrl;
    }
  },

  /**
   * Extract a Substack handle from a profile URL.
   * @param {string|null} profileUrl
   * @returns {string|null}
   */
  extractHandleFromProfileUrl(profileUrl) {
    if (!profileUrl) return null;
    try {
      const url = new URL(profileUrl);
      const match = url.pathname.match(/^\/@([^\/\?]+)/);
      return match ? match[1] : null;
    } catch {
      const match = profileUrl.match(/\/@([^\/\?]+)/);
      return match ? match[1] : null;
    }
  },

  /**
   * Apply compact styling for hover-card buttons on top of TipButton's default styles.
   * @param {TipButton} tipButton
   */
  applyHoverCardButtonStyle(tipButton) {
    if (!tipButton?.button) return;

    const el = tipButton.button;

    // Match the compact hover-card variant in src/ui/styles.css as closely as possible.
    el.style.setProperty('background', 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)', 'important');
    el.style.setProperty('border', '1px solid var(--grove-primary)', 'important');
    el.style.setProperty('border-radius', '9999px', 'important');
    el.style.setProperty('padding', '0 10px', 'important');
    el.style.setProperty('height', '22px', 'important');
    el.style.setProperty('min-height', '22px', 'important');
    el.style.setProperty('max-height', '22px', 'important');
    el.style.setProperty('min-width', 'auto', 'important');
    el.style.setProperty('box-shadow', 'none', 'important');
    el.style.setProperty('margin-left', '8px', 'important');
    el.style.setProperty('margin-right', '0px', 'important');
    el.style.setProperty('vertical-align', 'middle', 'important');

    // Tighten inner text sizing
    if (tipButton.textSpan) {
      tipButton.textSpan.style.setProperty('font-size', '11px', 'important');
      tipButton.textSpan.style.setProperty('font-weight', '600', 'important');
      tipButton.textSpan.style.setProperty('color', 'white', 'important');
    }
    if (tipButton.emojiSpan) {
      tipButton.emojiSpan.style.setProperty('font-size', '12px', 'important');
    }
    if (tipButton.sheenOverlay) {
      tipButton.sheenOverlay.style.setProperty('display', 'none', 'important');
    }
  },

  /**
   * Inject tip button into a Substack hover card
   * @param {Element} hoverCard - The hover card element
   * @param {{handle: string|null, profileUrl: string|null}} bioData
   * @param {{address: string, type: string}} addressResult
   */
  injectHoverCardButton(hoverCard, bioData, addressResult) {
    // Check if button already exists in this hover card
    if (hoverCard.querySelector('.grove-tip-button')) {
      return;
    }

    groveLog.log('[Substack] Injecting tip button into hover card');

    const placement = this.adapter.getHoverCardButtonPlacement(hoverCard);
    if (!placement) {
      groveLog.log('[Substack] Could not find hover card button placement');
      return;
    }

    if (!this.callbacks.createTipButton) {
      groveLog.log('[Substack] No createTipButton callback provided');
      return;
    }

    const recipientProfileUrl = this.normalizeProfileUrl(bioData?.profileUrl || null);
    const recipientUsername = bioData?.handle || this.extractHandleFromProfileUrl(recipientProfileUrl);

    const tipOverrides = {
      resolvedAddress: addressResult,
      recipient_username: recipientUsername,
      recipient_profile_url: recipientProfileUrl,
      source_post_url: window.location.href
    };

    const tipButton = this.callbacks.createTipButton(
      (buttonInstance) => {
        if (this.callbacks.onTipClick) {
          this.callbacks.onTipClick(buttonInstance, tipOverrides);
        }
      },
      'substack'
    );

    tipButton.create();

    // Allow multiple hover-card buttons by removing the global ID.
    if (tipButton.button) {
      tipButton.button.id = '';
      tipButton.button.classList.add('grove-substack-hover-button');
    }

    this.applyHoverCardButtonStyle(tipButton);
    placement.appendChild(tipButton.button);
    groveLog.log('[Substack] Hover card tip button injected');
  },

  /**
   * Reset state (for page navigation)
   */
  reset() {
    if (this.adapter) {
      this.adapter.stopHoverCardObserver();
    }
    this.adapter = null;
  }
};
