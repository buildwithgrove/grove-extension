/**
 * Substack Adapter
 * Handles Substack post pages and author hover cards
 *
 * Requires: src/adapters/base.js (BaseAdapter)
 */

// TODO: Add tip button on Substack user profiles (https://substack.com/@username)

// Assign directly to window to ensure global availability
window.SubstackAdapter = class SubstackAdapter extends window.BaseAdapter {
  constructor() {
    super();
    this.hoverCardObserver = null;
    this.processedHoverCards = new WeakSet();
  }

  /**
   * Check if current page is a Substack post page or profile page
   * @returns {boolean}
   */
  detectProfilePage() {
    try {
      const path = window.location.pathname;
      const hostname = window.location.hostname;

      // 1. Post pages
      // Subdomain view: /p/post-title (e.g., /p/an-incentive-to-label)
      // Bare domain reader view: /@username/p-{digits} (e.g., /@timour/p-184358935)
      // Bare domain home post view: /home/post/p-{digits} (e.g., /home/post/p-184358935)
      if (path.includes('/p/') || /\/p-\d+/.test(path)) {
        return true;
      }

      // 2. User Profile pages
      // Bare domain: substack.com/@username
      if (hostname === 'substack.com' && path.startsWith('/@')) {
        // Ensure it's not a specific post (already covered above, but good to be safe)
        return true;
      }

      // Subdomain: username.substack.com
      if (hostname.endsWith('.substack.com')) {
        return true;
      }

      return false;
    } catch (err) {
      console.error('[Grove Substack] detectProfilePage failed:', err);
      return false;
    }
  }

  /**
   * Extract author display name from byline
   * @returns {string|null}
   */
  extractDisplayName() {
    const bylineWrapper = document.querySelector('.byline-wrapper');
    if (bylineWrapper) {
      const authorLink = bylineWrapper.querySelector('a[href*="/@"], a[href*="/profile/"]');
      if (authorLink) {
        // Get aria-label which contains "View {name}'s profile"
        const ariaLabel = authorLink.getAttribute('aria-label');
        if (ariaLabel) {
          // Match various apostrophe characters: straight ('), curly right ('), curly left (')
          const match = ariaLabel.match(/View (.+?)[''']s profile/i);
          if (match) {
            return match[1];
          }
        }
        // Fallback: try to get text content
        const nameElement = authorLink.querySelector('[title]');
        if (nameElement) {
          return nameElement.getAttribute('title');
        }
      }
    }

    // Fallback: look for author meta tag
    const authorMeta = document.querySelector('meta[name="author"]');
    if (authorMeta) {
      return authorMeta.getAttribute('content');
    }

    return null;
  }

  /**
   * Extract bio/description from Substack post author
   * Tries multiple sources: JSON preloads, meta tags, and display name
   * @returns {string|null}
   */
  extractBio() {
    const parts = [];

    // 1. Get display name (might contain ENS)
    const displayName = this.extractDisplayName();
    if (displayName) {
      parts.push(displayName);
    }

    // 2. Try to extract from window._preloads JSON (contains author bio)
    const preloadsBio = this.extractBioFromPreloads();
    if (preloadsBio) {
      parts.push(preloadsBio);
    }

    // 3. Try meta description tag
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const content = metaDesc.getAttribute('content');
      if (content) {
        parts.push(content);
      }
    }

    const result = parts.join(' ');
    console.log('[Grove Substack] extractBio result:', result);

    return result || null;
  }

  /**
   * Extract author bio from Substack's _preloads JSON
   * @returns {string|null}
   */
  extractBioFromPreloads() {
    try {
      // Look for script tags containing _preloads
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || '';
        if (content.includes('_preloads') || content.includes('author_bio') || content.includes('"bio"')) {
          // Try to extract bio from JSON - check both "bio" and "author_bio" keys
          const authorBioMatch = content.match(/[\\]?"author_bio[\\]?"\s*:\s*[\\]?"([^"\\]*(?:\\.[^"\\]*)*)[\\]?"/);
          if (authorBioMatch) {
            return this.decodeBioString(authorBioMatch[1]);
          }
          // Fallback to "bio" key
          const bioMatch = content.match(/[\\]?"bio[\\]?"\s*:\s*[\\]?"([^"\\]*(?:\\.[^"\\]*)*)[\\]?"/);
          if (bioMatch) {
            return this.decodeBioString(bioMatch[1]);
          }
        }
      }

      // Also check if _preloads is already parsed
      if (typeof window._preloads !== 'undefined') {
        const preloads = window._preloads;
        if (preloads?.author_bio) return preloads.author_bio;
        if (preloads?.post?.author_bio) return preloads.post.author_bio;
        if (preloads?.post?.author?.bio) return preloads.post.author.bio;
        if (preloads?.publication?.author?.bio) return preloads.publication.author.bio;
        
        // Profile pages (bare domain)
        if (preloads?.profile?.bio) return preloads.profile.bio;
        
        // Profile pages (subdomain) - 'pub' key often used instead of 'publication'
        if (preloads?.pub?.author?.bio) return preloads.pub.author.bio;
        if (preloads?.pub?.author_bio) return preloads.pub.author_bio;
      }
    } catch (err) {
      console.log('[Grove Substack] Error extracting bio from preloads:', err);
    }
    return null;
  }

  /**
   * Decode escaped characters in bio string from JSON
   * @param {string} bio - Raw bio string with escape sequences
   * @returns {string}
   */
  decodeBioString(bio) {
    return bio
      .replace(/\\"/g, '"')
      .replace(/\\n/g, ' ')
      .replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
        return String.fromCharCode(parseInt(match.replace('\\u', ''), 16));
      });
  }

  /**
   * Get the author's profile URL
   * @returns {string|null}
   */
  getAuthorProfileUrl() {
    const bylineWrapper = document.querySelector('.byline-wrapper');
    if (bylineWrapper) {
      const authorLink = bylineWrapper.querySelector('a[href*="/@"], a[href*="/profile/"]');
      if (authorLink) {
        return authorLink.getAttribute('href');
      }
    }
    return null;
  }

  /**
   * Get the current post URL
   * @returns {string}
   */
  getPostUrl() {
    return window.location.href;
  }

  /**
   * Find the restack button in the first action bar on the page
   * @returns {Element|null}
   */
  getRestackButton() {
    const actionBars = this.getAllActionBars();
    if (actionBars.length === 0) return null;
    return this.getRestackButtonInActionBar(actionBars[0]);
  }

  /**
   * Get placement for tip button
   * @returns {Element|null}
   */
  getButtonPlacement() {
    const isPostPage = window.location.pathname.includes('/p/') || /\/p-\d+/.test(window.location.pathname);

    if (isPostPage) {
      const actionBars = this.getAllActionBars();
      if (actionBars.length > 0) {
        return this.getButtonPlacementInActionBar(actionBars[0]);
      }
      return this.getProfileButtonPlacement();
    } else {
      // On profile/home pages, prioritize the profile/subscribe button
      const profilePlacement = this.getProfileButtonPlacement();
      if (profilePlacement) return profilePlacement;

      const actionBars = this.getAllActionBars();
      if (actionBars.length > 0) {
        return this.getButtonPlacementInActionBar(actionBars[0]);
      }
    }

    return null;
  }

  /**
   * Get button placement for profile pages
   * @returns {Element|null}
   */
  getProfileButtonPlacement() {
    // 1. Navbar About link (subdomain profile)
    // Usually at the top of subdomain publications
    const aboutLink = document.querySelector('.overflow-items a[href$="/about"]');
    if (aboutLink && aboutLink.closest('.overflow-items')) {
      const container = aboutLink.closest('.overflow-items');
      const menuItem = aboutLink.closest('.menu-item');
      // Try to find existing Grove navbar item
      let wrapper = container.querySelector('.grove-navbar-item');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'grove-navbar-item';
        // Insert immediately after "About" menu item
        container.insertBefore(wrapper, menuItem.nextSibling);
      }
      return wrapper;
    }

    // 2. Subdomain profile (.subscribe-widget)
    const subscribeWidget = document.querySelector('.subscribe-widget .button-wrapper');
    if (subscribeWidget) return subscribeWidget;

    const subscribeWidgetParent = document.querySelector('.subscribe-widget');
    if (subscribeWidgetParent) return subscribeWidgetParent;

    // 3. Bare domain profile (Look for Subscribe/Subscribed button)
    // Often in a flex container with "Message" or "More" buttons
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const button of buttons) {
      const text = (button.textContent || '').trim().toLowerCase();
      if (text === 'subscribe' || text === 'subscribed') {
        // Return the parent container to append next to it
        return button.parentElement;
      }
    }

    return null;
  }

  /**
   * Get ALL action bars on the page (top and bottom)
   * Supports both subdomain view (.post-ufi) and bare domain reader view
   * @returns {Element[]}
   */
  getAllActionBars() {
    // Subdomain view: .post-ufi containers
    const postUfis = document.querySelectorAll('.post-ufi');
    if (postUfis.length > 0) {
      return Array.from(postUfis);
    }

    // Bare domain reader view: find action bars by locating Restack buttons
    const restackButtons = document.querySelectorAll('button[aria-label="Restack"]');
    return Array.from(restackButtons).map(btn => btn.parentElement).filter(Boolean);
  }

  /**
   * Find the restack button within a specific action bar
   * @param {Element} actionBar - The action bar element
   * @returns {Element|null}
   */
  getRestackButtonInActionBar(actionBar) {
    if (!actionBar) return null;

    // Reader view: button with aria-label="Restack" directly in the action bar
    const restackByLabel = actionBar.querySelector('button[aria-label="Restack"]');
    if (restackByLabel) return restackByLabel;

    // Subdomain view: find by elimination within .post-ufi
    const leftGroup = actionBar.querySelector('div.pencraft');
    if (!leftGroup) return null;

    const buttons = leftGroup.querySelectorAll('button.post-ufi-button');
    for (const button of buttons) {
      // Skip buttons in special containers
      if (button.closest('.edit-button-container')) continue;
      if (button.closest('.like-button-container')) continue;

      const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();

      // Skip Like and Comment buttons
      if (ariaLabel.includes('like')) continue;
      if (ariaLabel.includes('comment')) continue;

      // Restack button has an SVG icon
      if (button.querySelector('svg')) {
        return button;
      }
    }

    return null;
  }

  /**
   * Get the left button group within a specific action bar
   * @param {Element} actionBar - The action bar element
   * @returns {Element|null}
   */
  getButtonPlacementInActionBar(actionBar) {
    if (!actionBar) return null;
    // Subdomain view: inner div.pencraft contains the button group
    // Reader view: the action bar itself IS the button group (parent of Restack button)
    return actionBar.querySelector('div.pencraft') || actionBar;
  }

  /**
   * Get platform name
   * @returns {string}
   */
  getPlatformName() {
    return 'substack';
  }

  /**
   * Wait for page to load content
   * @returns {Promise<boolean>}
   */
  async waitForProfileLoad() {
    // 0. Quick check for Navbar (Subdomain profile) or Sidebar (Bare domain profile) - Fastest path
    const navbar = document.querySelector('.overflow-items');
    const sidebar = document.querySelector('.reader-nav-root');
    if (navbar || sidebar) {
      return true;
    }

    // 1. Check for Post page elements
    const actionBar = await this.waitForEither(
      '.post-ufi',
      'button[aria-label="Restack"]',
      2000 // Short timeout for post detection
    );
    
    if (actionBar) {
      // It's a post page, wait for byline
      await this.waitForElement('.byline-wrapper', 5000);
      return true;
    }

    // 2. Check for Profile page elements
    const profileElement = await this.waitForEither(
      '.subscribe-widget', // Subdomain profile
      '.reader-nav-page',  // Bare domain profile container
      5000
    );

    if (profileElement) {
      return true;
    }

    // If we're here, we might be on a profile page that didn't match selectors,
    // or detection failed. If detectProfilePage() is true, we should probably proceed.
    if (this.detectProfilePage()) {
        return true;
    }

    return false;
  }

  /**
   * Wait for either of two selectors to appear
   * @param {string} selector1
   * @param {string} selector2
   * @param {number} timeout
   * @returns {Promise<Element|null>}
   */
  waitForEither(selector1, selector2, timeout = 5000) {
    return new Promise((resolve) => {
      const existing = document.querySelector(selector1) || document.querySelector(selector2);
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector1) || document.querySelector(selector2);
        if (el) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(el);
        }
      });

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);

      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  /**
   * Start observing for hover card popups
   * @param {Function} onHoverCardFound - Callback when a tippable hover card is found
   */
  startHoverCardObserver(onHoverCardFound) {
    if (this.hoverCardObserver) {
      return; // Already observing
    }

    console.log('[Grove Substack] Starting hover card observer');

    this.hoverCardObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.checkForHoverCard(node, onHoverCardFound);
          }
        }
      }
    });

    this.hoverCardObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Check if a DOM node contains a Substack hover card
   * @param {Element} node - DOM node to check
   * @param {Function} onHoverCardFound - Callback when found
   */
  checkForHoverCard(node, onHoverCardFound) {
    this.logPotentialHoverCard(node);

    const hoverCard = this.findHoverCardElement(node);
    if (!hoverCard) return;

    if (!this.isValidAuthorHoverCard(hoverCard)) return;

    // Check if we've already processed this hover card
    if (this.processedHoverCards.has(hoverCard)) return;
    this.processedHoverCards.add(hoverCard);

    console.log('[Grove Substack] Found hover card with content:', (hoverCard.textContent || '').substring(0, 150));

    const bioData = this.extractBioFromHoverCard(hoverCard);
    if (bioData) {
      onHoverCardFound(hoverCard, bioData);
    }
  }

  /**
   * Log potential hover card detection for debugging
   * @param {Element} node - DOM node to check
   */
  logPotentialHoverCard(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const classes = node.className || '';
    const role = node.getAttribute?.('role') || '';

    const isPopupLike = classes.includes('popup') || classes.includes('modal') ||
        classes.includes('tooltip') || classes.includes('hover') ||
        classes.includes('popover') || role === 'dialog' || role === 'tooltip' ||
        node.getAttribute?.('data-state') === 'open';

    if (isPopupLike) {
      console.log('[Grove Substack] Potential hover card:', {
        tag: node.tagName,
        classes: classes.substring(0, 100),
        role: role,
        dataState: node.getAttribute?.('data-state')
      });
    }
  }

  /**
   * Try to find a hover card element from a DOM node using multiple detection methods
   * @param {Element} node - DOM node to check
   * @returns {Element|null}
   */
  findHoverCardElement(node) {
    // Method 1: data-state="open" (common for Radix UI popups)
    let hoverCard = this.findBySelector(node, '[data-state="open"]');
    if (hoverCard) return hoverCard;

    // Method 2: role="dialog" or role="tooltip"
    hoverCard = this.findBySelector(node, '[role="dialog"], [role="tooltip"]');
    if (hoverCard) return hoverCard;

    // Method 3: Look for popup/popover classes
    const popupSelectors = '.popup, .popover, .tooltip, [class*="hover-card"], [class*="HoverCard"], [class*="profile-popup"]';
    hoverCard = this.findBySelector(node, popupSelectors);
    if (hoverCard) return hoverCard;

    // Method 4: Check if node contains author profile link and bio-like content
    if (node.querySelector?.('a[href*="/@"]')) {
      const text = node.textContent || '';
      if (text.length > 50 && (text.includes('@') || text.includes('.eth'))) {
        return node;
      }
    }

    return null;
  }

  /**
   * Helper to find element by selector - checks if node matches or contains matching element
   * @param {Element} node - DOM node to check
   * @param {string} selector - CSS selector
   * @returns {Element|null}
   */
  findBySelector(node, selector) {
    if (node.matches?.(selector)) {
      return node;
    }
    if (node.querySelector?.(selector)) {
      return node.querySelector(selector);
    }
    return null;
  }

  /**
   * Check if hover card contains author handle (@ pattern)
   * @param {Element} hoverCard - The hover card element
   * @returns {boolean}
   */
  isValidAuthorHoverCard(hoverCard) {
    const text = hoverCard.textContent || '';
    const hasHandle = text.includes('@') || hoverCard.querySelector('a[href*="/@"]');

    if (!hasHandle) {
      console.log('[Grove Substack] Hover card has no handle, skipping');
      return false;
    }
    return true;
  }

  /**
   * Extract author bio data from a hover card element
   * @param {Element} hoverCard - The hover card element
   * @returns {{name: string, handle: string, bio: string, profileUrl: string}|null}
   */
  extractBioFromHoverCard(hoverCard) {
    try {
      const allText = hoverCard.textContent || '';

      // Try to find the profile link
      const profileLink = hoverCard.querySelector('a[href*="/@"]');
      const profileUrl = profileLink ? profileLink.getAttribute('href') : null;

      // Extract handle (starts with @)
      const handleMatch = allText.match(/@([a-zA-Z0-9_]+)/);
      const handle = handleMatch ? handleMatch[1] : null;

      // Find bio text - look for text that might contain addresses
      const bioText = this.findBioTextInHoverCard(hoverCard, allText);

      console.log('[Grove Substack] Extracted hover card bio:', bioText.substring(0, 100));

      return {
        name: null,
        handle: handle,
        bio: bioText,
        profileUrl: profileUrl
      };
    } catch (err) {
      console.error('[Grove Substack] Error extracting hover card bio:', err);
      return null;
    }
  }

  /**
   * Find the bio text within a hover card
   * @param {Element} hoverCard - The hover card element
   * @param {string} fallbackText - Fallback text if no specific bio found
   * @returns {string}
   */
  findBioTextInHoverCard(hoverCard, fallbackText) {
    const paragraphs = hoverCard.querySelectorAll('p, div, span');

    for (const p of paragraphs) {
      const text = p.textContent?.trim() || '';
      // Look for longer text or text containing addresses
      if (text.length > 50 || text.includes('.eth') || text.includes('0x')) {
        return text;
      }
    }

    return fallbackText;
  }

  /**
   * Find a good place to inject tip button in hover card
   * @param {Element} hoverCard - The hover card element
   * @returns {Element|null}
   */
  getHoverCardButtonPlacement(hoverCard) {
    // Look for a button container
    const buttonContainer = hoverCard.querySelector('button')?.parentElement;
    if (buttonContainer) {
      return buttonContainer;
    }

    // Fallback: use the hover card itself
    return hoverCard;
  }

  /**
   * Stop observing hover cards
   */
  stopHoverCardObserver() {
    if (this.hoverCardObserver) {
      this.hoverCardObserver.disconnect();
      this.hoverCardObserver = null;
    }
  }
};
