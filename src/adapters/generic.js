/**
 * Generic Website Adapter
 * Used for any website that's not a recognized social platform
 * Shows a floating tip button when the site has llms.txt or ai.txt with a tippable address
 */

class GenericAdapter extends BaseAdapter {
  constructor() {
    super();
    this.metadataResult = null;
  }

  /**
   * Check if this adapter should be used
   * Returns true for any website (fallback adapter)
   * @returns {boolean}
   */
  detectTippablePage() {
    // Generic adapter always returns true - we'll check metadata instead
    return true;
  }

  /**
   * For generic sites, we don't extract a bio
   * The metadata fetcher handles address detection
   * @returns {string|null}
   */
  extractBio() {
    // Return the metadata content if we have it
    if (this.metadataResult && this.metadataResult.content) {
      return this.metadataResult.content;
    }
    return null;
  }

  /**
   * Get button placement - for generic sites, returns null
   * We use a floating button instead
   * @returns {Element|null}
   */
  getButtonPlacement() {
    // Return null to signal we need a floating button
    return null;
  }

  /**
   * Get platform name
   * @returns {string}
   */
  getPlatformName() {
    return 'generic';
  }

  /**
   * Fetch and check metadata files for this site
   * @returns {Promise<{found: boolean, source: string|null, content: string|null, address: Object|null}>}
   */
  async fetchMetadata() {
    this.metadataResult = await MetadataFetcher.fetchAndCheck(window.location.origin);
    return this.metadataResult;
  }

  /**
   * Check if the site has tippable metadata
   * @returns {boolean}
   */
  hasMetadata() {
    return this.metadataResult && this.metadataResult.found;
  }

  /**
   * Get the resolved address from metadata
   * @returns {Object|null}
   */
  getMetadataAddress() {
    return this.metadataResult?.address || null;
  }

  /**
   * Get the metadata source file name
   * @returns {string|null}
   */
  getMetadataSource() {
    return this.metadataResult?.source || null;
  }
}

if (typeof window !== 'undefined') {
  window.GenericAdapter = GenericAdapter;
}
