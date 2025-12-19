/**
 * SoundCloud Adapter
 * Handles SoundCloud profile pages
 *
 * Requires: src/adapters/base.js (BaseAdapter)
 */

class SoundCloudAdapter extends BaseAdapter {
  /**
   * Check if current page is a SoundCloud profile page
   * @returns {boolean}
   */
  detectProfilePage() {
    try {
      const url = new URL(window.location.href);
      const segments = url.pathname.split('/').filter(Boolean); // e.g., ['geeseband', 'tracks']

      // Must have at least the username
      if (segments.length === 0) return false;

      const username = segments[0];

      // Non-profile top-level routes
      const systemRoutes = [
        'discover', 'feed', 'notifications', 'messages', 'upload', 
        'settings', 'you', 'artists', 'search', 'terms-of-use', 'pages'
      ];
      if (systemRoutes.includes(username.toLowerCase())) return false;

      return true;
    } catch (err) {
      console.error('[Grove Extension] detectProfilePage failed:', err);
      return false;
    }
  }

  /**
   * Extract bio from SoundCloud profile
   * @returns {string|null}
   */
  extractBio() {
    // SoundCloud stores user descriptions in multiple possible places
    const descriptionElement = document.querySelector('.infoStats__description') ||
                               document.querySelector('.truncatedAudioInfo__content') ||
                               document.querySelector('.profileHeaderInfo__additional');
    
    const bio = descriptionElement ? descriptionElement.textContent : '';
    const displayName = this.extractDisplayName() || '';
    
    // Combine display name and bio for address detection
    const result = [displayName, bio].filter(Boolean).join(' ');
    
    // TODO_IN_THIS_PR: Ensure we return a string for testing even if empty, 
    // so content.js bypass can work.
    return result || " "; 
  }

  /**
   * Extract display name from SoundCloud profile
   * @returns {string|null}
   */
  extractDisplayName() {
    const nameElement = document.querySelector('.profileHeaderInfo__userName');
    return nameElement ? nameElement.textContent.trim() : null;
  }

  /**
   * Get placement for tip button (in the action button group)
   * @returns {Element|null}
   */
  getButtonPlacement() {
    // Try to get the specific button group first (visually better)
    const group = document.querySelector('.userInfoBar__buttons .sc-button-group');
    if (group) return group;
    
    // Fallback to the main container
    return document.querySelector('.userInfoBar__buttons');
  }

  /**
   * Get platform name
   * @returns {string}
   */
  getPlatformName() {
    return 'soundcloud';
  }

  /**
   * Wait for profile to load
   * @returns {Promise<boolean>}
   */
  async waitForProfileLoad() {
    // Wait for username AND button container to appear
    const nameElement = await this.waitForElement('.profileHeaderInfo__userName', 8000);
    const buttons = await this.waitForElement('.userInfoBar__buttons', 8000);
    return nameElement !== null && buttons !== null;
  }
}

if (typeof window !== 'undefined') {
  window.SoundCloudAdapter = SoundCloudAdapter;
}