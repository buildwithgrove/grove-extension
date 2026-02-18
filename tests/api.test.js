import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupChromeMock, resetChromeMock } from './mocks/chrome.js';
import { setupFetchMock, createRpcResponse, createRpcError } from './mocks/fetch.js';
import { loadBrowserScript } from './helpers/load-script.js';

let GroveAPI;
let mockChrome;
let mockFetch;
let context;

beforeEach(() => {
  mockChrome = setupChromeMock();
  mockFetch = setupFetchMock();

  // Create context with mocks (simulate popup / chrome-extension:// context)
  context = {
    window: {},
    location: { protocol: 'chrome-extension:', hostname: 'mock-extension-id' },
    console: console,
    chrome: mockChrome,
    fetch: mockFetch.fetch,
    URL: URL,
    URLSearchParams: URLSearchParams,
    BigInt: BigInt, // Needed for balance calculation
    AbortController: AbortController,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  context.window = context;

  // Load dependencies, then the script under test
  loadBrowserScript('src/config/environments.js', context);
  loadBrowserScript('src/config/chains.js', context);
  loadBrowserScript('src/utils/api.js', context);

  GroveAPI = context.GroveAPI;
});

afterEach(() => {
  resetChromeMock(mockChrome);
  mockFetch.reset();
});

describe('GroveAPI', () => {
  describe('getBaseURL', () => {
    it('should return production URL by default', async () => {
      const url = await GroveAPI.getBaseURL();
      expect(url).toBe('https://api.grove.city');
    });

    it('should return production URL when environment is prod', async () => {
      mockChrome.storage.local._setData({ groveEnvironment: 'prod', groveEndpoint: 'testnet' });
      const url = await GroveAPI.getBaseURL();
      expect(url).toBe('https://api.grove.city');
    });

    it('should return testnet URL when environment is local and endpoint is testnet', async () => {
      mockChrome.storage.local._setData({ groveEnvironment: 'local', groveEndpoint: 'testnet' });
      const url = await GroveAPI.getBaseURL();
      expect(url).toBe('https://api.testnet.grove.city');
    });

    it('should return localhost URL when environment is local and endpoint is localhost', async () => {
      mockChrome.storage.local._setData({ groveEnvironment: 'local', groveEndpoint: 'localhost' });
      const url = await GroveAPI.getBaseURL();
      expect(url).toBe('http://localhost:8000');
    });
  });

  describe('getChainId', () => {
    it('should return base by default', async () => {
      const chainId = await GroveAPI.getChainId();
      expect(chainId).toBe('base');
    });

    it('should return stored chain ID', async () => {
      mockChrome.storage.local._setData({ groveChain: 'base-sepolia' });
      const chainId = await GroveAPI.getChainId();
      expect(chainId).toBe('base-sepolia');
    });
  });

  describe('getChainConfig', () => {
    it('should return Base config by default', async () => {
      const config = await GroveAPI.getChainConfig();
      expect(config.name).toBe('Base');
      expect(config.chainId).toBe(8453);
      expect(config.rpcUrl).toBe('https://mainnet.base.org');
    });

    it('should return Base Sepolia config when chain is base-sepolia', async () => {
      mockChrome.storage.local._setData({ groveChain: 'base-sepolia' });
      const config = await GroveAPI.getChainConfig();
      expect(config.name).toBe('Base Sepolia');
      expect(config.chainId).toBe(84532);
    });
  });

  describe('getRpcUrl', () => {
    it('should return RPC URL for current chain', async () => {
      const rpcUrl = await GroveAPI.getRpcUrl();
      expect(rpcUrl).toBe('https://mainnet.base.org');
    });
  });

  describe('getBalance', () => {
    it('should fetch and format balance correctly', async () => {
      // Mock RPC response for 1 ETH
      mockFetch.mockResponse('POST', 'https://mainnet.base.org',
        createRpcResponse('0xde0b6b3a7640000') // 1 ETH in wei
      );

      const balance = await GroveAPI.getBalance('0x1234567890123456789012345678901234567890');
      expect(balance).toBe('1.000000');
    });

    it('should handle RPC errors', async () => {
      mockFetch.mockResponse('POST', 'https://mainnet.base.org',
        createRpcError('Invalid address')
      );

      await expect(GroveAPI.getBalance('invalid')).rejects.toThrow('Invalid address');
    });

    it('should handle zero balance', async () => {
      mockFetch.mockResponse('POST', 'https://mainnet.base.org',
        createRpcResponse('0x0')
      );

      const balance = await GroveAPI.getBalance('0x1234567890123456789012345678901234567890');
      expect(balance).toBe('0.000000');
    });
  });

  describe('buildTipDomainFromURL', () => {
    it('should return non-URL identifiers as-is', () => {
      expect(GroveAPI.buildTipDomainFromURL('vitalik.eth')).toBe('vitalik.eth');
      expect(GroveAPI.buildTipDomainFromURL('name.base.eth')).toBe('name.base.eth');
    });

    it('should strip protocol and www from URLs', () => {
      expect(GroveAPI.buildTipDomainFromURL('https://twitter.com/user')).toBe('twitter.com/user');
      expect(GroveAPI.buildTipDomainFromURL('https://www.twitter.com/user')).toBe('twitter.com/user');
    });

    it('should preserve path', () => {
      expect(GroveAPI.buildTipDomainFromURL('https://x.com/olshansky')).toBe('x.com/olshansky');
    });

    it('should remove trailing slashes', () => {
      expect(GroveAPI.buildTipDomainFromURL('https://x.com/user/')).toBe('x.com/user');
    });

    it('should handle invalid URLs gracefully', () => {
      expect(GroveAPI.buildTipDomainFromURL('not a url')).toBe('not a url');
    });
  });

  describe('getAccount', () => {
    it('should fetch account successfully', async () => {
      const accountData = { address: '0x123', balance: '100' };
      mockFetch.mockResponse('GET', 'https://api.grove.city/v1/account', accountData);

      const result = await GroveAPI.getAccount('test-jwt');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(accountData);
      expect(mockFetch.expectCalled('GET', 'https://api.grove.city/v1/account')).toBe(true);
    });

    it('should handle auth errors', async () => {
      mockFetch.mockResponse('GET', 'https://api.grove.city/v1/account',
        { message: 'Unauthorized' },
        { status: 401 }
      );

      const result = await GroveAPI.getAccount('invalid-jwt');

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toBe('Unauthorized');
    });

    it('should handle network errors', async () => {
      mockFetch.mockError('GET', 'https://api.grove.city/v1/account', 'Network failure');

      const result = await GroveAPI.getAccount('test-jwt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
      expect(result.status).toBeNull();
    });
  });

  describe('sendTip', () => {
    it('should send tip successfully', async () => {
      const tipResponse = { tx_hash: '0xabc123', status: 'pending' };
      mockFetch.mockResponse('POST', 'https://api.grove.city/v1/tip', tipResponse);

      const result = await GroveAPI.sendTip('https://x.com/user', 0.10, 'test-jwt');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(tipResponse);
    });

    it('should include context when provided', async () => {
      mockFetch.mockHandler('POST', 'https://api.grove.city/v1/tip', (url, options) => {
        const body = JSON.parse(options.body);
        expect(body.context).toEqual({ source: 'test' });
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        };
      });

      await GroveAPI.sendTip('https://x.com/user', 0.10, 'test-jwt', { source: 'test' });
    });

    it('should handle insufficient balance error', async () => {
      mockFetch.mockResponse('POST', 'https://api.grove.city/v1/tip',
        { detail: { error: 'Insufficient balance' } },
        { status: 400 }
      );

      const result = await GroveAPI.sendTip('https://x.com/user', 1000, 'test-jwt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
    });

    it('should use default tip amount', async () => {
      mockFetch.mockHandler('POST', 'https://api.grove.city/v1/tip', (url, options) => {
        const body = JSON.parse(options.body);
        expect(body.amount).toBe('0.05');
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        };
      });

      await GroveAPI.sendTip('https://x.com/user', undefined, 'test-jwt');
    });
  });

  describe('getTopTippers', () => {
    it('should fetch top tippers successfully', async () => {
      const leaderboardData = {
        token: 'USDC',
        entries: [
          { address: '0x123', total_amount_usd: '100', tip_count: 50 },
          { address: '0x456', total_amount_usd: '75.5', tip_count: 30 },
        ]
      };
      mockFetch.mockResponse('GET', 'https://api.grove.city/v1/leaderboard/tippers?window=7d&limit=10', leaderboardData);

      const result = await GroveAPI.getTopTippers('week', 10);

      expect(result.success).toBe(true);
      expect(result.data.token).toBe('USDC');
      expect(result.data.entries).toHaveLength(2);
      expect(result.data.entries[0].totalUSD).toBe(100);
      expect(result.data.entries[0].tipCount).toBe(50);
    });

    it('should use correct time window for different periods', async () => {
      mockFetch.mockResponse('GET', 'https://api.grove.city/v1/leaderboard/tippers?window=24h&limit=10', { entries: [] });
      await GroveAPI.getTopTippers('day', 10);
      expect(mockFetch.expectCalled('GET', 'https://api.grove.city/v1/leaderboard/tippers?window=24h&limit=10')).toBe(true);

      mockFetch.reset();
      mockFetch.mockResponse('GET', 'https://api.grove.city/v1/leaderboard/tippers?window=30d&limit=10', { entries: [] });
      await GroveAPI.getTopTippers('month', 10);
      expect(mockFetch.expectCalled('GET', 'https://api.grove.city/v1/leaderboard/tippers?window=30d&limit=10')).toBe(true);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResponse('GET', 'https://api.grove.city/v1/leaderboard/tippers?window=7d&limit=10',
        { message: 'Server error' },
        { status: 500 }
      );

      const result = await GroveAPI.getTopTippers('week', 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });
  });

  describe('claimHandle', () => {
    it('should claim a handle successfully', async () => {
      const responseData = { handle: 'alice' };
      mockFetch.mockResponse('POST', 'https://api.grove.city/v1/account/handle', responseData);

      const result = await GroveAPI.claimHandle('alice', 'test-jwt');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(responseData);
      expect(mockFetch.expectCalled('POST', 'https://api.grove.city/v1/account/handle')).toBe(true);
    });

    it('should send handle in request body', async () => {
      mockFetch.mockHandler('POST', 'https://api.grove.city/v1/account/handle', (url, options) => {
        const body = JSON.parse(options.body);
        expect(body.handle).toBe('bob_123');
        expect(options.headers['Authorization']).toBe('Bearer my-jwt');
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({ handle: 'bob_123' })
        };
      });

      await GroveAPI.claimHandle('bob_123', 'my-jwt');
    });

    it('should handle 409 conflict (taken)', async () => {
      mockFetch.mockResponse('POST', 'https://api.grove.city/v1/account/handle',
        { message: 'Handle already taken' },
        { status: 409 }
      );

      const result = await GroveAPI.claimHandle('taken_name', 'test-jwt');

      expect(result.success).toBe(false);
      expect(result.status).toBe(409);
      expect(result.error).toBe('Handle already taken');
    });

    it('should handle 400 validation error', async () => {
      mockFetch.mockResponse('POST', 'https://api.grove.city/v1/account/handle',
        { message: 'Invalid handle format' },
        { status: 400 }
      );

      const result = await GroveAPI.claimHandle('ab', 'test-jwt');

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBe('Invalid handle format');
    });

    it('should handle network errors', async () => {
      mockFetch.mockError('POST', 'https://api.grove.city/v1/account/handle', 'Network failure');

      const result = await GroveAPI.claimHandle('alice', 'test-jwt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
      expect(result.status).toBeNull();
    });
  });

  describe('resolveDestination', () => {
    it('should return tippable result with addresses', async () => {
      mockFetch.mockResponse('GET', 'https://api.grove.city/v1/tip/resolve?destination=x.com%2Fvitalik',
        {
          tippable: true,
          addresses: [
            { address: '0x1234567890abcdef1234567890abcdef12345678', source: 'bio', token: 'USDC', chain: 'base' }
          ],
          source: 'x'
        },
        { status: 200 }
      );

      const result = await GroveAPI.resolveDestination('https://x.com/vitalik');

      expect(result.tippable).toBe(true);
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0].address).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(result.addresses[0].source).toBe('bio');
      expect(result.error).toBeNull();
    });

    it('should return not tippable when no addresses found', async () => {
      mockFetch.mockResponse('GET', 'https://api.grove.city/v1/tip/resolve?destination=x.com%2Fnoaddress',
        {
          tippable: false,
          addresses: []
        },
        { status: 200 }
      );

      const result = await GroveAPI.resolveDestination('https://x.com/noaddress');

      expect(result.tippable).toBe(false);
      expect(result.addresses).toHaveLength(0);
      expect(result.error).toBeNull();
    });

    it('should handle API errors', async () => {
      mockFetch.mockResponse('GET', 'https://api.grove.city/v1/tip/resolve?destination=invalid',
        { message: 'Invalid destination format' },
        { status: 400 }
      );

      const result = await GroveAPI.resolveDestination('invalid');

      expect(result.tippable).toBe(false);
      expect(result.addresses).toHaveLength(0);
      expect(result.error).toBe('Invalid destination format');
    });

    it('should handle network errors', async () => {
      mockFetch.mockError('GET', 'https://api.grove.city/v1/tip/resolve?destination=x.com%2Ftest', 'Network failure');
      mockFetch.mockError('POST', 'https://api.grove.city/v1/destination/resolve', 'Network failure');

      const result = await GroveAPI.resolveDestination('https://x.com/test');

      expect(result.tippable).toBe(false);
      expect(result.addresses).toHaveLength(0);
      expect(result.error).toBe('Network failure');
    });

    it('should strip trailing slash from URL', async () => {
      mockFetch.mockHandler('GET', 'https://api.grove.city/v1/tip/resolve?destination=x.com%2Folshansky', (url, options) => {
        expect(options.method).toBe('GET');
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({ tippable: true, addresses: [] })
        };
      });

      await GroveAPI.resolveDestination('https://x.com/olshansky/');
    });

    it('should return multiple addresses when available', async () => {
      mockFetch.mockResponse('GET', 'https://api.grove.city/v1/tip/resolve?destination=x.com%2Fvitalik',
        {
          tippable: true,
          addresses: [
            { address: 'vitalik.eth', source: 'ens', token: 'USDC', chain: 'base' },
            { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', source: 'resolved', token: 'USDC', chain: 'base' }
          ]
        },
        { status: 200 }
      );

      const result = await GroveAPI.resolveDestination('https://x.com/vitalik');

      expect(result.tippable).toBe(true);
      expect(result.addresses).toHaveLength(2);
      expect(result.addresses[0].address).toBe('vitalik.eth');
      expect(result.addresses[1].address).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    });

    it('should fallback to legacy resolve endpoint when new endpoint returns 404', async () => {
      mockFetch.mockResponse(
        'GET',
        'https://api.grove.city/v1/tip/resolve?destination=substack.com%2F%40olshansky',
        { detail: 'Not Found' },
        { status: 404 }
      );
      mockFetch.mockResponse(
        'POST',
        'https://api.grove.city/v1/destination/resolve',
        {
          tippable: true,
          addresses: [{ address: 'olshansky.eth', source: 'bio' }]
        },
        { status: 200 }
      );

      const result = await GroveAPI.resolveDestination('https://substack.com/@olshansky');

      expect(result.tippable).toBe(true);
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses[0].address).toBe('olshansky.eth');
    });
  });
});
