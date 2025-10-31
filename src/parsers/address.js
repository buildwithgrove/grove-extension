/**
 * Address Parser
 * Extracts cryptocurrency addresses from text content
 */

class AddressParser {
  /**
   * Parse text for cryptocurrency addresses
   * @param {string} text - Text to parse
   * @returns {Array<{token: string, network: string, address: string}>} - Array of found addresses
   */
  static parse(text) {
    if (!text) return [];

    const addresses = [];

    // TODO: Support multiple token/network pairs beyond USDC(base)
    // Pattern: TOKEN(network): 0xADDRESS
    const pattern = /(\w+)\((\w+)\):\s*(0x[a-fA-F0-9]{40})/g;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [, token, network, address] = match;

      // Validate Ethereum address format (0x followed by 40 hex chars)
      if (this.isValidEthereumAddress(address)) {
        addresses.push({
          token: token.toUpperCase(),
          network: network.toLowerCase(),
          address: address
        });
      }
    }

    return addresses;
  }

  /**
   * Validate Ethereum address format
   * @param {string} address - Address to validate
   * @returns {boolean} - True if valid format
   */
  static isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Check if text contains any parseable addresses
   * @param {string} text - Text to check
   * @returns {boolean} - True if addresses found
   */
  static hasAddresses(text) {
    return this.parse(text).length > 0;
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.AddressParser = AddressParser;
}
