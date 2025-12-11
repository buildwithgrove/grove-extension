/**
 * Fetch Mock Utilities
 * Provides mock implementations for fetch API
 */

import { vi } from 'vitest';

/**
 * Create a mock fetch response
 * @param {*} data - Response data
 * @param {Object} options - Response options
 * @returns {Object} Mock Response object
 */
export function createMockResponse(data, options = {}) {
  const { status = 200, ok = status >= 200 && status < 300, headers = {} } = options;

  return {
    ok,
    status,
    statusText: options.statusText || (ok ? 'OK' : 'Error'),
    headers: new Map(Object.entries(headers)),
    json: vi.fn(() => Promise.resolve(data)),
    text: vi.fn(() => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data))),
    clone: function() { return createMockResponse(data, options); },
  };
}

/**
 * Create a mock fetch function with configurable responses
 * @returns {Object} Mock fetch setup object
 */
export function createMockFetch() {
  const responses = new Map();
  let defaultResponse = createMockResponse({ error: 'No mock configured' }, { status: 404 });

  const mockFetch = vi.fn((url, options = {}) => {
    const method = options.method || 'GET';
    const key = `${method}:${url}`;

    // Check for exact URL match first
    if (responses.has(key)) {
      const handler = responses.get(key);
      return Promise.resolve(typeof handler === 'function' ? handler(url, options) : handler);
    }

    // Check for URL pattern matches
    for (const [pattern, handler] of responses) {
      if (pattern.startsWith('PATTERN:')) {
        const regex = new RegExp(pattern.slice(8));
        if (regex.test(url)) {
          return Promise.resolve(typeof handler === 'function' ? handler(url, options) : handler);
        }
      }
    }

    // Return default response
    return Promise.resolve(typeof defaultResponse === 'function' ? defaultResponse(url, options) : defaultResponse);
  });

  return {
    fetch: mockFetch,

    /**
     * Mock a specific URL + method combination
     * @param {string} method - HTTP method
     * @param {string} url - URL to mock
     * @param {*} response - Response data or function
     * @param {Object} options - Response options
     */
    mockResponse(method, url, response, options = {}) {
      const key = `${method}:${url}`;
      responses.set(key, createMockResponse(response, options));
    },

    /**
     * Mock URL pattern (regex)
     * @param {RegExp} pattern - URL pattern
     * @param {*} response - Response data or function
     * @param {Object} options - Response options
     */
    mockPattern(pattern, response, options = {}) {
      const key = `PATTERN:${pattern.source}`;
      responses.set(key, createMockResponse(response, options));
    },

    /**
     * Mock with a custom handler function
     * @param {string} method - HTTP method
     * @param {string} url - URL to mock
     * @param {Function} handler - Handler function (url, options) => Response
     */
    mockHandler(method, url, handler) {
      const key = `${method}:${url}`;
      responses.set(key, handler);
    },

    /**
     * Set default response for unmatched requests
     * @param {*} response - Response data
     * @param {Object} options - Response options
     */
    setDefault(response, options = {}) {
      defaultResponse = createMockResponse(response, options);
    },

    /**
     * Mock a fetch that throws an error
     * @param {string} method - HTTP method
     * @param {string} url - URL to mock
     * @param {Error|string} error - Error to throw
     */
    mockError(method, url, error) {
      const key = `${method}:${url}`;
      responses.set(key, () => {
        throw error instanceof Error ? error : new Error(error);
      });
    },

    /**
     * Clear all mocked responses
     */
    reset() {
      responses.clear();
      mockFetch.mockClear();
      defaultResponse = createMockResponse({ error: 'No mock configured' }, { status: 404 });
    },

    /**
     * Get all calls made to fetch
     */
    getCalls() {
      return mockFetch.mock.calls;
    },

    /**
     * Assert fetch was called with specific parameters
     */
    expectCalled(method, url) {
      const calls = mockFetch.mock.calls;
      const found = calls.some(([callUrl, options]) => {
        const callMethod = options?.method || 'GET';
        return callUrl === url && callMethod === method;
      });
      return found;
    },
  };
}

/**
 * Setup fetch mock in global scope
 * @returns {Object} Mock fetch utilities
 */
export function setupFetchMock() {
  const mockFetchUtils = createMockFetch();
  global.fetch = mockFetchUtils.fetch;
  return mockFetchUtils;
}

/**
 * Create mock RPC response (for Ethereum JSON-RPC calls)
 * @param {*} result - RPC result
 * @param {number} id - Request ID
 * @returns {Object} RPC response object
 */
export function createRpcResponse(result, id = 1) {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

/**
 * Create mock RPC error response
 * @param {string} message - Error message
 * @param {number} code - Error code
 * @param {number} id - Request ID
 * @returns {Object} RPC error response
 */
export function createRpcError(message, code = -32000, id = 1) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  };
}
