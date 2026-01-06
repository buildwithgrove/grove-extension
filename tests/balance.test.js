import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupChromeMock, resetChromeMock } from './mocks/chrome.js';
import { setupFetchMock, createRpcResponse, createRpcError } from './mocks/fetch.js';
import { loadBrowserScript } from './helpers/load-script.js';

let mockChrome;
let mockFetch;
let getEthBalance;
let getUsdcBalance;
let getBalances;
let getNetworkConfig;
let context;

beforeEach(() => {
  mockChrome = setupChromeMock();
  mockFetch = setupFetchMock();

  context = {
    window: {},
    console: console,
    chrome: mockChrome,
    fetch: global.fetch,
    BigInt: BigInt,
  };
  context.window = context;

  // Load dependencies
  loadBrowserScript('src/config/networks.js', context);

  // Load the real balance utilities
  loadBrowserScript('src/utils/balance.js', context);

  getNetworkConfig = context.getNetworkConfig;
  getEthBalance = context.getEthBalance;
  getUsdcBalance = context.getUsdcBalance;
  getBalances = context.getBalances;
});

afterEach(() => {
  mockFetch.reset();
  resetChromeMock(mockChrome);
});

describe('Balance Utilities', () => {
  const testAddress = '0x1234567890abcdef1234567890abcdef12345678';

  describe('getNetworkConfig', () => {
    it('should return base network config by default', async () => {
      const config = await getNetworkConfig();
      expect(config.name).toBe('Base');
      expect(config.chainId).toBe(8453);
    });

    it('should return stored network config', async () => {
      mockChrome.storage.local._setData({ groveChain: 'base-sepolia' });
      const config = await getNetworkConfig();
      expect(config.name).toBe('Base Sepolia');
      expect(config.chainId).toBe(84532);
    });

    it('should fallback to base for unknown chain', async () => {
      mockChrome.storage.local._setData({ groveChain: 'unknown' });
      const config = await getNetworkConfig();
      expect(config.name).toBe('Base');
    });
  });

  describe('getEthBalance', () => {
    it('should fetch and parse ETH balance', async () => {
      // Mock RPC response for eth_getBalance
      // 0x8ac7230489e80000 = 10 ETH in wei
      mockFetch.mockResponse('POST', 'https://mainnet.base.org', createRpcResponse('0x8ac7230489e80000'));

      const result = await getEthBalance(testAddress);

      expect(result.error).toBeNull();
      expect(result.balance).toBe(10);
      expect(result.formatted).toBe('10.000000');
    });

    it('should handle zero balance', async () => {
      mockFetch.mockResponse('POST', 'https://mainnet.base.org', createRpcResponse('0x0'));

      const result = await getEthBalance(testAddress);

      expect(result.balance).toBe(0);
      expect(result.formatted).toBe('0.000000');
    });

    it('should handle RPC errors', async () => {
      mockFetch.mockResponse('POST', 'https://mainnet.base.org', createRpcError('Connection failed'));

      const result = await getEthBalance(testAddress);

      expect(result.balance).toBe(0);
      expect(result.error).toBe('Connection failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockError('POST', 'https://mainnet.base.org', 'Network failure');

      const result = await getEthBalance(testAddress);

      expect(result.balance).toBe(0);
      expect(result.error).toBeTruthy();
    });
  });

  describe('getUsdcBalance', () => {
    it('should fetch and parse USDC balance', async () => {
      // Mock RPC response for eth_call (USDC balanceOf)
      // 0x5f5e100 = 100 USDC (100 * 10^6)
      mockFetch.mockResponse('POST', 'https://mainnet.base.org', createRpcResponse('0x5f5e100'));

      const result = await getUsdcBalance(testAddress);

      expect(result.error).toBeNull();
      expect(result.balance).toBe(100);
      expect(result.formatted).toBe('100.000000');
    });

    it('should handle zero USDC balance', async () => {
      mockFetch.mockResponse('POST', 'https://mainnet.base.org', createRpcResponse('0x0'));

      const result = await getUsdcBalance(testAddress);

      expect(result.balance).toBe(0);
      expect(result.formatted).toBe('0.000000');
    });

    it('should handle RPC errors', async () => {
      mockFetch.mockResponse('POST', 'https://mainnet.base.org', createRpcError('Contract call failed'));

      const result = await getUsdcBalance(testAddress);

      expect(result.balance).toBe(0);
      expect(result.error).toBe('Contract call failed');
    });
  });

  describe('getBalances', () => {
    it('should fetch both ETH and USDC balances and include network info', async () => {
      // Both calls go to same URL, mock returns same response
      mockFetch.mockResponse('POST', 'https://mainnet.base.org', createRpcResponse('0x5f5e100'));

      const result = await getBalances(testAddress);

      // Both return same mock value (100 in their respective units)
      expect(result.eth.error).toBeNull();
      expect(result.usdc.error).toBeNull();
      expect(result.network.name).toBe('Base');
      expect(result.network.chainId).toBe(8453);
    });
  });
});
