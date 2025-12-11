/**
 * Chrome Extension API Mock
 * Provides mock implementations for Chrome APIs used by the extension
 */

import { vi } from 'vitest';

/**
 * Create a mock Chrome storage implementation
 * @returns {Object} Mock chrome.storage.local
 */
export function createMockStorage() {
  let store = {};

  return {
    get: vi.fn((keys) => {
      return new Promise((resolve) => {
        if (keys === null || keys === undefined) {
          resolve({ ...store });
        } else if (typeof keys === 'string') {
          resolve({ [keys]: store[keys] });
        } else if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(key => {
            if (store[key] !== undefined) {
              result[key] = store[key];
            }
          });
          resolve(result);
        } else {
          // keys is an object with default values
          const result = {};
          Object.keys(keys).forEach(key => {
            result[key] = store[key] !== undefined ? store[key] : keys[key];
          });
          resolve(result);
        }
      });
    }),

    set: vi.fn((items) => {
      return new Promise((resolve) => {
        Object.assign(store, items);
        resolve();
      });
    }),

    remove: vi.fn((keys) => {
      return new Promise((resolve) => {
        if (typeof keys === 'string') {
          delete store[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(key => delete store[key]);
        }
        resolve();
      });
    }),

    clear: vi.fn(() => {
      return new Promise((resolve) => {
        store = {};
        resolve();
      });
    }),

    // Helper to set initial data for tests
    _setData: (data) => {
      store = { ...data };
    },

    // Helper to get current data for assertions
    _getData: () => ({ ...store }),

    // Helper to reset store
    _reset: () => {
      store = {};
    }
  };
}

/**
 * Create a mock Chrome runtime implementation
 * @returns {Object} Mock chrome.runtime
 */
export function createMockRuntime() {
  return {
    id: 'mock-extension-id',
    lastError: null,
    getURL: vi.fn((path) => `chrome-extension://mock-extension-id/${path}`),
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  };
}

/**
 * Create a mock Chrome identity implementation
 * @returns {Object} Mock chrome.identity
 */
export function createMockIdentity() {
  return {
    launchWebAuthFlow: vi.fn((options, callback) => {
      // By default, simulate a successful auth flow
      // Tests can override this behavior
      setTimeout(() => {
        callback('https://mock-redirect.com/callback?code=mock-code&state=mock-state');
      }, 0);
    }),
  };
}

/**
 * Create a complete mock Chrome API object
 * @returns {Object} Mock chrome global
 */
export function createMockChrome() {
  const storage = createMockStorage();

  return {
    storage: {
      local: storage,
      sync: createMockStorage(),
    },
    runtime: createMockRuntime(),
    identity: createMockIdentity(),
  };
}

/**
 * Setup Chrome mock in global scope
 * @returns {Object} The mock chrome object for test manipulation
 */
export function setupChromeMock() {
  const mockChrome = createMockChrome();
  global.chrome = mockChrome;
  return mockChrome;
}

/**
 * Reset all Chrome mock state
 * @param {Object} mockChrome - The mock chrome object
 */
export function resetChromeMock(mockChrome) {
  mockChrome.storage.local._reset();
  mockChrome.storage.sync._reset();
  vi.clearAllMocks();
}
