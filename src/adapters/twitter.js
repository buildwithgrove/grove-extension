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
    // data-testid="userActions" is the "More" button - we want its parent container
    const userActionsButton = document.querySelector('[data-testid="userActions"]');
    if (userActionsButton && userActionsButton.parentElement) {
      console.log('[TwitterAdapter] Found userActions button, returning parent container');
      return userActionsButton.parentElement;
    }

    // On your own profile, look for the area with "Edit profile" button
    const editProfileButton = document.querySelector('[data-testid="editProfileButton"]');
    if (editProfileButton && editProfileButton.parentElement) {
      console.log('[TwitterAdapter] Found editProfileButton, returning parent container');
      return editProfileButton.parentElement;
    }

    // Another fallback: look for Following/Follow button and get its parent
    const followButton = document.querySelector('[data-testid*="follow"]');
    if (followButton && followButton.parentElement) {
      console.log('[TwitterAdapter] Found follow button, returning parent container');
      return followButton.parentElement;
    }

    console.log('[TwitterAdapter] No suitable container found');
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
