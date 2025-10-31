/**
 * Address Parser
 * Simple detection to determine if bio contains a tippable address
 * Note: Only used for showing button - backend handles actual extraction
 */

class AddressParser {
  /**
   * Check if text contains any parseable addresses
   * Pattern: TOKEN(network): 0xADDRESS
   * @param {string} text - Text to check
   * @returns {boolean} - True if addresses found
   */
  static hasAddresses(text) {
    if (!text) return false;

    // Pattern: TOKEN(network): 0xADDRESS
    // Example: USDC(base): 0x9ab39B84aC4DE6D705C5f051c07db8fE72890953
    const pattern = /\w+\(\w+\):\s*0x[a-fA-F0-9]{40}/;

    return pattern.test(text);
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.AddressParser = AddressParser;
}
