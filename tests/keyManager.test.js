import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupChromeMock, resetChromeMock } from './mocks/chrome.js';
import { loadBrowserScript } from './helpers/load-script.js';

let KeyManager;
let ENV_CONFIG;
let mockChrome;
let context;

const STORAGE_KEY_PREV = 'GROVE_PREV_JWTS';
const LEGACY_JWT_KEY = 'GROVE_API_JWT';
const MAX_KEYS = 10;

beforeEach(() => {
  mockChrome = setupChromeMock();

  context = {
    window: {},
    console: console,
    chrome: mockChrome,
  };
  context.window = context;

  // Load dependencies, then the real KeyManager
  loadBrowserScript('src/config/environments.js', context);
  loadBrowserScript('src/storage/keyManager.js', context);
  KeyManager = context.KeyManager;
  ENV_CONFIG = context.ENV_CONFIG;
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
      expect(config.appUrl).toBe('https://app.grove.city/extension');
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
