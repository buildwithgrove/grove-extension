/**
 * SoundCloud Adapter
 * Handles SoundCloud profile pages
 *
 * Requires: src/adapters/base.js (BaseAdapter)
 */

console.log('[Grove Extension] Loading soundcloud.js... window.BaseAdapter =', typeof window.BaseAdapter);

// Assign directly to window to ensure global availability
window.SoundCloudAdapter = class SoundCloudAdapter extends window.BaseAdapter {
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

    let bio = descriptionElement ? descriptionElement.textContent : '';

    // SoundCloud sometimes concatenates text without spaces (e.g., "foo.ethbar.eth")
    // Add spaces before potential ENS names to help the parser
    bio = bio.replace(/\.eth([a-zA-Z0-9])/g, '.eth $1');

    const displayName = this.extractDisplayName() || '';

    // Combine display name and bio for address detection
    const result = [displayName, bio].filter(Boolean).join(' ');

    console.log('[Grove Extension] SoundCloud extractBio result:', result);

    return result || null;
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

    // Also wait for description/stats section (loads via AJAX)
    // This is where the bio with addresses would be
    await this.waitForElement('.infoStats__description', 5000);

    return nameElement !== null && buttons !== null;
  }
};

console.log('[Grove Extension] soundcloud.js loaded. window.SoundCloudAdapter =', typeof window.SoundCloudAdapter);
