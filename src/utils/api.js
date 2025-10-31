/**
 * API Utility
 * Handles communication with Grove backend
 */

class GroveAPI {
  /**
   * Send a tip to the specified address
   * @param {Object} tipData - Tip information
   * @param {string} tipData.address - Recipient address
   * @param {string} tipData.token - Token type (e.g., "USDC")
   * @param {string} tipData.network - Network (e.g., "base")
   * @param {string} tipData.platform - Social platform (e.g., "twitter")
   * @param {string} tipData.userIdentifier - Username/handle
   * @returns {Promise<Object>} - API response
   */
  static async sendTip(tipData) {
    // TODO: Implement actual API call to Grove backend
    // For now, this is a placeholder that logs the data

    console.log('[Grove Extension] Tip button clicked!');
    console.log('[Grove Extension] Tip data:', {
      recipient: tipData.userIdentifier,
      platform: tipData.platform,
      token: tipData.token,
      network: tipData.network,
      address: tipData.address
    });

    // TODO_IN_THIS_PR: Replace with actual API endpoint
    // Example implementation:
    // const response = await fetch('https://api.grove.com/v1/tip', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(tipData)
    // });
    // return await response.json();

    // Placeholder response
    return {
      success: true,
      message: 'Tip placeholder executed (no actual transaction)',
      data: tipData
    };
  }

  /**
   * Validate tip data before sending
   * @param {Object} tipData - Tip information to validate
   * @returns {boolean} - True if valid
   */
  static validateTipData(tipData) {
    return !!(
      tipData &&
      tipData.address &&
      tipData.token &&
      tipData.network &&
      tipData.platform &&
      tipData.userIdentifier
    );
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.GroveAPI = GroveAPI;
}
