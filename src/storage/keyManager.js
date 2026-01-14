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

const STORAGE_KEY_PREV = 'GROVE_PREV_JWTS';
const LEGACY_JWT_KEY = 'GROVE_API_JWT';
const MAX_KEYS = 10;

/**
 * Environment configuration for each slot
 */
const ENV_CONFIG = {
  production: {
    label: 'Mainnet',
    storageKey: 'GROVE_JWT_PRODUCTION',
    appUrl: 'https://app.grove.city',
    apiUrl: 'https://api.grove.city',
    isDevMode: false,
  },
  testnet: {
    label: 'Testnet',
    storageKey: 'GROVE_JWT_TESTNET',
    appUrl: 'https://app.testnet.grove.city',
    apiUrl: 'https://api.testnet.grove.city',
    isDevMode: true,
  },
  localhost: {
    label: 'Localhost',
    storageKey: 'GROVE_JWT_LOCALHOST',
    appUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:8000',
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
   * Get JWT for a specific slot
   * @param {string} slotId - 'production', 'testnet', or 'localhost'
   * @returns {Promise<string|null>}
   */
  static async getJWT(slotId) {
    const config = ENV_CONFIG[slotId];
    if (!config) return null;
    const result = await chrome.storage.local.get([config.storageKey]);
    return result[config.storageKey] || null;
  }

  /**
   * Set JWT for a specific slot
   * @param {string} slotId - 'production', 'testnet', or 'localhost'
   * @param {string} jwt
   */
  static async setJWT(slotId, jwt) {
    const config = ENV_CONFIG[slotId];
    if (!config) return;
    await chrome.storage.local.set({ [config.storageKey]: jwt });
  }

  /**
   * Clear JWT for a specific slot
   * @param {string} slotId - 'production', 'testnet', or 'localhost'
   */
  static async clearJWT(slotId) {
    const config = ENV_CONFIG[slotId];
    if (!config) return;
    await chrome.storage.local.remove([config.storageKey]);
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
   * @returns {Promise<string|null>}
   */
  static async getActiveJWT() {
    const slotId = await this.getActiveSlotId();
    return this.getJWT(slotId);
  }

  /**
   * Migrate from legacy single-JWT storage to multi-slot architecture
   * Should be called once on extension init
   */
  static async migrateFromLegacy() {
    const storageKeys = Object.values(ENV_CONFIG).map(c => c.storageKey);
    const result = await chrome.storage.local.get([LEGACY_JWT_KEY, 'groveEndpoint', ...storageKeys]);
    const legacyJwt = result[LEGACY_JWT_KEY];
    const endpoint = result['groveEndpoint'];

    // Skip if no legacy JWT or if already migrated (has new keys)
    const hasNewKeys = storageKeys.some(key => result[key]);
    if (!legacyJwt || hasNewKeys) {
      return false;
    }

    // Determine where to put the legacy JWT based on endpoint
    const targetSlot = (endpoint === 'localhost' || endpoint === 'testnet') ? endpoint : 'production';
    await this.setJWT(targetSlot, legacyJwt);

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

    const result = await chrome.storage.local.get([STORAGE_KEY_PREV]);
    let prevJwts = result[STORAGE_KEY_PREV] || [];

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

    await chrome.storage.local.set({ [STORAGE_KEY_PREV]: prevJwts });
  }

  /**
   * Get all previous keys
   * @returns {Promise<Array>} Array of key objects with {key, timestamp, environment}
   */
  static async getPreviousKeys() {
    const result = await chrome.storage.local.get([STORAGE_KEY_PREV]);
    return result[STORAGE_KEY_PREV] || [];
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
    await chrome.storage.local.remove(STORAGE_KEY_PREV);
  }

  /**
   * Delete a specific key by index
   * @param {number} index - The index of the key to delete
   * @returns {Promise<void>}
   */
  static async deleteKey(index) {
    const result = await chrome.storage.local.get([STORAGE_KEY_PREV]);
    let prevJwts = result[STORAGE_KEY_PREV] || [];

    if (index >= 0 && index < prevJwts.length) {
      prevJwts.splice(index, 1);
      await chrome.storage.local.set({ [STORAGE_KEY_PREV]: prevJwts });
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
