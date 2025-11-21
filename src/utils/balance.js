/**
 * Balance Utilities
 * Helper functions for querying ETH and token balances on different networks
 */

/**
 * Get the current selected network configuration
 * @returns {Promise<Object>} - Network configuration
 */
async function getNetworkConfig() {
  try {
    const result = await chrome.storage.local.get(['groveChain']);
    const chain = result.groveChain || 'base';
    return NETWORKS[chain] || NETWORKS['base'];
  } catch (error) {
    console.error('[Grove Extension] Error getting network config:', error);
    return NETWORKS['base'];
  }
}

/**
 * Get ETH balance for an address on the current network
 * @param {string} address - Wallet address (0x...)
 * @returns {Promise<Object>} - { balance: string, formatted: string, error: string|null }
 */
async function getEthBalance(address) {
  const network = await getNetworkConfig();


  try {
    const response = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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

    // Convert from wei to ETH
    const balanceWei = BigInt(data.result || '0x0');
    const balanceEth = Number(balanceWei) / 1e18;


    return {
      balance: balanceEth,
      formatted: balanceEth.toFixed(6),
      error: null
    };

  } catch (error) {
    console.error('[Grove Extension] ETH balance fetch failed:', error);
    return {
      balance: 0,
      formatted: '0.000000',
      error: error.message
    };
  }
}

/**
 * Get USDC balance for an address on the current network
 * @param {string} address - Wallet address (0x...)
 * @returns {Promise<Object>} - { balance: string, formatted: string, error: string|null }
 */
async function getUsdcBalance(address) {
  const network = await getNetworkConfig();
  const usdcAddress = network.contracts.usdc;


  try {
    // Prepare calldata for balanceOf(address)
    // Remove 0x prefix and pad to 64 characters
    const addressNoPrefx = address.slice(2);
    const paddedAddress = addressNoPrefx.padStart(64, '0');
    const calldata = ERC20_METHODS.balanceOf + paddedAddress;

    const response = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: usdcAddress,
            data: calldata
          },
          'latest'
        ],
        id: 1
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'RPC request failed');
    }

    // Convert from smallest unit to USDC (6 decimals)
    const balanceRaw = BigInt(data.result || '0x0');
    const balanceUsdc = Number(balanceRaw) / 1e6;


    return {
      balance: balanceUsdc,
      formatted: balanceUsdc.toFixed(6),
      error: null
    };

  } catch (error) {
    console.error('[Grove Extension] USDC balance fetch failed:', error);
    return {
      balance: 0,
      formatted: '0.000000',
      error: error.message
    };
  }
}

/**
 * Get both ETH and USDC balances for an address on the current network
 * @param {string} address - Wallet address (0x...)
 * @returns {Promise<Object>} - { eth: Object, usdc: Object, network: Object }
 */
async function getBalances(address) {
  const network = await getNetworkConfig();


  // Fetch both balances in parallel
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
}

if (typeof window !== 'undefined') {
  window.getEthBalance = getEthBalance;
  window.getUsdcBalance = getUsdcBalance;
  window.getBalances = getBalances;
  window.getNetworkConfig = getNetworkConfig;
}
