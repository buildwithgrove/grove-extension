/**
 * Twitter Adapter
 * Handles Twitter/X profile pages
 */

class TwitterAdapter extends BaseAdapter {
  /**
   * Check if current page is a Twitter profile page
   * @returns {boolean}
   */
  detectProfilePage() {
    const url = window.location.href;
    // Match twitter.com/username or x.com/username (not /status, /search, etc.)
    return /^https:\/\/(twitter|x)\.com\/[^\/]+\/?$/.test(url);
  }

  /**
   * Extract bio from Twitter profile
   * @returns {string|null}
   */
  extractBio() {
    // Twitter profile bio is in a div with data-testid="UserDescription"
    const bioElement = document.querySelector('[data-testid="UserDescription"]');
    return bioElement ? bioElement.textContent : null;
  }

  /**
   * Get placement for tip button (near username in header)
   * @returns {Element|null}
   */
  getButtonPlacement() {
    // Look for the profile header actions area
    // This is typically where Follow/Following button lives
    const actionsContainer = document.querySelector('[data-testid="userActions"]');

    if (actionsContainer) {
      return actionsContainer;
    }

    // Fallback: look for the primary column header area
    const headerArea = document.querySelector('[data-testid="UserName"]');
    if (headerArea) {
      // Find parent container that has the action buttons
      let parent = headerArea;
      for (let i = 0; i < 5; i++) {
        parent = parent.parentElement;
        if (parent && parent.querySelector('[data-testid="userActions"]')) {
          return parent.querySelector('[data-testid="userActions"]');
        }
      }
    }

    return null;
  }

  /**
   * Get Twitter username/handle
   * @returns {string|null}
   */
  getUserIdentifier() {
    // Extract from URL
    const match = window.location.pathname.match(/^\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get platform name
   * @returns {string}
   */
  getPlatformName() {
    return 'twitter';
  }

  /**
   * Wait for profile to fully load
   * @returns {Promise<boolean>}
   */
  async waitForProfileLoad() {
    // Wait for bio element to appear (indicates profile is loaded)
    const bioElement = await this.waitForElement('[data-testid="UserDescription"]', 8000);
    return bioElement !== null;
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.TwitterAdapter = TwitterAdapter;
}
