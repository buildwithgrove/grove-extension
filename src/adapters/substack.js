/**
 * Substack Adapter
 * Handles Substack post pages and author hover cards
 *
 * Requires: src/adapters/base.js (BaseAdapter)
 */

console.log('[Grove Extension] Loading substack.js... window.BaseAdapter =', typeof window.BaseAdapter);

// TODO: Add tip button on Substack user profiles (https://substack.com/@username)

// Assign directly to window to ensure global availability
window.SubstackAdapter = class SubstackAdapter extends window.BaseAdapter {
  constructor() {
    super();
    this.hoverCardObserver = null;
    this.processedHoverCards = new WeakSet();
  }
  /**
   * Check if current page is a Substack post page
   * @returns {boolean}
   */
  detectProfilePage() {
    try {
      const url = new URL(window.location.href);
      const pathname = url.pathname;

      // Post pages have /p/ in the path (e.g., /p/an-incentive-to-label)
      if (pathname.includes('/p/')) {
        return true;
      }

      return false;
    } catch (err) {
      console.error('[Grove Extension] detectProfilePage failed:', err);
      return false;
    }
  }

  /**
   * Extract author display name from byline
   * @returns {string|null}
   */
  extractDisplayName() {
    // Look for author name in byline area
    // The byline contains an avatar and author name link
    const bylineWrapper = document.querySelector('.byline-wrapper');
    if (bylineWrapper) {
      // Find the author link (contains the name)
      const authorLink = bylineWrapper.querySelector('a[href*="/@"], a[href*="/profile/"]');
      if (authorLink) {
        // Get aria-label which contains "View {name}'s profile"
        const ariaLabel = authorLink.getAttribute('aria-label');
        if (ariaLabel) {
          const match = ariaLabel.match(/View (.+?)(?:'s|'s) profile/i);
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
    console.log('[Grove Extension] Substack extractBio result:', result);

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
          // Handle both escaped quotes (\") and regular quotes (")
          const authorBioMatch = content.match(/[\\]?"author_bio[\\]?"\s*:\s*[\\]?"([^"\\]*(?:\\.[^"\\]*)*)[\\]?"/);
          if (authorBioMatch) {
            // Decode escaped characters (quotes, unicode, etc.)
            let decodedBio = authorBioMatch[1]
              .replace(/\\"/g, '"')
              .replace(/\\n/g, ' ')
              .replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
                return String.fromCharCode(parseInt(match.replace('\\u', ''), 16));
              });
            console.log('[Grove Extension] Found author_bio in preloads:', decodedBio);
            return decodedBio;
          }
          // Fallback to "bio" key
          const bioMatch = content.match(/[\\]?"bio[\\]?"\s*:\s*[\\]?"([^"\\]*(?:\\.[^"\\]*)*)[\\]?"/);
          if (bioMatch) {
            let decodedBio = bioMatch[1]
              .replace(/\\"/g, '"')
              .replace(/\\n/g, ' ');
            console.log('[Grove Extension] Found bio in preloads:', decodedBio);
            return decodedBio;
          }
        }
      }

      // Also check if _preloads is already parsed
      if (typeof window._preloads !== 'undefined') {
        const preloads = window._preloads;
        // Navigate to find bio in various possible locations
        if (preloads?.author_bio) {
          return preloads.author_bio;
        }
        if (preloads?.post?.author_bio) {
          return preloads.post.author_bio;
        }
        if (preloads?.post?.author?.bio) {
          return preloads.post.author.bio;
        }
        if (preloads?.publication?.author?.bio) {
          return preloads.publication.author.bio;
        }
      }
    } catch (err) {
      console.log('[Grove Extension] Error extracting bio from preloads:', err);
    }
    return null;
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
   * Find the restack button in the action bar
   * @returns {Element|null}
   */
  getRestackButton() {
    // Find the post action bar
    const postUfi = document.querySelector('.post-ufi');
    if (!postUfi) return null;

    // Get the left button group (first child div with flex)
    const leftGroup = postUfi.querySelector('div.pencraft');
    if (!leftGroup) return null;

    // Find the restack button - it's the button with circular arrows SVG (not Like or Comment)
    // Like button has aria-label containing "Like"
    // Comment button has aria-label containing "comment"
    // Restack button has no aria-label or aria-label without Like/comment
    const buttons = leftGroup.querySelectorAll('button.post-ufi-button');
    for (const button of buttons) {
      // Skip if it's inside edit-button-container or like-button-container
      if (button.closest('.edit-button-container')) continue;
      if (button.closest('.like-button-container')) continue;

      const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();

      // Skip Like and Comment buttons
      if (ariaLabel.includes('like')) continue;
      if (ariaLabel.includes('comment')) continue;

      // This should be the restack button (has circular arrows SVG)
      // Verify it has an SVG with a path (restack icon)
      const svg = button.querySelector('svg');
      if (svg) {
        console.log('[Grove Extension] Found restack button with aria-label:', ariaLabel || '(none)');
        return button;
      }
    }

    return null;
  }

  /**
   * Get placement for tip button (the left button group in action bar)
   * @returns {Element|null}
   */
  getButtonPlacement() {
    // Find the post action bar
    const postUfi = document.querySelector('.post-ufi');
    if (!postUfi) return null;

    // Get the left button group (first child div with flex display)
    const leftGroup = postUfi.querySelector('div.pencraft');
    return leftGroup || null;
  }

  /**
   * Get ALL action bars on the page (top and bottom)
   * @returns {Element[]}
   */
  getAllActionBars() {
    return Array.from(document.querySelectorAll('.post-ufi'));
  }

  /**
   * Find the restack button within a specific action bar
   * @param {Element} actionBar - The action bar element
   * @returns {Element|null}
   */
  getRestackButtonInActionBar(actionBar) {
    if (!actionBar) return null;

    // Get the left button group (first child div with flex)
    const leftGroup = actionBar.querySelector('div.pencraft');
    if (!leftGroup) return null;

    const buttons = leftGroup.querySelectorAll('button.post-ufi-button');
    for (const button of buttons) {
      if (button.closest('.edit-button-container')) continue;
      if (button.closest('.like-button-container')) continue;

      const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('like')) continue;
      if (ariaLabel.includes('comment')) continue;

      const svg = button.querySelector('svg');
      if (svg) {
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
    return actionBar.querySelector('div.pencraft') || null;
  }

  /**
   * Get platform name
   * @returns {string}
   */
  getPlatformName() {
    return 'substack';
  }

  /**
   * Wait for post to load
   * @returns {Promise<boolean>}
   */
  async waitForProfileLoad() {
    // Wait for the action bar to appear
    const postUfi = await this.waitForElement('.post-ufi', 8000);
    if (!postUfi) return false;

    // Wait for byline to load (contains author info)
    const byline = await this.waitForElement('.byline-wrapper', 5000);

    return postUfi !== null;
  }

  /**
   * Start observing for hover card popups
   * @param {Function} onHoverCardFound - Callback when a tippable hover card is found
   */
  startHoverCardObserver(onHoverCardFound) {
    if (this.hoverCardObserver) {
      return; // Already observing
    }

    console.log('[Grove Extension] Starting Substack hover card observer');

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
    // Debug: log significant additions
    if (node.nodeType === Node.ELEMENT_NODE) {
      const classes = node.className || '';
      const role = node.getAttribute?.('role') || '';

      // Look for popup/dialog/tooltip patterns
      if (classes.includes('popup') || classes.includes('modal') ||
          classes.includes('tooltip') || classes.includes('hover') ||
          classes.includes('popover') || role === 'dialog' || role === 'tooltip' ||
          node.getAttribute?.('data-state') === 'open') {
        console.log('[Grove Extension] Potential hover card detected:', {
          tag: node.tagName,
          classes: classes.substring(0, 100),
          role: role,
          dataState: node.getAttribute?.('data-state')
        });
      }
    }

    // Try multiple selectors to find the hover card
    let hoverCard = null;

    // Method 1: data-state="open" (common for Radix UI popups)
    if (node.matches?.('[data-state="open"]')) {
      hoverCard = node;
    } else if (node.querySelector?.('[data-state="open"]')) {
      hoverCard = node.querySelector('[data-state="open"]');
    }

    // Method 2: role="dialog" or role="tooltip"
    if (!hoverCard) {
      if (node.matches?.('[role="dialog"], [role="tooltip"]')) {
        hoverCard = node;
      } else if (node.querySelector?.('[role="dialog"], [role="tooltip"]')) {
        hoverCard = node.querySelector('[role="dialog"], [role="tooltip"]');
      }
    }

    // Method 3: Look for popup/popover classes
    if (!hoverCard) {
      const popupSelectors = '.popup, .popover, .tooltip, [class*="hover-card"], [class*="HoverCard"], [class*="profile-popup"]';
      if (node.matches?.(popupSelectors)) {
        hoverCard = node;
      } else if (node.querySelector?.(popupSelectors)) {
        hoverCard = node.querySelector(popupSelectors);
      }
    }

    // Method 4: Check if node contains author profile link and bio-like content
    if (!hoverCard && node.querySelector?.('a[href*="/@"]')) {
      const text = node.textContent || '';
      // If it has a profile link and substantial text, might be a hover card
      if (text.length > 50 && (text.includes('@') || text.includes('.eth'))) {
        console.log('[Grove Extension] Node has profile link and bio text, checking as hover card');
        hoverCard = node;
      }
    }

    if (!hoverCard) return;

    // Check if this looks like an author hover card (has handle like @username)
    const text = hoverCard.textContent || '';
    const hasHandle = text.includes('@') || hoverCard.querySelector('a[href*="/@"]');

    if (!hasHandle) {
      console.log('[Grove Extension] Hover card has no handle, skipping');
      return;
    }

    // Check if we've already processed this hover card
    if (this.processedHoverCards.has(hoverCard)) return;
    this.processedHoverCards.add(hoverCard);

    console.log('[Grove Extension] Found Substack hover card with content:', text.substring(0, 150));

    // Extract bio from hover card
    const bioData = this.extractBioFromHoverCard(hoverCard);
    if (bioData) {
      onHoverCardFound(hoverCard, bioData);
    }
  }

  /**
   * Extract author bio data from a hover card element
   * @param {Element} hoverCard - The hover card element
   * @returns {{name: string, handle: string, bio: string, profileUrl: string}|null}
   */
  extractBioFromHoverCard(hoverCard) {
    try {
      // Get all text content from the hover card
      const allText = hoverCard.textContent || '';
      console.log('[Grove Extension] Hover card text:', allText.substring(0, 200));

      // Try to find the profile link
      const profileLink = hoverCard.querySelector('a[href*="/@"]');
      const profileUrl = profileLink ? profileLink.getAttribute('href') : null;

      // Extract handle (starts with @)
      const handleMatch = allText.match(/@([a-zA-Z0-9_]+)/);
      const handle = handleMatch ? handleMatch[1] : null;

      // The bio is typically the longer text block
      // Look for text that might contain addresses
      const paragraphs = hoverCard.querySelectorAll('p, div, span');
      let bioText = '';

      for (const p of paragraphs) {
        const text = p.textContent?.trim() || '';
        // Skip very short text (likely just name or handle)
        if (text.length > 50 || text.includes('.eth') || text.includes('0x')) {
          bioText = text;
          break;
        }
      }

      // If no specific paragraph found, use all text
      if (!bioText) {
        bioText = allText;
      }

      console.log('[Grove Extension] Extracted hover card bio:', bioText.substring(0, 100));

      return {
        name: null, // Will be extracted if needed
        handle: handle,
        bio: bioText,
        profileUrl: profileUrl
      };
    } catch (err) {
      console.error('[Grove Extension] Error extracting hover card bio:', err);
      return null;
    }
  }

  /**
   * Find a good place to inject tip button in hover card
   * @param {Element} hoverCard - The hover card element
   * @returns {Element|null}
   */
  getHoverCardButtonPlacement(hoverCard) {
    // Look for a button container or the bottom of the hover card
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

console.log('[Grove Extension] substack.js loaded. window.SubstackAdapter =', typeof window.SubstackAdapter);
