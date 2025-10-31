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
    // This is typically where Follow/Following button lives on other profiles
    let actionsContainer = document.querySelector('[data-testid="userActions"]');

    if (actionsContainer) {
      return actionsContainer;
    }

    // On your own profile, look for the area with "Edit profile" button
    // It's usually in a div near the profile header
    const editProfileButton = document.querySelector('[data-testid*="edit"], [aria-label*="Edit"]');
    if (editProfileButton) {
      // Get the parent container that holds the edit profile button
      actionsContainer = editProfileButton.parentElement;
      if (actionsContainer) {
        return actionsContainer;
      }
    }

    // Another fallback: look for any button container in the header area
    const headerButtons = document.querySelector('div[role="button"]');
    if (headerButtons && headerButtons.parentElement) {
      return headerButtons.parentElement;
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
    // Wait for bio to appear (indicates profile is loaded)
    const bioElement = await this.waitForElement('[data-testid="UserDescription"]', 8000);
    return bioElement !== null;
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.TwitterAdapter = TwitterAdapter;
}
