/**
 * Address Parser
 * Simple detection to determine if bio contains a tippable address
 * Note: Only used for showing button - backend handles actual extraction
 */

class AddressParser {
  // ENS name pattern: alphanumeric + hyphens, ending in .eth
  // Matches: vitalik.eth, foo-bar.eth, 123abc.eth
  static ENS_PATTERN = /(?:^|\s|Tip:\s*)([a-zA-Z0-9][-a-zA-Z0-9]*\.eth)(?:\s|$|[,.\-])/i;

  // Solana address pattern: base58 encoded, 32-44 chars
  // Base58 excludes: 0, O, I, l
  static SOL_PATTERN = /(?:^|\s|Tip:\s*)([1-9A-HJ-NP-Za-km-z]{32,44})(?:\s|$|[,.\-])/;

  /**
   * Check if text contains any parseable addresses
   * Supported patterns:
   * 1. TOKEN(network): 0xADDRESS (e.g., USDC(base): 0x9ab39B84aC4DE6D705C5f051c07db8fE72890953)
   * 2. Tip: 0xADDRESS (defaults to BASE and USDC)
   * 3. ENS names (e.g., vitalik.eth)
   * 4. Solana addresses (base58, 32-44 chars)
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

    // Pattern 4: Solana addresses
    const solPattern = this.SOL_PATTERN;

    return fullPattern.test(text) || tipPattern.test(text) || ensPattern.test(text) || solPattern.test(text);
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

  /**
   * Extract Solana address from text
   * @param {string} text - Text to search
   * @returns {string|null} - Solana address or null
   */
  static extractSolanaAddress(text) {
    if (!text) return null;
    const match = text.match(this.SOL_PATTERN);
    return match ? match[1] : null;
  }

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
   * Resolve address from text - handles 0x addresses, ENS names, and Solana addresses
   * @param {string} text - Text containing address or ENS
   * @returns {Promise<{address: string|null, type: 'raw'|'ens'|'sol', original: string|null}>}
   */
  static async resolveAddress(text) {
    if (!text) return { address: null, type: null, original: null };

    // First try to extract a raw 0x address
    const rawAddress = this.extractRawAddress(text);
    if (rawAddress) {
      return { address: rawAddress, type: 'raw', original: rawAddress };
    }

    // Try to extract and resolve ENS
    const ensName = this.extractENS(text);
    if (ensName) {
      const resolved = await GroveAPI.resolveENS(ensName);
      return { address: resolved, type: 'ens', original: ensName };
    }

    // Try to extract Solana address
    const solAddress = this.extractSolanaAddress(text);
    if (solAddress) {
      return { address: solAddress, type: 'sol', original: solAddress };
    }

    return { address: null, type: null, original: null };
  }
}

if (typeof window !== 'undefined') {
  window.AddressParser = AddressParser;
}
