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
  };

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
    },
    'solana': {
      name: 'Solana',
      chainId: null,
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      explorerUrl: 'https://explorer.solana.com'
    },
    'solana-devnet': {
      name: 'Solana Devnet',
      chainId: null,
      rpcUrl: 'https://api.devnet.solana.com',
      explorerUrl: 'https://explorer.solana.com?cluster=devnet'
    }
  };

  static GROVE_API_JWT = ''; // Placeholder for now

  /**
   * Get the base URL based on endpoint setting
   * @returns {Promise<string>} - Base URL
   */
  static async getBaseURL() {
    try {
      const result = await chrome.storage.local.get(['groveEndpoint', 'groveEnvironment']);
      const env = result.groveEnvironment || 'prod';
      const storedEndpoint = result.groveEndpoint || 'production';
      const endpoint = env === 'local' ? storedEndpoint : 'production';
      return this.ENDPOINTS[endpoint] || this.ENDPOINTS['production'];
    } catch (error) {
      console.log("[Grove Extension] Endpoint load failed, using production");
      return this.ENDPOINTS['production'];
    }
  }

  /**
   * Get the current chain ID (e.g., 'base', 'base-sepolia')
   * @returns {Promise<string>} - Chain ID string
   */
  static async getChainId() {
    try {
      const result = await chrome.storage.local.get(['groveChain']);
      return result.groveChain || 'base';
    } catch (error) {
      console.log("[Grove Extension] Chain ID load failed, using base");
      return 'base';
    }
  }

  /**
   * Get the current chain configuration
   * @returns {Promise<Object>} - Chain configuration with RPC endpoints
   */
  static async getChainConfig() {
    const chain = await this.getChainId();
    return this.CHAIN_RPC_ENDPOINTS[chain] || this.CHAIN_RPC_ENDPOINTS['base'];
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
   * Build tip domain from current page URL or identifier
   * Simplifies the URL to a clean domain/path format
   * @param {string} url - Full URL (e.g., "https://twitter.com/olshansky") or identifier (e.g., "vitalik.eth")
   * @returns {string} - Formatted tip domain (e.g., "twitter.com/olshansky") or original identifier
   */
  static buildTipDomainFromURL(url) {
    // If it's already a non-URL identifier (ENS name, etc.), return as-is
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url;
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');

      // YouTube URL handling commented out - X only for now
      // Handle YouTube URLs specially - extract video ID from query param
      // if (domain === 'youtube.com' && urlObj.pathname === '/watch') {
      //   const videoId = urlObj.searchParams.get('v');
      //   if (videoId) {
      //     return `youtube.com/${videoId}`;
      //   }
      // }

      // Handle youtu.be short URLs
      // if (domain === 'youtu.be') {
      //   const videoId = urlObj.pathname.slice(1); // Remove leading slash
      //   if (videoId) {
      //     return `youtube.com/${videoId}`;
      //   }
      // }

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
   * Fetch top tippers leaderboard
   * @param {string} period - Time window: 'day', 'week', 'month', or 'all'
   * @param {number} limit - Number of entries (default: 10)
   * @returns {Promise<Object>} - Leaderboard data
   */
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
            lastTipDestination: entry.last_tip_destination,
            lastTipSocialGraph: entry.last_tip_social_graph,
            lastTipContext: entry.last_tip_context
          }))
        }
      };
    } catch (error) {
      console.error('[Grove Extension] Top tippers fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch top earners leaderboard
   * @param {string} period - Time window: 'day', 'week', 'month', or 'all'
   * @param {number} limit - Number of entries (default: 10)
   * @returns {Promise<Object>} - Leaderboard data
   */
  static async getTopEarners(period = 'week', limit = 10) {
    const baseURL = await this.getBaseURL();
    const window = { 'day': '24h', 'week': '7d', 'month': '30d', 'all': 'all' }[period] || '7d';
    const apiUrl = `${baseURL}/v1/leaderboard/tippees?window=${window}&limit=${limit}`;

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
            lastTipDestination: entry.last_tip_destination,
            lastTipSocialGraph: entry.last_tip_social_graph,
            lastTipContext: entry.last_tip_context
          }))
        }
      };
    } catch (error) {
      console.error('[Grove Extension] Top earners fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch recent tips (real-time)
   * Fetches both tippees and tippers endpoints and merges them (like the website)
   * @param {number} limit - Number of entries (default: 10)
   * @returns {Promise<Object>} - Recent tips data with tipper info
   */
  static async getRecentTips(limit = 10) {
    const baseURL = await this.getBaseURL();
    const tippeesUrl = `${baseURL}/v1/leaderboard/tippees/recent?limit=${limit}`;
    const tippersUrl = `${baseURL}/v1/leaderboard/tippers/recent?limit=${limit}`;

    try {
      // Fetch both endpoints in parallel (like the website)
      const [tippeesRes, tippersRes] = await Promise.all([
        fetch(tippeesUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } }),
        fetch(tippersUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      ]);

      if (!tippeesRes.ok) {
        throw new Error(`Tippees API request failed with status ${tippeesRes.status}`);
      }

      const tippeesData = await tippeesRes.json();

      // Build a map of tx_hash -> tipper info
      let tippersMap = new Map();
      if (tippersRes.ok) {
        const tippersData = await tippersRes.json();
        (tippersData.entries || []).forEach(entry => {
          tippersMap.set(entry.tx_hash, {
            address: entry.address,
            context: entry.context
          });
        });
      }

      // Merge tipper data into tippee entries
      return {
        success: true,
        data: {
          entries: (tippeesData.entries || []).map(entry => {
            const tipperInfo = tippersMap.get(entry.tx_hash) || {};
            return {
              address: entry.address,
              destination: entry.destination || null,
              amountUSD: parseFloat(entry.amount_usd) || 0,
              confirmedAt: entry.confirmed_at,
              txHash: entry.tx_hash,
              network: entry.network || null,
              tipperAddress: tipperInfo.address || null,
              context: entry.context || tipperInfo.context || null
            };
          })
        }
      };
    } catch (error) {
      console.error('[Grove Extension] Recent tips fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch total funds/deposits stats
   * @returns {Promise<Object>} - Total funds data
   */
  static async getFundsTotal() {
    const baseURL = await this.getBaseURL();
    const apiUrl = `${baseURL}/v1/leaderboard/funds/total`;

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
          totalUSD: parseFloat(data.total_amount_usd) || 0,
          totalFundCount: data.total_fund_count || 0,
          uniqueAccountCount: data.unique_account_count || 0
        }
      };
    } catch (error) {
      console.error('[Grove Extension] Funds total fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch total tips stats
   * @returns {Promise<Object>} - Total tips data
   */
  static async getTipsTotal() {
    const baseURL = await this.getBaseURL();
    const apiUrl = `${baseURL}/v1/leaderboard/tips/total`;

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
          totalUSD: parseFloat(data.total_amount_usd) || 0,
          totalTipCount: data.total_tip_count || 0,
          uniqueTipperCount: data.unique_tipper_count || 0,
          uniqueRecipientCount: data.unique_recipient_count || 0
        }
      };
    } catch (error) {
      console.error('[Grove Extension] Tips total fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch leaderboard stats for a period
   * For 'all' period, uses the total endpoints
   * For other periods, aggregates from leaderboard data
   * @param {string} period - Time window: 'day', 'week', 'month', or 'all'
   * @returns {Promise<Object>} - Stats data with deposits, tips, tippers, recipients
   */
  static async getLeaderboardStats(period = 'day') {
    try {
      // For 'all' period, use the dedicated total endpoints
      if (period === 'all') {
        const [fundsRes, tipsRes] = await Promise.all([
          this.getFundsTotal(),
          this.getTipsTotal()
        ]);

        if (!fundsRes.success || !tipsRes.success) {
          throw new Error('Failed to fetch totals');
        }

        return {
          success: true,
          data: {
            deposits: fundsRes.data.totalUSD,
            tips: tipsRes.data.totalUSD,
            tippers: tipsRes.data.uniqueTipperCount,
            recipients: tipsRes.data.uniqueRecipientCount
          }
        };
      }

      // For time-based periods, fetch from leaderboard endpoints with high limit
      const baseURL = await this.getBaseURL();
      const window = { 'day': '24h', 'week': '7d', 'month': '30d' }[period] || '24h';

      const [fundersRes, tippersRes, tippeesRes] = await Promise.all([
        fetch(`${baseURL}/v1/leaderboard/funders?window=${window}&limit=500`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${baseURL}/v1/leaderboard/tippers?window=${window}&limit=500`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${baseURL}/v1/leaderboard/tippees?window=${window}&limit=500`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      if (!fundersRes.ok || !tippersRes.ok || !tippeesRes.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }

      const [fundersData, tippersData, tippeesData] = await Promise.all([
        fundersRes.json(),
        tippersRes.json(),
        tippeesRes.json()
      ]);

      // Aggregate totals
      const totalDeposits = (fundersData.entries || []).reduce(
        (sum, entry) => sum + parseFloat(entry.total_amount_usd || 0), 0
      );
      const totalTips = (tippeesData.entries || []).reduce(
        (sum, entry) => sum + parseFloat(entry.total_amount_usd || 0), 0
      );

      return {
        success: true,
        data: {
          deposits: totalDeposits,
          tips: totalTips,
          tippers: (tippersData.entries || []).length,
          recipients: (tippeesData.entries || []).length
        }
      };
    } catch (error) {
      console.error('[Grove Extension] Leaderboard stats fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch tip history for the authenticated user
   * @param {string} groveApiJwt - JWT token for authentication
   * @param {number} limit - Number of entries (default: 50, max: 100)
   * @param {number} offset - Offset for pagination (default: 0)
   * @returns {Promise<Object>} - Tip history data
   */
  static async getTipHistory(groveApiJwt, limit = 50, offset = 0) {
    const baseURL = await this.getBaseURL();
    const params = new URLSearchParams({
      limit: Math.min(Math.max(1, limit), 100).toString(),
      offset: Math.max(0, offset).toString(),
    });
    const apiUrl = `${baseURL}/v1/account/tip_history?${params}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${groveApiJwt}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          entries: data.entries || [],
          total: data.total || 0
        }
      };
    } catch (error) {
      console.error('[Grove Extension] Tip history fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch fund/deposit history for the authenticated user
   * @param {string} groveApiJwt - JWT token for authentication
   * @param {number} limit - Number of entries (default: 50, max: 100)
   * @param {number} offset - Offset for pagination (default: 0)
   * @returns {Promise<Object>} - Fund history data
   */
  static async getFundHistory(groveApiJwt, limit = 50, offset = 0) {
    const baseURL = await this.getBaseURL();
    const params = new URLSearchParams({
      limit: Math.min(Math.max(1, limit), 100).toString(),
      offset: Math.max(0, offset).toString(),
    });
    const apiUrl = `${baseURL}/v1/account/fund_history?${params}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${groveApiJwt}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          entries: data.entries || [],
          total: data.total || 0
        }
      };
    } catch (error) {
      console.error('[Grove Extension] Fund history fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a tip to the current page URL
   * @param {string} pageUrl - Full page URL (e.g., "https://twitter.com/olshansky")
   * @param {number} tipAmount - Tip amount in dollars (default: 0.05)
   * @param {string} groveApiJwt - JWT token for authentication
   * @param {Object} context - Optional context metadata for the tip
   * @param {string} context.source_post_url - URL of the post where the tip originated
   * @param {string} context.recipient_username - Username of the tip recipient
   * @param {string} context.recipient_profile_url - Profile URL of the recipient
   * @param {string} context.sender_platform - Platform identifier (e.g., "twitter")
   * @returns {Promise<Object>} - API response
   */
  static async sendTip(pageUrl, tipAmount = this.DEFAULT_TIP_AMOUNT, groveApiJwt = this.GROVE_API_JWT, context = null) {
    const baseURL = await this.getBaseURL();
    const network = await this.getChainId();

    const tipDomain = this.buildTipDomainFromURL(pageUrl);

    const apiUrl = `${baseURL}/v1/tip`;

    // Build request body
    const body = {
      destination: tipDomain,
      amount: String(tipAmount),
      network: network
    };

    // Add context if provided
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
        console.warn('[Grove Extension] Tip response parse failed:', parseError);
      }

      if (!response.ok) {
        const message = data?.detail?.error || data?.message || `API request failed with status ${response.status}`;
        return {
          success: false,
          error: message,
          status: response.status,
          data
        };
      }

      return {
        success: true,
        data: data,
        status: response.status
      };

    } catch (error) {
      console.error('[Grove Extension] Tip failed:', error);

      return {
        success: false,
        error: error.message,
        status: null
      };
    }
  }
}

if (typeof window !== 'undefined') {
  window.GroveAPI = GroveAPI;
}
