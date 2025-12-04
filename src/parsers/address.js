/**
 * Address Parser
 * Simple detection to determine if bio contains a tippable address
 * Note: Only used for showing button - backend handles actual extraction
 */

class AddressParser {
  // ENS name pattern: alphanumeric + hyphens, supports subdomains, ending in .eth
  // Matches: vitalik.eth, foo-bar.eth, jesse.base.eth, sub.name.eth
  static ENS_PATTERN = /(?:^|\s|Tip:\s*)([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)*\.eth)(?:\s|$|[,.\-])/i;

  // Solana address pattern commented out - Base/Base Sepolia only for now
  // Solana address pattern: base58 encoded, 32-44 chars
  // Base58 excludes: 0, O, I, l
  // static SOL_PATTERN = /(?:^|\s|Tip:\s*)([1-9A-HJ-NP-Za-km-z]{32,44})(?:\s|$|[,.\-])/;

  /**
   * Check if text contains any parseable addresses
   * Supported patterns:
   * 1. TOKEN(network): 0xADDRESS (e.g., USDC(base): 0x9ab39B84aC4DE6D705C5f051c07db8fE72890953)
   * 2. Tip: 0xADDRESS (defaults to BASE and USDC)
   * 3. ENS names (e.g., vitalik.eth)
   * (Solana addresses commented out - Base/Base Sepolia only for now)
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

    // Pattern 4: Solana addresses - commented out
    // const solPattern = this.SOL_PATTERN;

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

    // Try full pattern first: TOKEN(network): 0xADDRESS
    const fullPattern = /\w+\(\w+\):\s*(0x[a-fA-F0-9]{40})/;
    let match = text.match(fullPattern);
    if (match) return match[1];

    // Try tip pattern: Tip: 0xADDRESS
    const tipPattern = /Tip:\s*(0x[a-fA-F0-9]{40})/i;
    match = text.match(tipPattern);
    if (match) return match[1];

    return null;
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
}

if (typeof window !== 'undefined') {
  window.AddressParser = AddressParser;
}
