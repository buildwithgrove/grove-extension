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

// Storage keys
const STORAGE_KEYS = {
  PRODUCTION: 'GROVE_JWT_PRODUCTION',
  TESTNET: 'GROVE_JWT_TESTNET',
  LOCALHOST: 'GROVE_JWT_LOCALHOST',
  PREVIOUS: 'GROVE_PREV_JWTS',
  LEGACY: 'GROVE_API_JWT',
};

const MAX_PREVIOUS_KEYS = 10;

/**
 * Environment configuration
 * Defines properties for each environment slot
 */
const ENV_CONFIG = {
  production: {
    id: 'production',
    label: 'Mainnet',
    storageKey: STORAGE_KEYS.PRODUCTION,
    endpoint: 'production',
    apiUrl: 'https://api.grove.city',
    appUrl: 'https://app.grove.city',
    defaultChain: 'base',
    isDevMode: false,
  },
  testnet: {
    id: 'testnet',
    label: 'Testnet',
    storageKey: STORAGE_KEYS.TESTNET,
    endpoint: 'testnet',
    apiUrl: 'https://api.testnet.grove.city',
    appUrl: 'https://app.testnet.grove.city',
    defaultChain: 'base-sepolia',
    isDevMode: true,
  },
  localhost: {
    id: 'localhost',
    label: 'Localhost',
    storageKey: STORAGE_KEYS.LOCALHOST,
    endpoint: 'localhost',
    apiUrl: 'http://localhost:8000',
    appUrl: 'http://localhost:3000',
    defaultChain: 'base-sepolia',
    isDevMode: true,
  },
};

// Environment IDs for iteration
const ENV_IDS = Object.keys(ENV_CONFIG);
const DEV_ENV_IDS = ENV_IDS.filter(id => ENV_CONFIG[id].isDevMode);

class KeyManager {
  /**
   * Get environment configuration
   * @param {string} envId - Environment ID ('production', 'testnet', 'localhost')
   * @returns {Object|null} Environment config or null if not found
   */
  static getEnvConfig(envId) {
    return ENV_CONFIG[envId] || null;
  }

  /**
   * Get all environment configurations
   * @returns {Object} All environment configs
   */
  static getAllEnvConfigs() {
    return ENV_CONFIG;
  }

  /**
   * Get environment IDs
   * @param {boolean} devOnly - If true, only return dev mode environments
   * @returns {string[]} Array of environment IDs
   */
  static getEnvIds(devOnly = false) {
    return devOnly ? DEV_ENV_IDS : ENV_IDS;
  }

  /**
   * Get JWT for a specific environment
   * @param {string} envId - Environment ID
   * @returns {Promise<string|null>}
   */
  static async getJWT(envId) {
    const config = this.getEnvConfig(envId);
    if (!config) return null;

    const result = await chrome.storage.local.get([config.storageKey]);
    return result[config.storageKey] || null;
  }

  /**
   * Set JWT for a specific environment
   * @param {string} envId - Environment ID
   * @param {string} jwt - JWT token
   */
  static async setJWT(envId, jwt) {
    const config = this.getEnvConfig(envId);
    if (!config) return;

    await chrome.storage.local.set({ [config.storageKey]: jwt });
  }

  /**
   * Clear JWT for a specific environment
   * @param {string} envId - Environment ID
   */
  static async clearJWT(envId) {
    const config = this.getEnvConfig(envId);
    if (!config) return;

    await chrome.storage.local.remove([config.storageKey]);
  }

  // Legacy convenience methods (kept for backward compatibility)
  static async getProductionJWT() {
    return this.getJWT('production');
  }

  static async setProductionJWT(jwt) {
    return this.setJWT('production', jwt);
  }

  static async getTestnetJWT() {
    return this.getJWT('testnet');
  }

  static async setTestnetJWT(jwt) {
    return this.setJWT('testnet', jwt);
  }

  static async getLocalhostJWT() {
    return this.getJWT('localhost');
  }

  static async setLocalhostJWT(jwt) {
    return this.setJWT('localhost', jwt);
  }

  static async clearProductionJWT() {
    return this.clearJWT('production');
  }

  static async clearTestnetJWT() {
    return this.clearJWT('testnet');
  }

  static async clearLocalhostJWT() {
    return this.clearJWT('localhost');
  }

  /**
   * Get the environment ID for the current endpoint
   * @returns {Promise<string>} Environment ID
   */
  static async getActiveEnvId() {
    const result = await chrome.storage.local.get(['groveEndpoint', 'groveEnvironment']);
    const endpoint = result['groveEndpoint'] || 'production';
    const env = result['groveEnvironment'] || 'prod';
    const isDevMode = env === 'local';

    // Map endpoint to environment ID
    if (!isDevMode) return 'production';
    if (endpoint === 'localhost') return 'localhost';
    if (endpoint === 'testnet') return 'testnet';
    return 'production';
  }

  /**
   * Get the active JWT based on environment and endpoint
   * @param {boolean} isDevMode - Whether developer mode is enabled (optional, for backward compatibility)
   * @returns {Promise<string|null>}
   */
  static async getActiveJWT(isDevMode = undefined) {
    const result = await chrome.storage.local.get(['groveEndpoint', 'groveEnvironment']);
    const endpoint = result['groveEndpoint'] || 'production';
    const env = result['groveEnvironment'] || 'prod';

    // If caller provided isDevMode, honor it; otherwise derive from env
    const devMode = typeof isDevMode === 'boolean' ? isDevMode : (env === 'local');

    if (!devMode) return this.getJWT('production');
    if (endpoint === 'localhost') return this.getJWT('localhost');
    if (endpoint === 'testnet') return this.getJWT('testnet');
    return this.getJWT('production');
  }

  /**
   * Migrate from legacy single-JWT storage to multi-slot architecture
   * Should be called once on extension init
   */
  static async migrateFromLegacy() {
    const keys = [STORAGE_KEYS.LEGACY, 'groveEndpoint', STORAGE_KEYS.PRODUCTION, STORAGE_KEYS.TESTNET];
    const result = await chrome.storage.local.get(keys);
    const legacyJwt = result[STORAGE_KEYS.LEGACY];
    const endpoint = result['groveEndpoint'];

    // Skip if no legacy JWT or if already migrated (has new keys)
    if (!legacyJwt || result[STORAGE_KEYS.PRODUCTION] || result[STORAGE_KEYS.TESTNET]) {
      return false;
    }

    // Determine where to put the legacy JWT based on endpoint
    if (endpoint === 'testnet') {
      await this.setJWT('testnet', legacyJwt);
    } else if (endpoint === 'localhost') {
      await this.setJWT('localhost', legacyJwt);
    } else {
      await this.setJWT('production', legacyJwt);
    }

    // Remove legacy key
    await chrome.storage.local.remove([STORAGE_KEYS.LEGACY]);

    console.log('[KeyManager] Migrated legacy JWT to multi-slot architecture');
    return true;
  }

  /**
   * Save current JWT to previous keys before replacing it
   * @param {string} currentJwt - The current JWT to archive
   * @param {string} environment - The environment ID
   */
  static async archiveCurrentKey(currentJwt, environment = null) {
    if (!currentJwt) return;

    const result = await chrome.storage.local.get([STORAGE_KEYS.PREVIOUS]);
    let prevJwts = result[STORAGE_KEYS.PREVIOUS] || [];

    // Remove if already exists to prevent duplicates
    prevJwts = prevJwts.filter(item => item.key !== currentJwt);

    // Add current JWT to previous keys with timestamp and environment
    prevJwts.unshift({
      key: currentJwt,
      timestamp: new Date().toISOString(),
      environment: environment
    });

    // Keep only last MAX_PREVIOUS_KEYS keys
    if (prevJwts.length > MAX_PREVIOUS_KEYS) {
      prevJwts = prevJwts.slice(0, MAX_PREVIOUS_KEYS);
    }

    await chrome.storage.local.set({ [STORAGE_KEYS.PREVIOUS]: prevJwts });
  }

  /**
   * Get all previous keys
   * @returns {Promise<Array>} Array of key objects with {key, timestamp, environment}
   */
  static async getPreviousKeys() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.PREVIOUS]);
    return result[STORAGE_KEYS.PREVIOUS] || [];
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
    await chrome.storage.local.remove(STORAGE_KEYS.PREVIOUS);
  }

  /**
   * Delete a specific key by index
   * @param {number} index - The index of the key to delete
   * @returns {Promise<void>}
   */
  static async deleteKey(index) {
    const result = await chrome.storage.local.get([STORAGE_KEYS.PREVIOUS]);
    let prevJwts = result[STORAGE_KEYS.PREVIOUS] || [];

    if (index >= 0 && index < prevJwts.length) {
      prevJwts.splice(index, 1);
      await chrome.storage.local.set({ [STORAGE_KEYS.PREVIOUS]: prevJwts });
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
