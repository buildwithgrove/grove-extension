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
   * Get placement for tip button (in the same row as action buttons, as first item)
   * @returns {Element|null}
   */
  getButtonPlacement() {
    // Check if button already exists
    if (document.querySelector('#grove-tip-button')) {
      console.log('[TwitterAdapter] Button already exists');
      return null;
    }

    // Look for the More/ellipsis button (three dots)
    const moreButton = document.querySelector('[data-testid="userActions"]') ||
                      document.querySelector('[aria-label="More"]');

    if (moreButton && moreButton.parentElement) {
      console.log('[TwitterAdapter] Found More button, inserting as first child');

      // Get the parent container that holds all action buttons
      const buttonContainer = moreButton.parentElement;

      // Create a wrapper div for our button
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        display: inline-flex;
        align-items: center;
        margin-right: 8px;
        position: relative;
        top: -1px;
      `;

      // Insert our wrapper as the first child (leftmost position)
      buttonContainer.insertBefore(wrapper, buttonContainer.firstChild);
      return wrapper;
    }

    // Fallback: Look for any action button container
    const followButton = document.querySelector('[data-testid*="follow"]');
    const messageButton = document.querySelector('[data-testid="sendDMButton"]');

    const actionButton = followButton || messageButton;

    if (actionButton && actionButton.parentElement) {
      console.log('[TwitterAdapter] Found action button container');

      const buttonContainer = actionButton.parentElement;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        display: inline-flex;
        align-items: center;
        margin-right: 8px;
        position: relative;
        top: -1px;
      `;

      // Add as first child
      buttonContainer.insertBefore(wrapper, buttonContainer.firstChild);
      return wrapper;
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
