/**
 * API Utility
 * Handles communication with Grove backend
 */

class GroveAPI {
  static PROD_URL = 'https://api.grove.city';
  static LOCAL_URL = 'http://localhost:8000';
  static DEFAULT_TIP_AMOUNT = 0.05; // $0.05 default

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
    }
  };

  static GROVE_API_JWT = ''; // Placeholder for now

  /**
   * Get the base URL based on environment setting
   * @returns {Promise<string>} - Base URL
   */
  static async getBaseURL() {
    try {
      const result = await chrome.storage.local.get(['groveEnvironment']);
      const env = result.groveEnvironment || 'prod';
      return env === 'local' ? this.LOCAL_URL : this.PROD_URL;
    } catch (error) {
      console.log('[Grove Extension] Could not get environment, using prod');
      return this.PROD_URL;
    }
  }

  /**
   * Get the current chain configuration
   * @returns {Promise<Object>} - Chain configuration with RPC endpoints
   */
  static async getChainConfig() {
    try {
      const result = await chrome.storage.local.get(['groveChain']);
      const chain = result.groveChain || 'base';
      return this.CHAIN_RPC_ENDPOINTS[chain] || this.CHAIN_RPC_ENDPOINTS['base'];
    } catch (error) {
      console.log('[Grove Extension] Could not get chain, using base');
      return this.CHAIN_RPC_ENDPOINTS['base'];
    }
  }

  /**
   * Get the current chain's RPC URL
   * @returns {Promise<string>} - RPC URL for the selected chain
   */
  static async getRpcUrl() {
    const config = await this.getChainConfig();
    return config.rpcUrl;
  }

  /**
   * Get balance for an address on the current chain
   * @param {string} address - Wallet address
   * @returns {Promise<string>} - Balance in ETH
   */
  static async getBalance(address) {
    const rpcUrl = await this.getRpcUrl();
    const chainConfig = await this.getChainConfig();


    try {
      const response = await fetch(rpcUrl, {
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

      const balanceWei = BigInt(data.result);
      const balanceEth = Number(balanceWei) / 1e18;

      return balanceEth.toFixed(6);

    } catch (error) {
      console.error('[Grove Extension] Balance fetch failed:', error);
      throw error;
    }
  }

  /**
   * Build tip domain from current page URL
   * Simplifies the URL to a clean domain/path format
   * @param {string} url - Full URL (e.g., "https://twitter.com/olshansky")
   * @returns {string} - Formatted tip domain (e.g., "twitter.com/olshansky")
   */
  static buildTipDomainFromURL(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      const path = urlObj.pathname.replace(/\/$/, ''); // Remove trailing slash
      return `${domain}${path}`;
    } catch (error) {
      console.error('[Grove Extension] Invalid URL:', url);
      return url;
    }
  }

  /**
   * Send a tip to the current page URL
   * @param {string} pageUrl - Full page URL (e.g., "https://twitter.com/olshansky")
   * @param {number} tipAmount - Tip amount in dollars (default: 0.05)
   * @param {string} groveApiJwt - JWT token for authentication
   * @returns {Promise<Object>} - API response
   */
  static async sendTip(pageUrl, tipAmount = this.DEFAULT_TIP_AMOUNT, groveApiJwt = this.GROVE_API_JWT) {
    const baseURL = await this.getBaseURL();


    const tipDomain = this.buildTipDomainFromURL(pageUrl);

    const apiUrl = `${baseURL}/v1/tip/${encodeURIComponent(tipDomain)}/${tipAmount}`;


    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groveApiJwt}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `API request failed with status ${response.status}`);
      }

      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('[Grove Extension] Tip failed:', error);

      return {
        success: false,
        error: error.message
      };
    }
  }
}

if (typeof window !== 'undefined') {
  window.GroveAPI = GroveAPI;
}
