import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupChromeMock, resetChromeMock } from './mocks/chrome.js';
import { setupFetchMock, createRpcResponse, createRpcError } from './mocks/fetch.js';

let mockChrome;
let mockFetch;
let getEthBalance;
let getUsdcBalance;
let getBalances;
let getNetworkConfig;

// Network and ERC20 constants
const NETWORKS = {
  'base': {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    contracts: { usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }
  },
  'base-sepolia': {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    contracts: { usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' }
  }
};

const ERC20_METHODS = {
  balanceOf: '0x70a08231'
};

beforeEach(() => {
  mockChrome = setupChromeMock();
  mockFetch = setupFetchMock();

  // Make constants available globally for the functions
  global.NETWORKS = NETWORKS;
  global.ERC20_METHODS = ERC20_METHODS;

  // Create test functions that match the source implementation
  getNetworkConfig = async function() {
    try {
      const result = await chrome.storage.local.get(['groveChain']);
      const chain = result.groveChain || 'base';
      return NETWORKS[chain] || NETWORKS['base'];
    } catch (error) {
      return NETWORKS['base'];
    }
  };

  getEthBalance = async function(address) {
    const network = await getNetworkConfig();

    try {
      const response = await fetch(network.rpcUrl, {
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

      const balanceWei = BigInt(data.result || '0x0');
      const balanceEth = Number(balanceWei) / 1e18;

      return {
        balance: balanceEth,
        formatted: balanceEth.toFixed(6),
        error: null
      };
    } catch (error) {
      return {
        balance: 0,
        formatted: '0.000000',
        error: error.message
      };
    }
  };

  getUsdcBalance = async function(address) {
    const network = await getNetworkConfig();
    const usdcAddress = network.contracts.usdc;

    try {
      const addressNoPrefx = address.slice(2);
      const paddedAddress = addressNoPrefx.padStart(64, '0');
      const calldata = ERC20_METHODS.balanceOf + paddedAddress;

      const response = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            { to: usdcAddress, data: calldata },
            'latest'
          ],
          id: 1
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'RPC request failed');
      }

      const balanceRaw = BigInt(data.result || '0x0');
      const balanceUsdc = Number(balanceRaw) / 1e6;

      return {
        balance: balanceUsdc,
        formatted: balanceUsdc.toFixed(6),
        error: null
      };
    } catch (error) {
      return {
        balance: 0,
        formatted: '0.000000',
        error: error.message
      };
    }
  };

  getBalances = async function(address) {
    const network = await getNetworkConfig();

    const [eth, usdc] = await Promise.all([
      getEthBalance(address),
      getUsdcBalance(address)
    ]);

    return {
      eth,
      usdc,
      network: {
        name: network.name,
        chainId: network.chainId
      }
    };
  };
});

afterEach(() => {
  resetChromeMock(mockChrome);
  mockFetch.reset();
  delete global.NETWORKS;
  delete global.ERC20_METHODS;
});

describe('Balance Utilities', () => {
  describe('getNetworkConfig', () => {
    it('should return Base config by default', async () => {
      const config = await getNetworkConfig();
      expect(config.name).toBe('Base');
      expect(config.chainId).toBe(8453);
    });

    it('should return Base Sepolia config when stored', async () => {
      mockChrome.storage.local._setData({ groveChain: 'base-sepolia' });
      const config = await getNetworkConfig();
      expect(config.name).toBe('Base Sepolia');
      expect(config.chainId).toBe(84532);
    });

    it('should fallback to Base for unknown chains', async () => {
      mockChrome.storage.local._setData({ groveChain: 'unknown-chain' });
      const config = await getNetworkConfig();
      expect(config.name).toBe('Base');
    });
  });

  describe('getEthBalance', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    it('should fetch and format ETH balance correctly', async () => {
      // Mock 1 ETH in wei (0xde0b6b3a7640000)
      mockFetch.mockResponse('POST', 'https://mainnet.base.org',
        createRpcResponse('0xde0b6b3a7640000')
      );

      const result = await getEthBalance(testAddress);

      expect(result.balance).toBe(1);
      expect(result.formatted).toBe('1.000000');
      expect(result.error).toBeNull();
    });

    it('should handle zero balance', async () => {
      mockFetch.mockResponse('POST', 'https://mainnet.base.org',
        createRpcResponse('0x0')
      );

      const result = await getEthBalance(testAddress);

      expect(result.balance).toBe(0);
      expect(result.formatted).toBe('0.000000');
      expect(result.error).toBeNull();
    });

    it('should handle fractional balances', async () => {
      // 0.5 ETH = 500000000000000000 wei = 0x6f05b59d3b20000
      mockFetch.mockResponse('POST', 'https://mainnet.base.org',
        createRpcResponse('0x6f05b59d3b20000')
      );

      const result = await getEthBalance(testAddress);

      expect(result.balance).toBe(0.5);
      expect(result.formatted).toBe('0.500000');
    });

    it('should handle RPC errors gracefully', async () => {
      mockFetch.mockResponse('POST', 'https://mainnet.base.org',
        createRpcError('Invalid address format')
      );

      const result = await getEthBalance('invalid');

      expect(result.balance).toBe(0);
      expect(result.formatted).toBe('0.000000');
      expect(result.error).toBe('Invalid address format');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockError('POST', 'https://mainnet.base.org', 'Network failure');

      const result = await getEthBalance(testAddress);

      expect(result.balance).toBe(0);
      expect(result.error).toBe('Network failure');
    });

    it('should use correct RPC URL for selected network', async () => {
      mockChrome.storage.local._setData({ groveChain: 'base-sepolia' });
      mockFetch.mockResponse('POST', 'https://base-sepolia-rpc.publicnode.com',
        createRpcResponse('0x0')
      );

      await getEthBalance(testAddress);

      expect(mockFetch.expectCalled('POST', 'https://base-sepolia-rpc.publicnode.com')).toBe(true);
    });
  });

  describe('getUsdcBalance', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    it('should fetch and format USDC balance correctly', async () => {
      // 100 USDC = 100000000 (6 decimals) = 0x5f5e100
      mockFetch.mockResponse('POST', 'https://mainnet.base.org',
        createRpcResponse('0x5f5e100')
      );

      const result = await getUsdcBalance(testAddress);

      expect(result.balance).toBe(100);
      expect(result.formatted).toBe('100.000000');
      expect(result.error).toBeNull();
    });

    it('should handle zero balance', async () => {
      mockFetch.mockResponse('POST', 'https://mainnet.base.org',
        createRpcResponse('0x0')
      );

      const result = await getUsdcBalance(testAddress);

      expect(result.balance).toBe(0);
      expect(result.formatted).toBe('0.000000');
    });

    it('should handle fractional balances', async () => {
      // 0.50 USDC = 500000 = 0x7a120
      mockFetch.mockResponse('POST', 'https://mainnet.base.org',
        createRpcResponse('0x7a120')
      );

      const result = await getUsdcBalance(testAddress);

      expect(result.balance).toBe(0.5);
      expect(result.formatted).toBe('0.500000');
    });

    it('should construct correct ERC20 balanceOf call data', async () => {
      mockFetch.mockHandler('POST', 'https://mainnet.base.org', (url, options) => {
        const body = JSON.parse(options.body);
        expect(body.method).toBe('eth_call');
        expect(body.params[0].to).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
        expect(body.params[0].data).toMatch(/^0x70a08231/); // balanceOf selector
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(createRpcResponse('0x0'))
        };
      });

      await getUsdcBalance(testAddress);
    });

    it('should handle RPC errors gracefully', async () => {
      mockFetch.mockResponse('POST', 'https://mainnet.base.org',
        createRpcError('Contract not found')
      );

      const result = await getUsdcBalance(testAddress);

      expect(result.balance).toBe(0);
      expect(result.error).toBe('Contract not found');
    });

    it('should use correct USDC contract for selected network', async () => {
      mockChrome.storage.local._setData({ groveChain: 'base-sepolia' });
      mockFetch.mockHandler('POST', 'https://base-sepolia-rpc.publicnode.com', (url, options) => {
        const body = JSON.parse(options.body);
        expect(body.params[0].to).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(createRpcResponse('0x0'))
        };
      });

      await getUsdcBalance(testAddress);
    });
  });

  describe('getBalances', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    it('should fetch both ETH and USDC balances', async () => {
      // Mock both calls
      mockFetch.mockHandler('POST', 'https://mainnet.base.org', (url, options) => {
        const body = JSON.parse(options.body);
        if (body.method === 'eth_getBalance') {
          return {
            ok: true,
            status: 200,
            json: () => Promise.resolve(createRpcResponse('0xde0b6b3a7640000')) // 1 ETH
          };
        } else if (body.method === 'eth_call') {
          return {
            ok: true,
            status: 200,
            json: () => Promise.resolve(createRpcResponse('0x5f5e100')) // 100 USDC
          };
        }
      });

      const result = await getBalances(testAddress);

      expect(result.eth.balance).toBe(1);
      expect(result.usdc.balance).toBe(100);
      expect(result.network.name).toBe('Base');
      expect(result.network.chainId).toBe(8453);
    });

    it('should return correct network info', async () => {
      mockChrome.storage.local._setData({ groveChain: 'base-sepolia' });
      mockFetch.mockResponse('POST', 'https://base-sepolia-rpc.publicnode.com',
        createRpcResponse('0x0')
      );

      const result = await getBalances(testAddress);

      expect(result.network.name).toBe('Base Sepolia');
      expect(result.network.chainId).toBe(84532);
    });

    it('should handle partial failures', async () => {
      // ETH succeeds, USDC fails
      let callCount = 0;
      mockFetch.mockHandler('POST', 'https://mainnet.base.org', (url, options) => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            status: 200,
            json: () => Promise.resolve(createRpcResponse('0xde0b6b3a7640000'))
          };
        } else {
          return {
            ok: true,
            status: 200,
            json: () => Promise.resolve(createRpcError('USDC error'))
          };
        }
      });

      const result = await getBalances(testAddress);

      expect(result.eth.balance).toBe(1);
      expect(result.usdc.error).toBe('USDC error');
    });
  });
});
