/**
 * Address Parser
 * Simple detection to determine if bio contains a tippable address
 * Note: Only used for showing button - backend handles actual extraction
 */

class AddressParser {
  /**
   * Check if text contains any parseable addresses
   * Supported patterns:
   * 1. TOKEN(network): 0xADDRESS (e.g., USDC(base): 0x9ab39B84aC4DE6D705C5f051c07db8fE72890953)
   * 2. Tip: 0xADDRESS (defaults to BASE and USDC)
   * @param {string} text - Text to check
   * @returns {boolean} - True if addresses found
   */
  static hasAddresses(text) {
    if (!text) return false;

    // Pattern 1: TOKEN(network): 0xADDRESS
    // Example: USDC(base): 0x9ab39B84aC4DE6D705C5f051c07db8fE72890953
    const fullPattern = /\w+\(\w+\):\s*0x[a-fA-F0-9]{40}/;

    // Pattern 2: Tip: 0xADDRESS (defaults to BASE and USDC)
    // Example: Tip: 0xaa444C1470ad2618e1ce0d7de8BF9a56C28BBCc2
    const tipPattern = /Tip:\s*0x[a-fA-F0-9]{40}/i;

    return fullPattern.test(text) || tipPattern.test(text);
  }
}

if (typeof window !== 'undefined') {
  window.AddressParser = AddressParser;
}
