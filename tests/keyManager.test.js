import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupChromeMock, resetChromeMock } from './mocks/chrome.js';

let KeyManager;
let ENV_CONFIG;
let mockChrome;

const STORAGE_KEY_PREV = 'GROVE_PREV_JWTS';
const LEGACY_JWT_KEY = 'GROVE_API_JWT';
const MAX_KEYS = 10;

beforeEach(() => {
  mockChrome = setupChromeMock();

  ENV_CONFIG = {
    production: {
      label: 'Mainnet',
      storageKey: 'GROVE_JWT_PRODUCTION',
      appUrl: 'https://app.grove.city',
      isDevMode: false,
    },
    testnet: {
      label: 'Testnet',
      storageKey: 'GROVE_JWT_TESTNET',
      appUrl: 'https://app.testnet.grove.city',
      isDevMode: true,
    },
    localhost: {
      label: 'Localhost',
      storageKey: 'GROVE_JWT_LOCALHOST',
      appUrl: 'http://localhost:3000',
      isDevMode: true,
    },
  };

  // Create KeyManager class for testing
  class TestKeyManager {
    static getEnvConfig(slotId) {
      return ENV_CONFIG[slotId] || null;
    }

    static async getJWT(slotId) {
      const config = ENV_CONFIG[slotId];
      if (!config) return null;
      const result = await chrome.storage.local.get([config.storageKey]);
      return result[config.storageKey] || null;
    }

    static async setJWT(slotId, jwt) {
      const config = ENV_CONFIG[slotId];
      if (!config) return;
      await chrome.storage.local.set({ [config.storageKey]: jwt });
    }

    static async clearJWT(slotId) {
      const config = ENV_CONFIG[slotId];
      if (!config) return;
      await chrome.storage.local.remove([config.storageKey]);
    }

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

    static async getActiveJWT() {
      const slotId = await this.getActiveSlotId();
      return this.getJWT(slotId);
    }

    static async migrateFromLegacy() {
      const storageKeys = Object.values(ENV_CONFIG).map(c => c.storageKey);
      const result = await chrome.storage.local.get([LEGACY_JWT_KEY, 'groveEndpoint', ...storageKeys]);
      const legacyJwt = result[LEGACY_JWT_KEY];
      const endpoint = result['groveEndpoint'];

      const hasNewKeys = storageKeys.some(key => result[key]);
      if (!legacyJwt || hasNewKeys) {
        return false;
      }

      const targetSlot = (endpoint === 'localhost' || endpoint === 'testnet') ? endpoint : 'production';
      await this.setJWT(targetSlot, legacyJwt);
      await chrome.storage.local.remove([LEGACY_JWT_KEY]);

      return true;
    }

    static async archiveCurrentKey(currentJwt, environment = null) {
      if (!currentJwt) return;

      const result = await chrome.storage.local.get([STORAGE_KEY_PREV]);
      let prevJwts = result[STORAGE_KEY_PREV] || [];

      prevJwts = prevJwts.filter(item => item.key !== currentJwt);

      prevJwts.unshift({
        key: currentJwt,
        timestamp: new Date().toISOString(),
        environment: environment
      });

      if (prevJwts.length > MAX_KEYS) {
        prevJwts = prevJwts.slice(0, MAX_KEYS);
      }

      await chrome.storage.local.set({ [STORAGE_KEY_PREV]: prevJwts });
    }

    static async getPreviousKeys() {
      const result = await chrome.storage.local.get([STORAGE_KEY_PREV]);
      return result[STORAGE_KEY_PREV] || [];
    }

    static async getKeyCount() {
      const keys = await this.getPreviousKeys();
      return keys.length;
    }

    static async clearAll() {
      await chrome.storage.local.remove(STORAGE_KEY_PREV);
    }

    static async deleteKey(index) {
      const result = await chrome.storage.local.get([STORAGE_KEY_PREV]);
      let prevJwts = result[STORAGE_KEY_PREV] || [];

      if (index >= 0 && index < prevJwts.length) {
        prevJwts.splice(index, 1);
        await chrome.storage.local.set({ [STORAGE_KEY_PREV]: prevJwts });
      }
    }

    static async getKey(index) {
      const keys = await this.getPreviousKeys();
      return keys[index] || null;
    }
  }

  KeyManager = TestKeyManager;
});

afterEach(() => {
  resetChromeMock(mockChrome);
});

describe('KeyManager', () => {
  describe('getEnvConfig', () => {
    it('should return config for production slot', () => {
      const config = KeyManager.getEnvConfig('production');
      expect(config.label).toBe('Mainnet');
      expect(config.storageKey).toBe('GROVE_JWT_PRODUCTION');
      expect(config.appUrl).toBe('https://app.grove.city');
    });

    it('should return config for testnet slot', () => {
      const config = KeyManager.getEnvConfig('testnet');
      expect(config.label).toBe('Testnet');
      expect(config.storageKey).toBe('GROVE_JWT_TESTNET');
    });

    it('should return config for localhost slot', () => {
      const config = KeyManager.getEnvConfig('localhost');
      expect(config.label).toBe('Localhost');
      expect(config.isDevMode).toBe(true);
    });

    it('should return null for unknown slot', () => {
      const config = KeyManager.getEnvConfig('unknown');
      expect(config).toBeNull();
    });
  });

  describe('getJWT / setJWT', () => {
    it('should store and retrieve JWT for production slot', async () => {
      await KeyManager.setJWT('production', 'test-jwt-prod');
      const jwt = await KeyManager.getJWT('production');
      expect(jwt).toBe('test-jwt-prod');
    });

    it('should store and retrieve JWT for testnet slot', async () => {
      await KeyManager.setJWT('testnet', 'test-jwt-testnet');
      const jwt = await KeyManager.getJWT('testnet');
      expect(jwt).toBe('test-jwt-testnet');
    });

    it('should return null for empty slot', async () => {
      const jwt = await KeyManager.getJWT('production');
      expect(jwt).toBeNull();
    });

    it('should return null for unknown slot', async () => {
      const jwt = await KeyManager.getJWT('unknown');
      expect(jwt).toBeNull();
    });

    it('should not store JWT for unknown slot', async () => {
      await KeyManager.setJWT('unknown', 'test-jwt');
      const data = mockChrome.storage.local._getData();
      expect(Object.keys(data)).toHaveLength(0);
    });

    it('should keep slots separate', async () => {
      await KeyManager.setJWT('production', 'prod-jwt');
      await KeyManager.setJWT('testnet', 'testnet-jwt');
      await KeyManager.setJWT('localhost', 'localhost-jwt');

      expect(await KeyManager.getJWT('production')).toBe('prod-jwt');
      expect(await KeyManager.getJWT('testnet')).toBe('testnet-jwt');
      expect(await KeyManager.getJWT('localhost')).toBe('localhost-jwt');
    });
  });

  describe('clearJWT', () => {
    it('should clear JWT for specific slot', async () => {
      await KeyManager.setJWT('production', 'test-jwt');
      await KeyManager.clearJWT('production');
      const jwt = await KeyManager.getJWT('production');
      expect(jwt).toBeNull();
    });

    it('should not affect other slots', async () => {
      await KeyManager.setJWT('production', 'prod-jwt');
      await KeyManager.setJWT('testnet', 'testnet-jwt');
      await KeyManager.clearJWT('production');

      expect(await KeyManager.getJWT('production')).toBeNull();
      expect(await KeyManager.getJWT('testnet')).toBe('testnet-jwt');
    });
  });

  describe('getActiveSlotId', () => {
    it('should return production by default', async () => {
      const slotId = await KeyManager.getActiveSlotId();
      expect(slotId).toBe('production');
    });

    it('should return production when environment is prod', async () => {
      mockChrome.storage.local._setData({ groveEnvironment: 'prod', groveEndpoint: 'testnet' });
      const slotId = await KeyManager.getActiveSlotId();
      expect(slotId).toBe('production');
    });

    it('should return localhost when in local mode with localhost endpoint', async () => {
      mockChrome.storage.local._setData({ groveEnvironment: 'local', groveEndpoint: 'localhost' });
      const slotId = await KeyManager.getActiveSlotId();
      expect(slotId).toBe('localhost');
    });

    it('should return testnet when in local mode with testnet endpoint', async () => {
      mockChrome.storage.local._setData({ groveEnvironment: 'local', groveEndpoint: 'testnet' });
      const slotId = await KeyManager.getActiveSlotId();
      expect(slotId).toBe('testnet');
    });

    it('should return production in local mode with production endpoint', async () => {
      mockChrome.storage.local._setData({ groveEnvironment: 'local', groveEndpoint: 'production' });
      const slotId = await KeyManager.getActiveSlotId();
      expect(slotId).toBe('production');
    });
  });

  describe('getActiveJWT', () => {
    it('should get JWT for active slot', async () => {
      await KeyManager.setJWT('production', 'prod-jwt');
      const jwt = await KeyManager.getActiveJWT();
      expect(jwt).toBe('prod-jwt');
    });

    it('should get correct JWT based on environment', async () => {
      await KeyManager.setJWT('production', 'prod-jwt');
      await KeyManager.setJWT('testnet', 'testnet-jwt');
      mockChrome.storage.local._setData({
        ...mockChrome.storage.local._getData(),
        groveEnvironment: 'local',
        groveEndpoint: 'testnet'
      });

      const jwt = await KeyManager.getActiveJWT();
      expect(jwt).toBe('testnet-jwt');
    });
  });

  describe('migrateFromLegacy', () => {
    it('should migrate legacy JWT to production slot', async () => {
      mockChrome.storage.local._setData({ [LEGACY_JWT_KEY]: 'legacy-jwt' });

      const migrated = await KeyManager.migrateFromLegacy();

      expect(migrated).toBe(true);
      expect(await KeyManager.getJWT('production')).toBe('legacy-jwt');
    });

    it('should migrate legacy JWT to localhost if endpoint is localhost', async () => {
      mockChrome.storage.local._setData({
        [LEGACY_JWT_KEY]: 'legacy-jwt',
        groveEndpoint: 'localhost'
      });

      const migrated = await KeyManager.migrateFromLegacy();

      expect(migrated).toBe(true);
      expect(await KeyManager.getJWT('localhost')).toBe('legacy-jwt');
    });

    it('should migrate legacy JWT to testnet if endpoint is testnet', async () => {
      mockChrome.storage.local._setData({
        [LEGACY_JWT_KEY]: 'legacy-jwt',
        groveEndpoint: 'testnet'
      });

      const migrated = await KeyManager.migrateFromLegacy();

      expect(migrated).toBe(true);
      expect(await KeyManager.getJWT('testnet')).toBe('legacy-jwt');
    });

    it('should remove legacy key after migration', async () => {
      mockChrome.storage.local._setData({ [LEGACY_JWT_KEY]: 'legacy-jwt' });

      await KeyManager.migrateFromLegacy();

      const data = mockChrome.storage.local._getData();
      expect(data[LEGACY_JWT_KEY]).toBeUndefined();
    });

    it('should skip migration if no legacy JWT exists', async () => {
      const migrated = await KeyManager.migrateFromLegacy();
      expect(migrated).toBe(false);
    });

    it('should skip migration if new keys already exist', async () => {
      mockChrome.storage.local._setData({
        [LEGACY_JWT_KEY]: 'legacy-jwt',
        GROVE_JWT_PRODUCTION: 'existing-jwt'
      });

      const migrated = await KeyManager.migrateFromLegacy();
      expect(migrated).toBe(false);
    });
  });

  describe('archiveCurrentKey', () => {
    it('should archive a key with timestamp and environment', async () => {
      await KeyManager.archiveCurrentKey('test-jwt', 'production');

      const keys = await KeyManager.getPreviousKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0].key).toBe('test-jwt');
      expect(keys[0].environment).toBe('production');
      expect(keys[0].timestamp).toBeDefined();
    });

    it('should add new keys to the front', async () => {
      await KeyManager.archiveCurrentKey('first-jwt', 'production');
      await KeyManager.archiveCurrentKey('second-jwt', 'production');

      const keys = await KeyManager.getPreviousKeys();
      expect(keys[0].key).toBe('second-jwt');
      expect(keys[1].key).toBe('first-jwt');
    });

    it('should prevent duplicates', async () => {
      await KeyManager.archiveCurrentKey('same-jwt', 'production');
      await KeyManager.archiveCurrentKey('same-jwt', 'production');

      const keys = await KeyManager.getPreviousKeys();
      expect(keys).toHaveLength(1);
    });

    it('should limit to MAX_KEYS entries', async () => {
      for (let i = 0; i < 15; i++) {
        await KeyManager.archiveCurrentKey(`jwt-${i}`, 'production');
      }

      const keys = await KeyManager.getPreviousKeys();
      expect(keys).toHaveLength(MAX_KEYS);
      expect(keys[0].key).toBe('jwt-14'); // Most recent
    });

    it('should not archive null/undefined keys', async () => {
      await KeyManager.archiveCurrentKey(null);
      await KeyManager.archiveCurrentKey(undefined);

      const keys = await KeyManager.getPreviousKeys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('getPreviousKeys', () => {
    it('should return empty array when no keys stored', async () => {
      const keys = await KeyManager.getPreviousKeys();
      expect(keys).toEqual([]);
    });

    it('should return all stored keys', async () => {
      await KeyManager.archiveCurrentKey('jwt-1');
      await KeyManager.archiveCurrentKey('jwt-2');
      await KeyManager.archiveCurrentKey('jwt-3');

      const keys = await KeyManager.getPreviousKeys();
      expect(keys).toHaveLength(3);
    });
  });

  describe('getKeyCount', () => {
    it('should return 0 when no keys stored', async () => {
      const count = await KeyManager.getKeyCount();
      expect(count).toBe(0);
    });

    it('should return correct count', async () => {
      await KeyManager.archiveCurrentKey('jwt-1');
      await KeyManager.archiveCurrentKey('jwt-2');

      const count = await KeyManager.getKeyCount();
      expect(count).toBe(2);
    });
  });

  describe('clearAll', () => {
    it('should clear all previous keys', async () => {
      await KeyManager.archiveCurrentKey('jwt-1');
      await KeyManager.archiveCurrentKey('jwt-2');

      await KeyManager.clearAll();

      const keys = await KeyManager.getPreviousKeys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('deleteKey', () => {
    it('should delete key at specific index', async () => {
      await KeyManager.archiveCurrentKey('jwt-1');
      await KeyManager.archiveCurrentKey('jwt-2');
      await KeyManager.archiveCurrentKey('jwt-3');

      await KeyManager.deleteKey(1); // Delete middle key

      const keys = await KeyManager.getPreviousKeys();
      expect(keys).toHaveLength(2);
      expect(keys[0].key).toBe('jwt-3');
      expect(keys[1].key).toBe('jwt-1');
    });

    it('should handle out of bounds index gracefully', async () => {
      await KeyManager.archiveCurrentKey('jwt-1');

      await KeyManager.deleteKey(5);

      const keys = await KeyManager.getPreviousKeys();
      expect(keys).toHaveLength(1);
    });

    it('should handle negative index gracefully', async () => {
      await KeyManager.archiveCurrentKey('jwt-1');

      await KeyManager.deleteKey(-1);

      const keys = await KeyManager.getPreviousKeys();
      expect(keys).toHaveLength(1);
    });
  });

  describe('getKey', () => {
    it('should return key at specific index', async () => {
      await KeyManager.archiveCurrentKey('jwt-1');
      await KeyManager.archiveCurrentKey('jwt-2');

      const key = await KeyManager.getKey(0);
      expect(key.key).toBe('jwt-2');
    });

    it('should return null for out of bounds index', async () => {
      await KeyManager.archiveCurrentKey('jwt-1');

      const key = await KeyManager.getKey(5);
      expect(key).toBeNull();
    });
  });
});
