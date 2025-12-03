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
   * Extract display name from Twitter profile
   * @returns {string|null}
   */
  extractDisplayName() {
    // Twitter display name is in a span with data-testid="UserName"
    // The actual name is in the first nested span
    const userNameContainer = document.querySelector('[data-testid="UserName"]');
    if (userNameContainer) {
      // Get the first span which contains the display name
      const nameSpan = userNameContainer.querySelector('span span');
      return nameSpan ? nameSpan.textContent : null;
    }
    return null;
  }

  /**
   * Extract bio from Twitter profile
   * @returns {string|null}
   */
  extractBio() {
    // Twitter profile bio is in a div with data-testid="UserDescription"
    const bioElement = document.querySelector('[data-testid="UserDescription"]');
    const bio = bioElement ? bioElement.textContent : '';

    // Also include display name (users often put .eth there)
    const displayName = this.extractDisplayName() || '';

    // Combine display name and bio for address detection
    return [displayName, bio].filter(Boolean).join(' ') || null;
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
      return userActionsButton.parentElement;
    }

    // On your own profile, look for the area with "Edit profile" button
    const editProfileButton = document.querySelector('[data-testid="editProfileButton"]');
    if (editProfileButton && editProfileButton.parentElement) {
      return editProfileButton.parentElement;
    }

    // Another fallback: look for Following/Follow button and get its parent
    const followButton = document.querySelector('[data-testid*="follow"]');
    if (followButton && followButton.parentElement) {
      return followButton.parentElement;
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
    // Wait for username to appear (indicates profile is loaded)
    // Use UserName instead of UserDescription since not all profiles have bios
    const userNameElement = await this.waitForElement('[data-testid="UserName"]', 8000);
    return userNameElement !== null;
  }
}

if (typeof window !== 'undefined') {
  window.TwitterAdapter = TwitterAdapter;
}
