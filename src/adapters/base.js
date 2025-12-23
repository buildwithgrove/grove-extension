/**
 * Base Adapter
 * Abstract interface for social platform adapters
 */

class BaseAdapter {
  /**
   * Check if current page is a profile page for this platform
   * @returns {boolean} - True if on a profile page
   */
  detectProfilePage() {
    throw new Error('detectProfilePage() must be implemented by subclass');
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
}

if (typeof window !== 'undefined') {
  window.BaseAdapter = BaseAdapter;
}
