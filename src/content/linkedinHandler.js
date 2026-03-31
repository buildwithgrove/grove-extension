/**
 * LinkedIn Handler Module
 * Handles tip button injection in LinkedIn feed posts
 *
 * Note: Profile and individual post pages are handled by ProfilePageHandler
 * (API-first with DOM fallback). This handler processes feed posts.
 */

groveLog.log('linkedinHandler.js loaded');

const LinkedInHandler = {
  // Callbacks for interacting with parent context
  callbacks: {
    onTipClick: null,          // (buttonInstance, tipOverrides?) => void
    createTipButton: null,     // (onTipClick, platform) => TipButton
  },

  // State
  adapter: null,
  feedObserver: null,
  processedPosts: new WeakSet(),
  initialized: false,

  /**
   * Initialize the handler with callbacks
   * @param {Object} callbacks - Callback functions
   */
  init(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  },

  /**
   * Initialize LinkedIn feed handler
   * @param {Object} adapter - The LinkedIn adapter
   * @returns {Promise<null>}
   */
  async initialize(adapter) {
    if (!adapter) {
      groveLog.log('[LinkedIn] No adapter provided');
      return null;
    }

    // Prevent double initialization from generic + LinkedIn content script entries
    if (this.initialized) {
      groveLog.log('[LinkedIn] Feed handler already initialized, skipping');
      return null;
    }
    this.initialized = true;

    this.adapter = adapter;
    groveLog.log('[LinkedIn] Initializing feed handler...');

    // Process existing feed posts
    this.processExistingPosts();

    // Start observing for new posts (infinite scroll)
    this.startObserving();

    return null;
  },

  /**
   * Process all existing feed posts on the page
   */
  processExistingPosts() {
    const posts = this.findFeedPosts();
    groveLog.log(`[LinkedIn] Found ${posts.length} existing feed posts`);
    posts.forEach(post => this.processPost(post));
  },

  /**
   * Find all feed post elements on the page
   * @returns {Element[]}
   */
  findFeedPosts() {
    // LinkedIn feed posts are wrapped in containers with data-urn attributes
    // or use specific component classes
    const selectors = [
      '.feed-shared-update-v2',
      '[data-urn^="urn:li:activity"]',
      'div[data-id^="urn:li:activity"]',
    ];

    for (const selector of selectors) {
      const posts = document.querySelectorAll(selector);
      if (posts.length > 0) return Array.from(posts);
    }

    return [];
  },

  /**
   * Process a single feed post and inject tip button
   * @param {Element} postElement - The post DOM element
   */
  processPost(postElement) {
    // Skip if already processed
    if (this.processedPosts.has(postElement)) return;
    this.processedPosts.add(postElement);

    // Skip if tip button already exists in this post
    if (postElement.querySelector('.grove-linkedin-feed-tip-button')) return;

    // Find the social actions bar within this post
    const actionsBar = postElement.querySelector('.social-details-social-activity')
      || postElement.querySelector('.feed-shared-social-action-bar')
      || postElement.querySelector('[class*="social-action"]');

    if (!actionsBar) {
      groveLog.log('[LinkedIn] No actions bar found in post');
      return;
    }

    // Extract author profile URL from the post
    const authorProfileUrl = this.extractAuthorProfileUrl(postElement);
    if (!authorProfileUrl) {
      groveLog.log('[LinkedIn] No author profile URL found in post');
      return;
    }

    const authorUsername = this.adapter.extractUsernameFromUrl(authorProfileUrl);
    groveLog.log('[LinkedIn] Processing feed post for:', authorUsername);

    // Create tip button
    if (!this.callbacks.createTipButton) return;

    const tipButtonInstance = this.callbacks.createTipButton(
      (buttonInstance) => {
        if (this.callbacks.onTipClick) {
          this.callbacks.onTipClick(buttonInstance, {
            resolvedAddress: { address: authorProfileUrl, type: 'profile_url' },
            recipient_username: authorUsername,
            recipient_profile_url: authorProfileUrl,
            source_post_url: window.location.href,
          });
        }
      },
      'linkedin'
    );

    const tipButton = tipButtonInstance.create();
    tipButton.classList.add('grove-linkedin-feed-tip-button');
    tipButton.id = ''; // Allow multiple feed buttons

    // Insert into the social actions bar
    actionsBar.appendChild(tipButton);
    groveLog.log('[LinkedIn] Injected tip button in feed post for:', authorUsername);
  },

  /**
   * Extract the author's profile URL from a feed post
   * @param {Element} postElement - The post DOM element
   * @returns {string|null} - Profile URL or null
   */
  extractAuthorProfileUrl(postElement) {
    // Look for the author's profile link in the post header
    const authorLink = postElement.querySelector('.update-components-actor__container a[href*="/in/"]')
      || postElement.querySelector('.feed-shared-actor__container a[href*="/in/"]')
      || postElement.querySelector('a.update-components-actor__meta-link[href*="/in/"]')
      || postElement.querySelector('.update-components-actor a[href*="/in/"]')
      || postElement.querySelector('.feed-shared-actor a[href*="/in/"]')
      || postElement.querySelector('a.app-aware-link[href*="/in/"]');

    if (authorLink) {
      const href = authorLink.getAttribute('href');
      // Clean the URL — remove query params and hash, ensure full URL
      try {
        const url = new URL(href, 'https://www.linkedin.com');
        const cleanPath = url.pathname.replace(/\/$/, '');
        return `https://www.linkedin.com${cleanPath}`;
      } catch {
        return null;
      }
    }

    return null;
  },

  /**
   * Start observing for new feed posts (infinite scroll)
   */
  startObserving() {
    if (this.feedObserver) {
      this.feedObserver.disconnect();
    }

    this.feedObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // Check if the added node is a feed post
          if (this.isFeedPost(node)) {
            this.processPost(node);
          }

          // Check for feed posts within added subtrees
          if (node.querySelectorAll) {
            const posts = node.querySelectorAll(
              '.feed-shared-update-v2, [data-urn^="urn:li:activity"], div[data-id^="urn:li:activity"]'
            );
            posts.forEach(post => this.processPost(post));
          }
        }
      }
    });

    this.feedObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    groveLog.log('[LinkedIn] Feed observer started');
  },

  /**
   * Check if an element is a feed post
   * @param {Element} element - DOM element
   * @returns {boolean}
   */
  isFeedPost(element) {
    if (element.classList?.contains('feed-shared-update-v2')) return true;
    const urn = element.getAttribute?.('data-urn') || element.getAttribute?.('data-id') || '';
    return urn.startsWith('urn:li:activity');
  },

  /**
   * Stop observing
   */
  stopObserving() {
    if (this.feedObserver) {
      this.feedObserver.disconnect();
      this.feedObserver = null;
    }
  },

  /**
   * Reset state (for page navigation)
   */
  reset() {
    this.stopObserving();
    this.processedPosts = new WeakSet();
    this.adapter = null;
    this.initialized = false;
  }
};

// Expose to window for browser context
if (typeof window !== 'undefined') {
  window.LinkedInHandler = LinkedInHandler;
}
