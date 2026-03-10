/**
 * Base Adapter
 * Abstract interface for social platform adapters
 */

groveLog.log('Loading base.js...');

// Assign directly to window to ensure global availability
window.BaseAdapter = class BaseAdapter {
  /**
   * Check if current page is a tippable page for this platform (profiles AND posts)
   * @returns {boolean} - True if on a tippable page where we want to show a tip button
   */
  detectTippablePage() {
    throw new Error('detectTippablePage() must be implemented by subclass');
  }

  /**
   * @deprecated Use detectTippablePage() instead
   * TODO_TECHDEBT: Remove this shim once all external callers use detectTippablePage()
   *   Why: Renamed to reflect that posts/tweets are also tippable, not just profiles
   */
  detectProfilePage() {
    return this.detectTippablePage();
  }

  /**
   * Extract bio/description text from profile
   * @returns {string|null} - Bio text or null if not found
   */
  extractBio() {
    throw new Error('extractBio() must be implemented by subclass');
  }

  /**
   * Get the DOM element where the tip button should be placed
   * @returns {Element|null} - Target element or null if not found
   */
  getButtonPlacement() {
    throw new Error('getButtonPlacement() must be implemented by subclass');
  }

  /**
   * Get platform name
   * @returns {string} - Platform name
   */
  getPlatformName() {
    throw new Error('getPlatformName() must be implemented by subclass');
  }

  /**
   * Get platform name for API (defaults to internal platform name)
   * Can be overridden by subclasses if API expects a different name
   * @returns {string} - API Platform name
   */
  getApiPlatformName() {
    return this.getPlatformName();
  }

  /**
   * Extract username from a platform URL
   * @param {string} url - The URL to parse
   * @returns {string|null} - Username or null
   */
  extractUsernameFromUrl(url) {
    return null;
  }

  /**
   * Get the profile URL for a username on this platform
   * @param {string} username - The username
   * @returns {string|null} - Profile URL or null
   */
  getProfileUrl(username) {
    return null;
  }

  /**
   * Wait for an element to appear in the DOM
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Element|null>} - Element when found or null on timeout
   */
  async waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }
};

groveLog.log('base.js loaded. window.BaseAdapter =', typeof window.BaseAdapter);
