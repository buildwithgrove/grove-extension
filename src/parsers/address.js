/**
 * Address Parser
 * Simple detection to determine if bio contains a tippable address
 * Note: Only used for showing button - backend handles actual extraction
 */

class AddressParser {
  // ENS name pattern: supports subdomains, ending in .eth
  // Valid characters per ENSIP-15: alphanumeric, $, _, hyphens, unicode letters, emoji
  // Matches: vitalik.eth, $$$$$.base.eth, 🔥.eth, café.eth, jesse.base.eth
  static ENS_PATTERN = (typeof AddressMatchers !== 'undefined' && AddressMatchers.ENS_PATTERN)
    ? AddressMatchers.ENS_PATTERN
    : /(?:[\w$\u00C0-\u024F\u1E00-\u1EFF]|[\u{1F300}-\u{1F9FF}])(?:[\w$\-\u00C0-\u024F\u1E00-\u1EFF]|[\u{1F300}-\u{1F9FF}])*(?:\.(?:[\w$\u00C0-\u024F\u1E00-\u1EFF]|[\u{1F300}-\u{1F9FF}])(?:[\w$\-\u00C0-\u024F\u1E00-\u1EFF]|[\u{1F300}-\u{1F9FF}])*)*\.eth\b/iu;
  static ENS_PATTERN_GLOBAL = (typeof AddressMatchers !== 'undefined' && AddressMatchers.ENS_PATTERN_GLOBAL)
    ? AddressMatchers.ENS_PATTERN_GLOBAL
    : /(?:[\w$\u00C0-\u024F\u1E00-\u1EFF]|[\u{1F300}-\u{1F9FF}])(?:[\w$\-\u00C0-\u024F\u1E00-\u1EFF]|[\u{1F300}-\u{1F9FF}])*(?:\.(?:[\w$\u00C0-\u024F\u1E00-\u1EFF]|[\u{1F300}-\u{1F9FF}])(?:[\w$\-\u00C0-\u024F\u1E00-\u1EFF]|[\u{1F300}-\u{1F9FF}])*)*\.eth\b/giu;

  // Solana address pattern commented out - Base/Base Sepolia only for now
  // Solana address pattern: base58 encoded, 32-44 chars
  // Base58 excludes: 0, O, I, l
  // static SOL_PATTERN = /(?:^|\s|Tip:\s*)([1-9A-HJ-NP-Za-km-z]{32,44})(?:\s|$|[,.\-])/;

  // Generic 0x address pattern: any valid Ethereum address (0x + 40 hex chars)
  static ETH_ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/;

  /**
   * Check if text contains any parseable addresses
   * Supported patterns:
   * 1. Any 0x Ethereum address (0x + 40 hex characters)
   * 2. ENS names (e.g., vitalik.eth)
   * @param {string} text - Text to check
   * @returns {boolean} - True if addresses found
   */
  static hasAddresses(text) {
    if (!text) return false;

    return this.ETH_ADDRESS_PATTERN.test(text) || this.getEnsMatches(text).length > 0;
  }

  /**
   * Extract ENS name from text
   * @param {string} text - Text to search
   * @returns {string|null} - ENS name (lowercase) or null
   */
  static extractENS(text) {
    if (!text) return null;
    const matches = this.getEnsMatches(text);
    return matches.length > 0 ? matches[0].toLowerCase() : null;
  }

  // Solana address extraction commented out - Base/Base Sepolia only for now
  // /**
  //  * Extract Solana address from text
  //  * @param {string} text - Text to search
  //  * @returns {string|null} - Solana address or null
  //  */
  // static extractSolanaAddress(text) {
  //   if (!text) return null;
  //   const match = text.match(this.SOL_PATTERN);
  //   return match ? match[1] : null;
  // }

  /**
   * Extract raw 0x address from text
   * @param {string} text - Text to search
   * @returns {string|null} - 0x address or null
   */
  static extractRawAddress(text) {
    if (!text) return null;

    const match = text.match(this.ETH_ADDRESS_PATTERN);
    return match ? match[0] : null;
  }

  /**
   * Extract address from text - handles 0x addresses and ENS names
   * Note: ENS names are passed directly to the backend API for resolution
   * (Solana addresses commented out - Base/Base Sepolia only for now)
   * @param {string} text - Text containing address or ENS
   * @returns {{address: string|null, type: 'raw'|'ens', original: string|null}}
   */
  static resolveAddress(text) {
    if (!text) return { address: null, type: null, original: null };

    // First try to extract a raw 0x address
    const rawAddress = this.extractRawAddress(text);
    if (rawAddress) {
      return { address: rawAddress, type: 'raw', original: rawAddress };
    }

    // Try to extract ENS name (backend will resolve it)
    const ensName = this.extractENS(text);
    if (ensName) {
      return { address: ensName, type: 'ens', original: ensName };
    }

    // Solana address extraction commented out - Base/Base Sepolia only for now
    // const solAddress = this.extractSolanaAddress(text);
    // if (solAddress) {
    //   return { address: solAddress, type: 'sol', original: solAddress };
    // }

    return { address: null, type: null, original: null };
  }

  /**
   * Get ENS matches while applying exclusion rules.
   * @param {string} text - Text to search
   * @returns {string[]} - Matching ENS names
   */
  static getEnsMatches(text) {
    if (!text) return [];

    if (typeof AddressMatchers !== 'undefined' && AddressMatchers.getEnsMatches) {
      return AddressMatchers.getEnsMatches(text);
    }

    const matches = [];

    for (const match of text.matchAll(this.ENS_PATTERN_GLOBAL)) {
      matches.push(match[0]);
    }

    return matches;
  }
}

if (typeof window !== 'undefined') {
  window.AddressParser = AddressParser;
}
