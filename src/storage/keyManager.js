/**
 * Key Manager
 * Handles storage and retrieval of JWT keys with multi-slot architecture
 *
 * Storage structure:
 * - GROVE_JWT_PRODUCTION: Active production JWT (for Base mainnet)
 * - GROVE_JWT_TESTNET: Active testnet JWT (for Base Sepolia via testnet API)
 * - GROVE_JWT_LOCALHOST: Active localhost JWT (for local development)
 * - GROVE_PREV_JWTS: Archive of previous keys (for recovery)
 */

const STORAGE_KEY = 'GROVE_PREV_JWTS';
const STORAGE_KEY_PROD = 'GROVE_JWT_PRODUCTION';
const STORAGE_KEY_TESTNET = 'GROVE_JWT_TESTNET';
const STORAGE_KEY_LOCALHOST = 'GROVE_JWT_LOCALHOST';
const LEGACY_JWT_KEY = 'GROVE_API_JWT';
const MAX_KEYS = 10;

/**
 * Environment configuration for each slot
 */
const ENV_CONFIG = {
  production: {
    label: 'Mainnet',
    storageKey: STORAGE_KEY_PROD,
    appUrl: 'https://app.grove.city',
    isDevMode: false,
  },
  testnet: {
    label: 'Testnet',
    storageKey: STORAGE_KEY_TESTNET,
    appUrl: 'https://app.testnet.grove.city',
    isDevMode: true,
  },
  localhost: {
    label: 'Localhost',
    storageKey: STORAGE_KEY_LOCALHOST,
    appUrl: 'http://localhost:3000',
    isDevMode: true,
  },
};

class KeyManager {
  /**
   * Get environment config for a slot
   * @param {string} slotId - 'production', 'testnet', or 'localhost'
   * @returns {Object|null}
   */
  static getEnvConfig(slotId) {
    return ENV_CONFIG[slotId] || null;
  }

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
   * Get the localhost JWT
   * @returns {Promise<string|null>}
   */
  static async getLocalhostJWT() {
    const result = await chrome.storage.local.get([STORAGE_KEY_LOCALHOST]);
    return result[STORAGE_KEY_LOCALHOST] || null;
  }

  /**
   * Set the localhost JWT
   * @param {string} jwt
   */
  static async setLocalhostJWT(jwt) {
    await chrome.storage.local.set({ [STORAGE_KEY_LOCALHOST]: jwt });
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
   * Clear the localhost JWT
   */
  static async clearLocalhostJWT() {
    await chrome.storage.local.remove([STORAGE_KEY_LOCALHOST]);
  }

  /**
   * Get JWT for a specific slot
   * @param {string} slotId - 'production', 'testnet', or 'localhost'
   * @returns {Promise<string|null>}
   */
  static async getJWT(slotId) {
    if (slotId === 'production') return this.getProductionJWT();
    if (slotId === 'testnet') return this.getTestnetJWT();
    if (slotId === 'localhost') return this.getLocalhostJWT();
    return null;
  }

  /**
   * Set JWT for a specific slot
   * @param {string} slotId - 'production', 'testnet', or 'localhost'
   * @param {string} jwt
   */
  static async setJWT(slotId, jwt) {
    if (slotId === 'production') return this.setProductionJWT(jwt);
    if (slotId === 'testnet') return this.setTestnetJWT(jwt);
    if (slotId === 'localhost') return this.setLocalhostJWT(jwt);
  }

  /**
   * Clear JWT for a specific slot
   * @param {string} slotId - 'production', 'testnet', or 'localhost'
   */
  static async clearJWT(slotId) {
    if (slotId === 'production') return this.clearProductionJWT();
    if (slotId === 'testnet') return this.clearTestnetJWT();
    if (slotId === 'localhost') return this.clearLocalhostJWT();
  }

  /**
   * Get the active slot ID based on environment and endpoint
   * @returns {Promise<string>} 'production', 'testnet', or 'localhost'
   */
  static async getActiveSlotId() {
    const result = await chrome.storage.local.get(['groveEndpoint', 'groveEnvironment']);
    const endpoint = result['groveEndpoint'] || 'production';
    const env = result['groveEnvironment'] || 'prod';
    const isDevMode = env === 'local';

    if (!isDevMode) return 'production';
    if (endpoint === 'localhost') return 'localhost';
    if (endpoint === 'testnet') return 'testnet';
    return 'production';
  }

  /**
   * Get the active JWT based on environment and endpoint
   * @param {boolean} isDevMode - Whether developer mode is enabled (optional, preserved for backward compatibility)
   * @returns {Promise<string|null>}
   */
  static async getActiveJWT(isDevMode = undefined) {
    const result = await chrome.storage.local.get(['groveEndpoint', 'groveEnvironment']);
    const endpoint = result['groveEndpoint'] || 'production';
    const env = result['groveEnvironment'] || 'prod';

    // If caller provided isDevMode, keep honoring it; otherwise derive from env
    const devMode = typeof isDevMode === 'boolean' ? isDevMode : (env === 'local');

    if (!devMode) return this.getProductionJWT();
    if (endpoint === 'localhost') return this.getLocalhostJWT();
    if (endpoint === 'testnet') return this.getTestnetJWT();
    return this.getProductionJWT();
  }

  /**
   * Migrate from legacy single-JWT storage to multi-slot architecture
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
    if (endpoint === 'localhost') {
      await this.setLocalhostJWT(legacyJwt);
    } else if (endpoint === 'testnet') {
      await this.setTestnetJWT(legacyJwt);
    } else {
      await this.setProductionJWT(legacyJwt);
    }

    // Remove legacy key
    await chrome.storage.local.remove([LEGACY_JWT_KEY]);

    console.log('[KeyManager] Migrated legacy JWT to multi-slot architecture');
    return true;
  }

  /**
   * Save current JWT to previous keys before replacing it
   * @param {string} currentJwt - The current JWT to archive
   * @param {string} environment - The environment ('production', 'testnet', or 'localhost')
   */
  static async archiveCurrentKey(currentJwt, environment = null) {
    if (!currentJwt) return;

    const result = await chrome.storage.local.get([STORAGE_KEY]);
    let prevJwts = result[STORAGE_KEY] || [];

    // Remove if already exists to prevent duplicates
    prevJwts = prevJwts.filter(item => item.key !== currentJwt);

    // Add current JWT to previous keys with timestamp and environment
    prevJwts.unshift({
      key: currentJwt,
      timestamp: new Date().toISOString(),
      environment: environment
    });

    // Keep only last MAX_KEYS keys
    if (prevJwts.length > MAX_KEYS) {
      prevJwts = prevJwts.slice(0, MAX_KEYS);
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: prevJwts });
  }

  /**
   * Get all previous keys
   * @returns {Promise<Array>} Array of key objects with {key, timestamp, environment}
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
  window.ENV_CONFIG = ENV_CONFIG;
}
