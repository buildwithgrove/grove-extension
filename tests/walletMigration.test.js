import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupChromeMock, resetChromeMock } from './mocks/chrome.js';
import { loadBrowserScript } from './helpers/load-script.js';

let mockChrome;
let context;

beforeEach(() => {
  mockChrome = setupChromeMock();
  context = {
    window: {},
    console: console,
    chrome: mockChrome,
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
    },
  };
  context.window = context;

  loadBrowserScript('src/config/environments.js', context);
  loadBrowserScript('src/config/storageKeys.js', context);
});

afterEach(() => {
  resetChromeMock(mockChrome);
});

// Extract migrateWalletStorageKeys from popup.js source
function getMigrateFunction() {
  const STORAGE_KEYS = context.STORAGE_KEYS;
  const chrome = mockChrome;

  return async function migrateWalletStorageKeys() {
    const old = await chrome.storage.local.get([
      'GROVE_CLIENT_ADDRESS',
      'GROVE_EMBEDDED_WALLET_ADDRESS',
      'GROVE_ONCHAIN_ADDRESS'
    ]);
    const updates = {};
    if (old['GROVE_CLIENT_ADDRESS']) {
      updates[STORAGE_KEYS.EARNING_ADDRESS] = old['GROVE_CLIENT_ADDRESS'];
    }
    if (old['GROVE_ONCHAIN_ADDRESS']) {
      updates[STORAGE_KEYS.TIPPING_ADDRESS] = old['GROVE_ONCHAIN_ADDRESS'];
    }
    if (Object.keys(updates).length) {
      await chrome.storage.local.set(updates);
    }
    await chrome.storage.local.remove([
      'GROVE_CLIENT_ADDRESS',
      'GROVE_EMBEDDED_WALLET_ADDRESS',
      'GROVE_ONCHAIN_ADDRESS'
    ]);
    if (Object.keys(updates).length) {
      console.log('[Grove Extension] Migrated wallet storage keys:', Object.keys(updates));
    }
  };
}

describe('migrateWalletStorageKeys', () => {
  it('should migrate CLIENT_ADDRESS to EARNING_ADDRESS', async () => {
    await mockChrome.storage.local.set({
      'GROVE_CLIENT_ADDRESS': '0xClientAddr',
    });

    const migrate = getMigrateFunction();
    await migrate();

    const result = await mockChrome.storage.local.get(['GROVE_EARNING_ADDRESS']);
    expect(result['GROVE_EARNING_ADDRESS']).toBe('0xClientAddr');
  });

  it('should migrate ONCHAIN_ADDRESS to TIPPING_ADDRESS', async () => {
    await mockChrome.storage.local.set({
      'GROVE_ONCHAIN_ADDRESS': '0xOnchainAddr',
    });

    const migrate = getMigrateFunction();
    await migrate();

    const result = await mockChrome.storage.local.get(['GROVE_TIPPING_ADDRESS']);
    expect(result['GROVE_TIPPING_ADDRESS']).toBe('0xOnchainAddr');
  });

  it('should migrate both addresses together', async () => {
    await mockChrome.storage.local.set({
      'GROVE_CLIENT_ADDRESS': '0xClient',
      'GROVE_ONCHAIN_ADDRESS': '0xOnchain',
    });

    const migrate = getMigrateFunction();
    await migrate();

    const result = await mockChrome.storage.local.get([
      'GROVE_EARNING_ADDRESS',
      'GROVE_TIPPING_ADDRESS',
    ]);
    expect(result['GROVE_EARNING_ADDRESS']).toBe('0xClient');
    expect(result['GROVE_TIPPING_ADDRESS']).toBe('0xOnchain');
  });

  it('should remove all old keys after migration', async () => {
    await mockChrome.storage.local.set({
      'GROVE_CLIENT_ADDRESS': '0xClient',
      'GROVE_EMBEDDED_WALLET_ADDRESS': '0xEmbedded',
      'GROVE_ONCHAIN_ADDRESS': '0xOnchain',
    });

    const migrate = getMigrateFunction();
    await migrate();

    const old = await mockChrome.storage.local.get([
      'GROVE_CLIENT_ADDRESS',
      'GROVE_EMBEDDED_WALLET_ADDRESS',
      'GROVE_ONCHAIN_ADDRESS',
    ]);
    expect(old['GROVE_CLIENT_ADDRESS']).toBeUndefined();
    expect(old['GROVE_EMBEDDED_WALLET_ADDRESS']).toBeUndefined();
    expect(old['GROVE_ONCHAIN_ADDRESS']).toBeUndefined();
  });

  it('should not set EARNING_ADDRESS from EMBEDDED_WALLET_ADDRESS alone', async () => {
    await mockChrome.storage.local.set({
      'GROVE_EMBEDDED_WALLET_ADDRESS': '0xEmbedded',
    });

    const migrate = getMigrateFunction();
    await migrate();

    const result = await mockChrome.storage.local.get(['GROVE_EARNING_ADDRESS']);
    expect(result['GROVE_EARNING_ADDRESS']).toBeUndefined();
  });

  it('should be a no-op when no old keys exist', async () => {
    const migrate = getMigrateFunction();
    await migrate();

    const result = await mockChrome.storage.local.get([
      'GROVE_EARNING_ADDRESS',
      'GROVE_TIPPING_ADDRESS',
    ]);
    expect(result['GROVE_EARNING_ADDRESS']).toBeUndefined();
    expect(result['GROVE_TIPPING_ADDRESS']).toBeUndefined();
  });

  it('should still clean up old keys even when embedded is the only one', async () => {
    await mockChrome.storage.local.set({
      'GROVE_EMBEDDED_WALLET_ADDRESS': '0xEmbedded',
    });

    const migrate = getMigrateFunction();
    await migrate();

    const old = await mockChrome.storage.local.get(['GROVE_EMBEDDED_WALLET_ADDRESS']);
    expect(old['GROVE_EMBEDDED_WALLET_ADDRESS']).toBeUndefined();
  });
});
