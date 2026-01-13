/**
 * Substack Adapter
 * Handles Substack post pages
 *
 * Requires: src/adapters/base.js (BaseAdapter)
 */

console.log('[Grove Extension] Loading substack.js... window.BaseAdapter =', typeof window.BaseAdapter);

// TODO: Add tip button on Substack user profiles (https://substack.com/@username)
// Profiles show user bio in hover cards when hovering over author name

// Assign directly to window to ensure global availability
window.SubstackAdapter = class SubstackAdapter extends window.BaseAdapter {
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
   * Currently extracts author name for address detection
   * @returns {string|null}
   */
  extractBio() {
    const displayName = this.extractDisplayName() || '';

    // For now, just return the display name
    // In the future, we can expand this to include bio from hover card
    console.log('[Grove Extension] Substack extractBio result:', displayName);

    return displayName || null;
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

    // Find the restack button - it's a button with no-label class that's not inside edit-button-container
    // The restack button has the circular arrows SVG
    const buttons = leftGroup.querySelectorAll('button.post-ufi-button');
    for (const button of buttons) {
      // Skip if it's inside edit-button-container
      if (button.closest('.edit-button-container')) continue;

      // Check if it has no-label class (restack button doesn't show a count label)
      if (button.classList.contains('no-label')) {
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
};

console.log('[Grove Extension] substack.js loaded. window.SubstackAdapter =', typeof window.SubstackAdapter);
