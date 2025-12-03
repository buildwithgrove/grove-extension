/**
 * API Utility
 * Handles communication with Grove backend
 */

class GroveAPI {
  static ENDPOINTS = {
    'production': 'https://api.grove.city',
    'testnet': 'https://api.testnet.grove.city',
    'localhost': 'http://localhost:8000',
    'localhost:8000': 'http://localhost:8000',
    'localhost:3000': 'http://localhost:3000',
  };

  static DEFAULT_TIP_AMOUNT = 0.05; // $0.05 default

  // TODO: Move ENS resolution to backend - this is a temporary frontend implementation
  // See GitHub issue for details. These public APIs have no SLA and may rate-limit.
  // ENS resolution APIs (round-robin with fallback)
  static ENS_APIS = [
    {
      name: 'ensdata',
      url: (name) => `https://api.ensdata.net/${name}`,
      parse: (data) => data?.address || null
    },
    {
      name: 'ensideas',
      url: (name) => `https://api.ensideas.com/ens/resolve/${name}`,
      parse: (data) => data?.address || null
    },
    {
      name: 'enstate',
      url: (name) => `https://enstate.rs/n/${name}`,
      parse: (data) => data?.address || null
    }
  ];

  static _ensApiIndex = 0; // Track current API for round-robin

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
   * Get the base URL based on endpoint setting
   * @returns {Promise<string>} - Base URL
   */
  static async getBaseURL() {
    try {
      const result = await chrome.storage.local.get(['groveEndpoint']);
      const endpoint = result.groveEndpoint || 'production';
      return this.ENDPOINTS[endpoint] || this.ENDPOINTS['production'];
    } catch (error) {
      console.log("[Grove Extension] Endpoint load failed, using production");
      return this.ENDPOINTS['production'];
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
      console.log("[Grove Extension] Chain config load failed, using Base");
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
   * Get account snapshot including balances
   * @param {string} groveApiJwt - JWT token for authentication
   * @returns {Promise<Object>} - Account data with balances
   */
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
        throw new Error(data.message || `API request failed with status ${response.status}`);
      }

      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('[Grove Extension] Account fetch failed:', error);
      return {
        success: false,
        error: error.message
      };
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

  /**
   * Resolve ENS name to EVM address
   * Uses round-robin across multiple APIs with fallback on failure
   *
   * TODO: Move to backend - frontend resolution is temporary. Backend should:
   * - Use ethers.js/viem with Alchemy/Infura for reliable resolution
   * - Cache results to reduce API calls
   * - Handle resolution in /v1/tip endpoint or add /v1/ens/resolve endpoint
   *
   * @param {string} ensName - ENS name (e.g., "vitalik.eth")
   * @returns {Promise<string|null>} - EVM address or null if not found
   */
  static async resolveENS(ensName) {
    if (!ensName || !ensName.endsWith('.eth')) {
      return null;
    }

    const normalizedName = ensName.toLowerCase().trim();
    const apis = this.ENS_APIS;
    const startIndex = this._ensApiIndex;

    // Try each API starting from current index (round-robin)
    for (let i = 0; i < apis.length; i++) {
      const apiIndex = (startIndex + i) % apis.length;
      const api = apis[apiIndex];

      try {
        const response = await fetch(api.url(normalizedName), {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          console.log(`[Grove Extension] ENS API ${api.name} returned ${response.status}`);
          continue;
        }

        const data = await response.json();
        const address = api.parse(data);

        if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
          // Update round-robin index for next call
          this._ensApiIndex = (apiIndex + 1) % apis.length;
          console.log(`[Grove Extension] 🔍 ENS lookup: ${normalizedName} -> ${address} (via ${api.name})`);
          return address;
        }
      } catch (error) {
        console.log(`[Grove Extension] ENS API ${api.name} failed:`, error.message);
        continue;
      }
    }

    console.error(`[Grove Extension] All ENS APIs failed for ${normalizedName}`);
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.GroveAPI = GroveAPI;
}
