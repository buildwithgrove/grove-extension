import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupChromeMock, resetChromeMock } from './mocks/chrome.js';
import { setupFetchMock, createRpcResponse, createRpcError } from './mocks/fetch.js';

let GroveAPI;
let mockChrome;
let mockFetch;

beforeEach(() => {
  mockChrome = setupChromeMock();
  mockFetch = setupFetchMock();

  // Create GroveAPI class for testing
  class TestGroveAPI {
    static ENDPOINTS = {
      'production': 'https://api.grove.city',
      'testnet': 'https://api.testnet.grove.city',
      'localhost': 'http://localhost:8000',
    };

    static DEFAULT_TIP_AMOUNT = 0.05;

    static CHAIN_RPC_ENDPOINTS = {
      'base': {
        name: 'Base',
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org',
        explorerUrl: 'https://basescan.org'
      },
      'base-sepolia': {
        name: 'Base Sepolia',
        chainId: 84532,
        rpcUrl: 'https://sepolia.base.org',
        explorerUrl: 'https://sepolia.basescan.org'
      },
    };

    static async getBaseURL() {
      try {
        const result = await chrome.storage.local.get(['groveEndpoint', 'groveEnvironment']);
        const env = result.groveEnvironment || 'prod';
        const storedEndpoint = result.groveEndpoint || 'production';
        const endpoint = env === 'local' ? storedEndpoint : 'production';
        return this.ENDPOINTS[endpoint] || this.ENDPOINTS['production'];
      } catch (error) {
        return this.ENDPOINTS['production'];
      }
    }

    static async getChainId() {
      try {
        const result = await chrome.storage.local.get(['groveChain']);
        return result.groveChain || 'base';
      } catch (error) {
        return 'base';
      }
    }

    static async getChainConfig() {
      const chain = await this.getChainId();
      return this.CHAIN_RPC_ENDPOINTS[chain] || this.CHAIN_RPC_ENDPOINTS['base'];
    }

    static async getRpcUrl() {
      const config = await this.getChainConfig();
      return config.rpcUrl;
    }

    static async getBalance(address) {
      const rpcUrl = await this.getRpcUrl();
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'RPC request failed');
      }

      const balanceWei = BigInt(data.result);
      const balanceEth = Number(balanceWei) / 1e18;
      return balanceEth.toFixed(6);
    }

    static buildTipDomainFromURL(url) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return url;
      }

      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace(/^www\./, '');
        const path = urlObj.pathname.replace(/\/$/, '');
        return `${domain}${path}`;
      } catch (error) {
        return url;
      }
    }

    static async getAccount(groveApiJwt) {
      const baseURL = await this.getBaseURL();
      const apiUrl = `${baseURL}/v1/account`;

      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${groveApiJwt}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.message || `API request failed with status ${response.status}`,
            status: response.status,
            data: data
          };
        }

        return { success: true, data: data, status: response.status };
      } catch (error) {
        return { success: false, error: error.message, status: null };
      }
    }

    static async sendTip(pageUrl, tipAmount = this.DEFAULT_TIP_AMOUNT, groveApiJwt = '', context = null) {
      const baseURL = await this.getBaseURL();
      const network = await this.getChainId();
      const tipDomain = this.buildTipDomainFromURL(pageUrl);
      const apiUrl = `${baseURL}/v1/tip`;

      const body = {
        destination: tipDomain,
        amount: String(tipAmount),
        network: network
      };

      if (context) {
        body.context = context;
      }

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groveApiJwt}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        let data = null;
        try {
          data = await response.json();
        } catch (parseError) {
          // Ignore parse errors
        }

        if (!response.ok) {
          const message = data?.detail?.error || data?.message || `API request failed with status ${response.status}`;
          return { success: false, error: message, status: response.status, data };
        }

        return { success: true, data: data, status: response.status };
      } catch (error) {
        return { success: false, error: error.message, status: null };
      }
    }

    static async getTopTippers(period = 'week', limit = 10) {
      const baseURL = await this.getBaseURL();
      const window = { 'day': '24h', 'week': '7d', 'month': '30d', 'all': 'all' }[period] || '7d';
      const apiUrl = `${baseURL}/v1/leaderboard/tippers?window=${window}&limit=${limit}`;

      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return {
          success: true,
          data: {
            token: data.token || 'USDC',
            entries: (data.entries || []).map(entry => ({
              address: entry.address,
              totalUSD: parseFloat(entry.total_amount_usd) || 0,
              tipCount: entry.tip_count || 0,
            }))
          }
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }

  GroveAPI = TestGroveAPI;
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
});
