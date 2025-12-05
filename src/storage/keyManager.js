/**
 * Key Manager
 * Handles storage and retrieval of previous JWT keys
 */

const STORAGE_KEY = 'GROVE_PREV_JWTS';
const MAX_KEYS = 10;

class KeyManager {
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
