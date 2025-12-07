/**
 * Key Manager
 * Handles storage and retrieval of JWT keys with dual-slot architecture
 *
 * Storage structure:
 * - GROVE_JWT_PRODUCTION: Active production JWT (for Base mainnet)
 * - GROVE_JWT_TESTNET: Active testnet JWT (for Base Sepolia)
 * - GROVE_PREV_JWTS: Archive of previous keys (for recovery)
 */

const STORAGE_KEY = 'GROVE_PREV_JWTS';
const STORAGE_KEY_PROD = 'GROVE_JWT_PRODUCTION';
const STORAGE_KEY_TESTNET = 'GROVE_JWT_TESTNET';
const LEGACY_JWT_KEY = 'GROVE_API_JWT';
const MAX_KEYS = 10;

class KeyManager {
  /**
   * Get the production JWT
   * @returns {Promise<string|null>}
   */
  static async getProductionJWT() {
    const result = await chrome.storage.local.get([STORAGE_KEY_PROD]);
    return result[STORAGE_KEY_PROD] || null;
  }

  /**
   * Set the production JWT
   * @param {string} jwt
   */
  static async setProductionJWT(jwt) {
    await chrome.storage.local.set({ [STORAGE_KEY_PROD]: jwt });
  }

  /**
   * Get the testnet JWT
   * @returns {Promise<string|null>}
   */
  static async getTestnetJWT() {
    const result = await chrome.storage.local.get([STORAGE_KEY_TESTNET]);
    return result[STORAGE_KEY_TESTNET] || null;
  }

  /**
   * Set the testnet JWT
   * @param {string} jwt
   */
  static async setTestnetJWT(jwt) {
    await chrome.storage.local.set({ [STORAGE_KEY_TESTNET]: jwt });
  }

  /**
   * Get the active JWT based on dev mode
   * @param {boolean} isDevMode - Whether developer mode is enabled
   * @returns {Promise<string|null>}
   */
  static async getActiveJWT(isDevMode) {
    return isDevMode ? this.getTestnetJWT() : this.getProductionJWT();
  }

  /**
   * Clear the production JWT
   */
  static async clearProductionJWT() {
    await chrome.storage.local.remove([STORAGE_KEY_PROD]);
  }

  /**
   * Clear the testnet JWT
   */
  static async clearTestnetJWT() {
    await chrome.storage.local.remove([STORAGE_KEY_TESTNET]);
  }

  /**
   * Migrate from legacy single-JWT storage to dual-slot architecture
   * Should be called once on extension init
   */
  static async migrateFromLegacy() {
    const result = await chrome.storage.local.get([LEGACY_JWT_KEY, 'groveEndpoint', STORAGE_KEY_PROD, STORAGE_KEY_TESTNET]);
    const legacyJwt = result[LEGACY_JWT_KEY];
    const endpoint = result['groveEndpoint'];

    // Skip if no legacy JWT or if already migrated (has new keys)
    if (!legacyJwt || result[STORAGE_KEY_PROD] || result[STORAGE_KEY_TESTNET]) {
      return false;
    }

    // Determine where to put the legacy JWT based on endpoint
    if (endpoint === 'testnet' || endpoint === 'localhost' || endpoint === 'localhost:3000') {
      await this.setTestnetJWT(legacyJwt);
    } else {
      await this.setProductionJWT(legacyJwt);
    }

    // Remove legacy key
    await chrome.storage.local.remove([LEGACY_JWT_KEY]);

    console.log('[KeyManager] Migrated legacy JWT to new dual-slot architecture');
    return true;
  }

  /**
   * Save current JWT to previous keys before replacing it
   * @param {string} currentJwt - The current JWT to archive
   */
  static async archiveCurrentKey(currentJwt) {
    if (!currentJwt) return;

    const result = await chrome.storage.local.get([STORAGE_KEY]);
    let prevJwts = result[STORAGE_KEY] || [];

    // Remove if already exists to prevent duplicates
    prevJwts = prevJwts.filter(item => item.key !== currentJwt);

    // Add current JWT to previous keys with timestamp
    prevJwts.unshift({
      key: currentJwt,
      timestamp: new Date().toISOString()
    });

    // Keep only last MAX_KEYS keys
    if (prevJwts.length > MAX_KEYS) {
      prevJwts = prevJwts.slice(0, MAX_KEYS);
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: prevJwts });
  }

  /**
   * Get all previous keys
   * @returns {Promise<Array>} Array of key objects with {key, timestamp}
   */
  static async getPreviousKeys() {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    return result[STORAGE_KEY] || [];
  }

  /**
   * Get count of previous keys
   * @returns {Promise<number>} Number of stored keys
   */
  static async getKeyCount() {
    const keys = await this.getPreviousKeys();
    return keys.length;
  }

  /**
   * Clear all previous keys
   * @returns {Promise<void>}
   */
  static async clearAll() {
    await chrome.storage.local.remove(STORAGE_KEY);
  }

  /**
   * Delete a specific key by index
   * @param {number} index - The index of the key to delete
   * @returns {Promise<void>}
   */
  static async deleteKey(index) {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    let prevJwts = result[STORAGE_KEY] || [];

    if (index >= 0 && index < prevJwts.length) {
      prevJwts.splice(index, 1);
      await chrome.storage.local.set({ [STORAGE_KEY]: prevJwts });
    }
  }

  /**
   * Get a specific key by index
   * @param {number} index - The index of the key to retrieve
   * @returns {Promise<Object|null>} The key object or null
   */
  static async getKey(index) {
    const keys = await this.getPreviousKeys();
    return keys[index] || null;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.KeyManager = KeyManager;
}
