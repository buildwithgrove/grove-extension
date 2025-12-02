/**
 * Address Parser
 * Simple detection to determine if bio contains a tippable address
 * Note: Only used for showing button - backend handles actual extraction
 */

class AddressParser {
  // ENS name pattern: alphanumeric + hyphens, ending in .eth
  // Matches: vitalik.eth, foo-bar.eth, 123abc.eth
  static ENS_PATTERN = /(?:^|\s|Tip:\s*)([a-zA-Z0-9][-a-zA-Z0-9]*\.eth)(?:\s|$|[,.\-])/i;

  /**
   * Check if text contains any parseable addresses
   * Supported patterns:
   * 1. TOKEN(network): 0xADDRESS (e.g., USDC(base): 0x9ab39B84aC4DE6D705C5f051c07db8fE72890953)
   * 2. Tip: 0xADDRESS (defaults to BASE and USDC)
   * 3. ENS names (e.g., vitalik.eth)
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

    // Pattern 3: ENS names (e.g., vitalik.eth)
    const ensPattern = this.ENS_PATTERN;

    return fullPattern.test(text) || tipPattern.test(text) || ensPattern.test(text);
  }

  /**
   * Extract ENS name from text
   * @param {string} text - Text to search
   * @returns {string|null} - ENS name (lowercase) or null
   */
  static extractENS(text) {
    if (!text) return null;
    const match = text.match(this.ENS_PATTERN);
    return match ? match[1].toLowerCase() : null;
  }
}

if (typeof window !== 'undefined') {
  window.AddressParser = AddressParser;
}
