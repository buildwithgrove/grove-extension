/**
 * Substack Handler Module
 * Handles tip button initialization on Substack post pages and hover cards
 */

const SubstackHandler = {
  // Callbacks for interacting with parent context
  callbacks: {
    hasAddresses: null,        // (text) => boolean
    resolveAddress: null,      // (text) => { address, type }
    onTipClick: null,          // (buttonInstance) => void
    createTipButton: null,     // (onTipClick, platform) => TipButton
  },

  // State
  currentButton: null,
  resolvedAddress: null,
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
   * @returns {Promise<Object|null>} - The resolved address or null
   */
  async initialize(adapter) {
    if (!adapter) {
      console.log('[Grove Substack] No adapter provided');
      return null;
    }

    this.adapter = adapter;
    console.log('[Grove Substack] Initializing...');

    // Check if we're on a supported page (post or profile)
    if (!adapter.detectTippablePage()) {
      console.log('[Grove Substack] Not a supported page, skipping');
      return null;
    }

    console.log('[Grove Substack] On a supported page, initializing...');

    // Wait for the page to load
    const loaded = await adapter.waitForProfileLoad();
    if (!loaded) {
      console.log('[Grove Substack] Page did not load in time');
      return null;
    }

    console.log('[Grove Substack] Page loaded');

    // Try to extract bio from page content (might have address)
    const pageBio = adapter.extractBio();
    console.log('[Grove Substack] Page bio:', pageBio);

    if (pageBio && this.callbacks.hasAddresses && this.callbacks.hasAddresses(pageBio)) {
      const addressResult = this.callbacks.resolveAddress(pageBio);
      console.log('[Grove Substack] Resolved address from page:', addressResult);

      if (addressResult && addressResult.address) {
        this.resolvedAddress = addressResult;
        this.injectPageButtons();
      }
    } else {
      console.log('[Grove Substack] No address in page bio, will check hover cards');
    }

    // Always start hover card observer (bio might be in hover card)
    this.startHoverCardObserver();

    return this.resolvedAddress;
  },

  /**
   * Start observing for hover cards
   */
  startHoverCardObserver() {
    this.adapter.startHoverCardObserver((hoverCard, bioData) => {
      console.log('[Grove Substack] Hover card detected with bio:', bioData.bio?.substring(0, 100));

      if (bioData.bio && this.callbacks.hasAddresses && this.callbacks.hasAddresses(bioData.bio)) {
        const addressResult = this.callbacks.resolveAddress(bioData.bio);
        console.log('[Grove Substack] Resolved address from hover card:', addressResult);

        if (addressResult && addressResult.address) {
          this.resolvedAddress = addressResult;

          // Inject button in page (action bar or profile header) if not already done
          if (!this.currentButton) {
            this.injectPageButtons();
          }

          // Also inject a tip button in the hover card
          this.injectHoverCardButton(hoverCard, bioData.profileUrl);
        }
      }
    });
  },

  /**
   * Inject tip buttons into page (action bars or profile header)
   */
  injectPageButtons() {
    // 1. Try to inject into profile header (subscribe widget or similar)
    const profilePlacement = this.adapter.getProfileButtonPlacement();
    if (profilePlacement) {
      this.injectProfileButton(profilePlacement);
    }

    // 2. Inject into all visible action bars
    const actionBars = this.adapter.getAllActionBars();
    console.log('[Grove Substack] Found', actionBars.length, 'action bar(s)');

    if (actionBars.length === 0) {
      if (!profilePlacement) {
        console.log('[Grove Substack] Could not find any button placement');
      }
      return;
    }

    actionBars.forEach((actionBar, index) => {
      // Skip if already has a tip button
      if (actionBar.querySelector('.grove-tip-button')) {
        console.log('[Grove Substack] Action bar', index, 'already has tip button');
        return;
      }

      const placement = this.adapter.getButtonPlacementInActionBar(actionBar);
      if (!placement) {
        console.log('[Grove Substack] Could not find button placement in action bar', index);
        return;
      }

      // Find restack button to insert after
      const restackButton = this.adapter.getRestackButtonInActionBar(actionBar);
      console.log('[Grove Substack] Action bar', index, '- Restack button:', restackButton ? 'found' : 'not found');

      // Create tip button for this action bar
      const tipButton = this.callbacks.createTipButton(
        (buttonInstance) => {
          if (this.callbacks.onTipClick) {
            this.callbacks.onTipClick(buttonInstance);
          }
        },
        'substack'
      );
      tipButton.create();

      // Store the first button as currentButton for compatibility if not set by profile
      if (!this.currentButton && index === 0) {
        this.currentButton = tipButton;
      }

      // Insert after restack button if found, otherwise append to placement
      if (restackButton && restackButton.parentElement) {
        restackButton.parentElement.insertBefore(tipButton.button, restackButton.nextSibling);
        console.log('[Grove Substack] Tip button injected after restack button in action bar', index);
      } else {
        placement.appendChild(tipButton.button);
        console.log('[Grove Substack] Tip button appended to placement in action bar', index);
      }
    });
  },

  /**
   * Inject tip button into profile header
   * @param {Element} placement - The container element to inject into
   */
  injectProfileButton(placement) {
    // Skip if already has a tip button
    if (placement.querySelector('.grove-tip-button')) {
      console.log('[Grove Substack] Profile header already has tip button');
      return;
    }

    // Create tip button
    const tipButton = this.callbacks.createTipButton(
      (buttonInstance) => {
        if (this.callbacks.onTipClick) {
          this.callbacks.onTipClick(buttonInstance);
        }
      },
      'substack'
    );
    tipButton.create();
    this.currentButton = tipButton;

    // Insert as last child of the placement container
    placement.appendChild(tipButton.button);
    console.log('[Grove Substack] Tip button injected into profile header');
  },

  /**
   * Inject tip button into a Substack hover card
   * @param {Element} hoverCard - The hover card element
   * @param {string} profileUrl - The author's profile URL
   */
  injectHoverCardButton(hoverCard, profileUrl) {
    // Check if button already exists in this hover card
    if (hoverCard.querySelector('.grove-tip-button')) {
      return;
    }

    console.log('[Grove Substack] Injecting tip button into hover card');

    const placement = this.adapter.getHoverCardButtonPlacement(hoverCard);
    if (!placement) {
      console.log('[Grove Substack] Could not find hover card button placement');
      return;
    }

    // Create hover card tip button using CSS class instead of inline styles
    const button = document.createElement('button');
    button.className = 'grove-tip-button grove-substack-hover-button';
    button.innerHTML = '<span class="grove-tip-label">Tip</span>';

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.callbacks.onTipClick) {
        this.callbacks.onTipClick(null);
      }
    });

    placement.appendChild(button);
    console.log('[Grove Substack] Hover card tip button injected');
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
    if (this.adapter) {
      this.adapter.stopHoverCardObserver();
    }
    this.adapter = null;
  }
};
