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
    // Wait for user actions to appear (indicates profile is loaded)
    const actionsElement = await this.waitForElement('[data-testid="userActions"]', 8000);
    return actionsElement !== null;
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.TwitterAdapter = TwitterAdapter;
}
