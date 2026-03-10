/**
 * Tweet Processor Module
 * Handles tweet detection, processing, and determines which tweets need tip buttons
 * Works with BioFetcher for background bio fetching and TweetTipHandler for button injection
 */

const TweetProcessor = {
  // Observer for watching new tweets
  observer: null,

  // Track which tweets already have buttons to avoid duplicates
  processedTweets: new WeakSet(),

  // Track tweet elements by username for button injection after bio fetch
  // Maps username -> Set of { tweetElement, tweetUrl, dateElement, isQuotedTweet }
  pendingTweetButtons: new Map(),

  // Adapter reference (set via callback)
  adapter: null,

  // Callbacks set by content.js
  callbacks: {
    getAdapter: null,
    getCachedAddress: null,
    setCachedAddress: null,
    hasAddresses: null,
    resolveAddress: null,
    injectTipButton: null,
    queueBioFetch: null
  },

  /**
   * Initialize the tweet processor with callbacks
   * @param {Object} callbacks - Callback functions
   */
  init(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  },

  /**
   * Reset state (useful for cleanup)
   */
  reset() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.processedTweets = new WeakSet();
    this.pendingTweetButtons.clear();
  },

  /**
   * Get the current adapter
   * @returns {Object|null}
   */
  getAdapter() {
    if (this.callbacks.getAdapter) {
      return this.callbacks.getAdapter();
    }
    return this.adapter;
  },

  /**
   * Setup observer for Twitter tweets
   * Watches for new tweets and injects tip buttons for tippable authors
   */
  startObserving() {
    // Clean up existing observer
    if (this.observer) {
      this.observer.disconnect();
    }

    groveLog.log("[TweetProcessor] Setting up tweet observer");

    // Process existing tweets first
    this.processExistingTweets();

    // Watch for new tweets being added to the DOM
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is a tweet or contains tweets
            if (node.matches && node.matches('article[data-testid="tweet"]')) {
              this.processTweet(node);
            } else if (node.querySelectorAll) {
              const tweets = node.querySelectorAll('article[data-testid="tweet"]');
              tweets.forEach((tweet) => this.processTweet(tweet));
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
   * Stop observing for tweets
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  },

  /**
   * Process all existing tweets on the page
   */
  processExistingTweets() {
    const adapter = this.getAdapter();
    if (!adapter || adapter.getPlatformName() !== 'twitter') return;

    const tweets = adapter.findTweets();
    groveLog.log(`[TweetProcessor] Found ${tweets.length} existing tweets`);
    tweets.forEach((tweet) => this.processTweet(tweet));
  },

  /**
   * Check if a user has a tippable address (from cache or display name)
   * @param {string} username - Twitter username
   * @param {string|null} displayName - Display name to check for addresses
   * @returns {boolean}
   */
  checkTippableAddress(username, displayName) {
    // Check cache first
    const cached = this.callbacks.getCachedAddress ? this.callbacks.getCachedAddress(username) : null;

    if (cached === 'no-address') return false;
    if (cached && cached.address) return true;

    // Check display name for addresses
    if (displayName && this.callbacks.hasAddresses && this.callbacks.resolveAddress) {
      const hasAddress = this.callbacks.hasAddresses(displayName);
      if (hasAddress) {
        const addressResult = this.callbacks.resolveAddress(displayName);
        if (addressResult.address) {
          if (this.callbacks.setCachedAddress) {
            this.callbacks.setCachedAddress(username, addressResult);
          }
          groveLog.log(`[TweetProcessor] Tweet: Found address for @${username}: ${addressResult.address}`);
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Process a single tweet and inject tip button only if author has tippable address
   * Also handles quote tweets - shows button for quoted author if they have a tippable address
   * If no address found in display name, queues a background bio fetch
   * @param {Element} tweetElement - The tweet article element
   */
  processTweet(tweetElement) {
    // Skip if already processed
    if (this.processedTweets.has(tweetElement)) return;
    this.processedTweets.add(tweetElement);

    // Skip if button already exists on the main tweet
    if (tweetElement.querySelector('.grove-tweet-tip-button')) return;

    const adapter = this.getAdapter();
    if (!adapter) return;

    // Extract main author info (for RTs this is the original author, for QTs this is the quoter)
    const authorInfo = adapter.extractTweetAuthor(tweetElement);

    // Process main tweet author
    if (authorInfo.username) {
      const hasTippableAddress = this.checkTippableAddress(authorInfo.username, authorInfo.displayName);

      if (hasTippableAddress) {
        const tweetUrl = adapter.getTweetUrl(tweetElement);
        const dateElement = adapter.getTweetDateElement(tweetElement);

        if (tweetUrl && dateElement && this.callbacks.injectTipButton) {
          this.callbacks.injectTipButton(tweetElement, dateElement, tweetUrl, false);
        }
      } else {
        // No address found in display name - queue background bio fetch
        const cached = this.callbacks.getCachedAddress ? this.callbacks.getCachedAddress(authorInfo.username) : null;
        if (cached === null) {
          // Not cached yet - queue for bio fetch
          const tweetUrl = adapter.getTweetUrl(tweetElement);
          const dateElement = adapter.getTweetDateElement(tweetElement);
          if (tweetUrl && dateElement) {
            groveLog.log(`[TweetProcessor] Queueing bio fetch for @${authorInfo.username}`);
            this.queueBioFetch(authorInfo.username, tweetElement, tweetUrl, dateElement, false);
          } else {
            groveLog.log(`[TweetProcessor] Cannot queue @${authorInfo.username}: missing tweetUrl=${!!tweetUrl} dateElement=${!!dateElement}`);
          }
        } else {
          groveLog.log(`[TweetProcessor] Skipping @${authorInfo.username}: cached=${cached}`);
        }
      }
    }

    // For quote tweets, also check the quoted tweet's author
    if (adapter.hasQuotedTweet && adapter.hasQuotedTweet(tweetElement)) {
      this.processQuotedTweet(tweetElement, adapter);
    }
  },

  /**
   * Process a quoted tweet within a parent tweet
   * @param {Element} tweetElement - The parent tweet element
   * @param {Object} adapter - The Twitter adapter
   */
  processQuotedTweet(tweetElement, adapter) {
    const quotedAuthor = adapter.extractQuotedTweetAuthor(tweetElement);

    if (!quotedAuthor || !quotedAuthor.username) return;

    const quotedHasTippable = this.checkTippableAddress(quotedAuthor.username, quotedAuthor.displayName);

    if (quotedHasTippable) {
      // Find the quoted tweet element to inject button into
      const quotedTweetEl = adapter.getQuotedTweetElement(tweetElement);
      if (quotedTweetEl && !quotedTweetEl.querySelector('.grove-tweet-tip-button')) {
        const { url: quotedTweetUrl, placement } = this.getQuotedTweetInfo(quotedTweetEl, quotedAuthor);

        // If we have a URL and a place to put the button, inject it
        if (quotedTweetUrl && placement && this.callbacks.injectTipButton) {
          this.callbacks.injectTipButton(quotedTweetEl, placement, quotedTweetUrl, true);
        }
      }
    } else {
      // No address found in quoted author's display name - queue background bio fetch
      const cached = this.callbacks.getCachedAddress ? this.callbacks.getCachedAddress(quotedAuthor.username) : null;
      if (cached === null) {
        // Not cached yet - queue for bio fetch
        const quotedTweetEl = adapter.getQuotedTweetElement(tweetElement);
        if (quotedTweetEl) {
          const { url: quotedTweetUrl, placement } = this.getQuotedTweetInfo(quotedTweetEl, quotedAuthor);

          if (quotedTweetUrl && placement) {
            this.queueBioFetch(quotedAuthor.username, tweetElement, quotedTweetUrl, placement, true);
          }
        }
      }
    }
  },

  /**
   * Get URL and placement info for a quoted tweet
   * @param {Element} quotedTweetEl - The quoted tweet element
   * @param {Object} quotedAuthor - The quoted author info
   * @returns {{url: string|null, placement: Element|null}}
   */
  getQuotedTweetInfo(quotedTweetEl, quotedAuthor) {
    // Build URL for the quoted tweet
    let url = null;

    // Method 1: Look for status link in quoted area
    const quotedStatusLink = quotedTweetEl.querySelector('a[href*="/status/"]');
    if (quotedStatusLink) {
      const href = quotedStatusLink.getAttribute('href');
      url = href.startsWith('/') ? `https://x.com${href}` : href;
    }

    // Method 2: If no status link, use the author's profile URL
    // (tipping to profile is valid when we can't get the specific tweet)
    if (!url && quotedAuthor.profileUrl) {
      url = quotedAuthor.profileUrl;
    }

    // Find placement - try multiple options
    let placement = null;

    // 1. Time element's parent (next to timestamp like "1h")
    const quotedTimeLink = quotedTweetEl.querySelector('time');
    if (quotedTimeLink?.parentElement) {
      placement = quotedTimeLink.parentElement;
    }

    // 2. User-Name container
    if (!placement) {
      const quotedNameContainer = quotedTweetEl.querySelector('[data-testid="User-Name"]');
      if (quotedNameContainer) {
        placement = quotedNameContainer;
      }
    }

    // 3. Fallback: find the row containing author info
    if (!placement) {
      const usernameLink = quotedTweetEl.querySelector('a[href^="/"][role="link"]');
      if (usernameLink) {
        let container = usernameLink.parentElement;
        while (container && container !== quotedTweetEl) {
          if (container.parentElement === quotedTweetEl ||
              container.parentElement?.parentElement === quotedTweetEl) {
            placement = container;
            break;
          }
          container = container.parentElement;
        }
      }
    }

    return { url, placement };
  },

  /**
   * Queue a username for background bio fetch
   * @param {string} username - Twitter username
   * @param {Element} tweetElement - The tweet element to inject button into
   * @param {string} tweetUrl - The tweet URL
   * @param {Element} dateElement - The date element for button placement
   * @param {boolean} isQuotedTweet - Whether this is a quoted tweet
   */
  queueBioFetch(username, tweetElement, tweetUrl, dateElement, isQuotedTweet = false) {
    // Track the tweet element so we can inject button when bio returns
    if (!this.pendingTweetButtons.has(username)) {
      this.pendingTweetButtons.set(username, new Set());
    }
    this.pendingTweetButtons.get(username).add({
      tweetElement,
      tweetUrl,
      dateElement,
      isQuotedTweet
    });

    // Queue fetch using BioFetcher callback
    if (this.callbacks.queueBioFetch) {
      this.callbacks.queueBioFetch(username);
    }
  },

  /**
   * Inject buttons for all pending tweets from a user after bio fetch
   * Called by BioFetcher callback when bio is fetched successfully
   * @param {string} username - Twitter username
   */
  injectPendingButtons(username) {
    const pending = this.pendingTweetButtons.get(username);
    if (!pending) return;

    const adapter = this.getAdapter();

    for (const { tweetElement, tweetUrl, dateElement, isQuotedTweet } of pending) {
      // Check if element is still in DOM and doesn't already have a button
      if (!document.contains(tweetElement)) continue;
      if (tweetElement.querySelector('.grove-tweet-tip-button')) continue;

      if (isQuotedTweet && adapter) {
        // For quoted tweets, find the quoted element
        const quotedTweetEl = adapter.getQuotedTweetElement(tweetElement);
        if (quotedTweetEl && !quotedTweetEl.querySelector('.grove-tweet-tip-button')) {
          if (this.callbacks.injectTipButton) {
            this.callbacks.injectTipButton(quotedTweetEl, dateElement, tweetUrl, true);
          }
        }
      } else {
        if (this.callbacks.injectTipButton) {
          this.callbacks.injectTipButton(tweetElement, dateElement, tweetUrl, false);
        }
      }
    }

    // Clean up pending entries for this username
    this.pendingTweetButtons.delete(username);
  },

  /**
   * Check if there are pending buttons for a username
   * @param {string} username
   * @returns {boolean}
   */
  hasPendingButtons(username) {
    return this.pendingTweetButtons.has(username);
  },

  /**
   * Clear pending buttons for a username (e.g., on fetch error)
   * @param {string} username
   */
  clearPendingButtons(username) {
    this.pendingTweetButtons.delete(username);
  }
};

if (typeof window !== 'undefined') {
  window.TweetProcessor = TweetProcessor;
}
