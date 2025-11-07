/**
 * API Utility
 * Handles communication with Grove backend
 */

class GroveAPI {
  // API Configuration
  static PROD_URL = 'https://api.grove.city';
  static LOCAL_URL = 'http://localhost:3000';
  static DEFAULT_TIP_AMOUNT = 0.05; // $0.05 default

  // TODO: Store this in chrome.storage.local later
  static GROVE_API_JWT = ''; // Placeholder for now

  /**
   * Get the base URL based on environment setting
   * @returns {Promise<string>} - Base URL
   */
  static async getBaseURL() {
    try {
      const result = await chrome.storage.local.get(['groveEnvironment']);
      const env = result.groveEnvironment || 'prod';
      return env === 'local' ? this.LOCAL_URL : this.PROD_URL;
    } catch (error) {
      console.log('[Grove Extension] Could not get environment, using prod');
      return this.PROD_URL;
    }
  }

  /**
   * Build tip domain from current page URL
   * Simplifies the URL to a clean domain/path format
   * @param {string} url - Full URL (e.g., "https://twitter.com/olshansky")
   * @returns {string} - Formatted tip domain (e.g., "twitter.com/olshansky")
   */
  static buildTipDomainFromURL(url) {
    try {
      const urlObj = new URL(url);
      // Remove protocol and www, keep hostname and pathname
      const domain = urlObj.hostname.replace(/^www\./, '');
      const path = urlObj.pathname.replace(/\/$/, ''); // Remove trailing slash
      return `${domain}${path}`;
    } catch (error) {
      console.error('[Grove Extension] Invalid URL:', url);
      return url;
    }
  }

  /**
   * Send a tip to the current page URL
   * @param {string} pageUrl - Full page URL (e.g., "https://twitter.com/olshansky")
   * @param {number} tipAmount - Tip amount in dollars (default: 0.05)
   * @param {string} groveApiJwt - JWT token for authentication
   * @returns {Promise<Object>} - API response
   */
  static async sendTip(pageUrl, tipAmount = this.DEFAULT_TIP_AMOUNT, groveApiJwt = this.GROVE_API_JWT) {
    // Get base URL based on environment
    const baseURL = await this.getBaseURL();

    console.log('[Grove Extension] Sending tip...');
    console.log('[Grove Extension] Environment:', baseURL);
    console.log('[Grove Extension] Page URL:', pageUrl);
    console.log('[Grove Extension] Tip amount:', `$${tipAmount}`);

    // Build tip domain from URL
    const tipDomain = this.buildTipDomainFromURL(pageUrl);
    console.log('[Grove Extension] Tip domain:', tipDomain);

    // Build API URL: {baseURL}/v1/tip/{url}/{amount}
    const apiUrl = `${baseURL}/v1/tip/${encodeURIComponent(tipDomain)}/${tipAmount}`;

    console.log('[Grove Extension] API URL:', apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groveApiJwt}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `API request failed with status ${response.status}`);
      }

      console.log('[Grove Extension] Tip successful:', data);
      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('[Grove Extension] Tip failed:', error);

      // Show user-friendly error
      let errorMessage = error.message;
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Cannot connect to Grove API. Make sure the backend is running.';
      }
      this.showError(`Tip failed: ${errorMessage}`);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Show error message to user
   * TODO: Replace with proper UI notification (toast, modal, etc.)
   * @param {string} message - Error message
   */
  static showError(message) {
    // For now, use browser alert
    // TODO_IN_THIS_PR: Implement better UI feedback (toast notification)
    alert(`Grove Tip Extension Error:\n\n${message}`);
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.GroveAPI = GroveAPI;
}
