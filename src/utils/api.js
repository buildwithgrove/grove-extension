/**
 * API Utility
 * Handles communication with Grove backend
 */

class GroveAPI {
  static DEFAULT_TIP_AMOUNT = 0.05; // $0.05 default

  static GROVE_API_JWT = ''; // Placeholder for now

  /**
   * Drop-in replacement for fetch() that works from ANY extension context.
   *
   * Problem: Code injected into twitter.com sends requests *as* twitter.com,
   *          so the Grove API rejects them (CORS).
   * Solution: When running on a page, relay the request through the background
   *           service worker, which sends it as chrome-extension:// (always allowed).
   *           From the popup or service worker itself, just use normal fetch().
   *
   * Why not always go through background.js?
   *   - The service worker can't message itself (sendMessage doesn't work that way)
   *   - The popup already runs as chrome-extension:// — no CORS issue, no proxy needed
   *   - Direct fetch() returns a real Response; the proxy returns a shim (see below)
   */
  static async _fetch(url, options = {}) {
    // Popup or service worker context → direct fetch
    if (typeof window === 'undefined' || window.location?.protocol === 'chrome-extension:') {
      return fetch(url, options);
    }

    // Content script context → relay through background service worker
    const { signal, ...serializableOptions } = options;

    const messagePromise = new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'API_FETCH', url, options: serializableOptions },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response) {
            reject(new Error('No response from background service worker'));
            return;
          }
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          // Shim: only the subset of the Response API that our call sites use.
          // Popup/service-worker contexts get a real Response via direct fetch().
          // If you need .clone(), .blob(), .body, .arrayBuffer(), etc., either:
          //   1. Extend this shim, or
          //   2. Move the call to background.js where real fetch() is available.
          const shim = {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers || {}),
            json: () => Promise.resolve(JSON.parse(response.body)),
            text: () => Promise.resolve(response.body),
          };

          // Trap unsupported Response methods so callers get a clear error
          // instead of a silent `undefined is not a function` at runtime.
          const unsupported = ['clone', 'blob', 'arrayBuffer', 'formData', 'bytes'];
          for (const method of unsupported) {
            shim[method] = () => {
              throw new Error(`Response.${method}() is not supported by the _fetch() CORS proxy shim`);
            };
          }

          resolve(shim);
        }
      );
    });

    // TODO_OPTIMIZE: Clean up AbortSignal listener after messagePromise resolves
    //   Why: The abort listener holds a reference to the reject fn after the race settles
    //   How: Add .then(cleanup, cleanup) to remove the event listener
    //   Priority: Low — signals and promises are short-lived

    // Race against AbortSignal if provided (used by resolveDestination timeout)
    if (signal) {
      return Promise.race([
        messagePromise,
        new Promise((_, reject) => {
          if (signal.aborted) {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
            return;
          }
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          }, { once: true });
        })
      ]);
    }

    return messagePromise;
  }

  /**
   * Get the base URL based on endpoint setting
   * @returns {Promise<string>} - Base URL
   */
  static async getBaseURL() {
    try {
      const result = await chrome.storage.local.get(['groveEndpoint', 'groveEnvironment']);
      const envId = GroveEnv.resolveActiveEnvId(result.groveEnvironment, result.groveEndpoint);
      return GroveEnv.get(envId).apiUrl;
    } catch (error) {
      groveLog.log("Endpoint load failed, using production");
      return GROVE_ENVIRONMENTS.production.apiUrl;
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
      groveLog.log("Chain ID load failed, using base");
      return 'base';
    }
  }

  /**
   * Get the current chain configuration
   * @returns {Promise<Object>} - Chain configuration with RPC endpoints
   */
  static async getChainConfig() {
    const chain = await this.getChainId();
    return CHAIN_CONFIG[chain] || CHAIN_CONFIG['base'];
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
      const response = await GroveAPI._fetch(rpcUrl, {
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
      const path = urlObj.pathname.replace(/\/$/, ''); // Remove trailing slash
      // TODO_CONSIDERATION: Filter query params to only meaningful ones per platform
      //   Why: Preserving all params may send tracking noise (utm_source, ref, etc.) to the API
      //   How: Whitelist meaningful params per platform (e.g., ?v= for YouTube)
      const search = urlObj.search; // Preserve query params (e.g., ?v=ID for YouTube)
      return `${domain}${path}${search}`;
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
      const response = await GroveAPI._fetch(apiUrl, {
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

      return {
        success: true,
        data: data,
        status: response.status
      };

    } catch (error) {
      console.error('[Grove Extension] Account fetch failed:', error);
      return {
        success: false,
        error: error.message,
        status: null
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
      const response = await GroveAPI._fetch(apiUrl, {
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
            lastTipContext: entry.last_tip_context,
            topTipDestination: entry.top_tip_destination,
            topTipContext: entry.top_tip_context,
            handle: entry.handle,
            base_name: entry.base_name,
            ens_name: entry.ens_name
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
      const response = await GroveAPI._fetch(apiUrl, {
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
            lastTipContext: entry.last_tip_context,
            topTipDestination: entry.top_tip_destination,
            topTipContext: entry.top_tip_context,
            handle: entry.handle,
            base_name: entry.base_name,
            ens_name: entry.ens_name
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
        GroveAPI._fetch(tippeesUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } }),
        GroveAPI._fetch(tippersUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
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
      const response = await GroveAPI._fetch(apiUrl, {
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
      const response = await GroveAPI._fetch(apiUrl, {
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
        GroveAPI._fetch(`${baseURL}/v1/leaderboard/funders?window=${window}&limit=500`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        GroveAPI._fetch(`${baseURL}/v1/leaderboard/tippers?window=${window}&limit=500`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        GroveAPI._fetch(`${baseURL}/v1/leaderboard/tippees?window=${window}&limit=500`, {
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
      const response = await GroveAPI._fetch(apiUrl, {
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
      const response = await GroveAPI._fetch(apiUrl, {
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
   * Get referral dashboard (referral code, stats, and referred accounts)
   * @param {string} groveApiJwt - JWT token for authentication
   * @param {number} limit - Number of referees per page (default: 50, max: 100)
   * @param {number} offset - Offset for pagination (default: 0)
   * @returns {Promise<Object>} - Referrals data with stats and referees
   */
  static async getReferrals(groveApiJwt, limit = 50, offset = 0) {
    const baseURL = await this.getBaseURL();
    const params = new URLSearchParams({
      limit: Math.min(Math.max(1, limit), 100).toString(),
      offset: Math.max(0, offset).toString(),
    });
    const apiUrl = `${baseURL}/v1/referrals?${params}`;

    try {
      const response = await GroveAPI._fetch(apiUrl, {
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

      return {
        success: true,
        data: data,
        status: response.status
      };

    } catch (error) {
      console.error('[Grove Extension] Referrals fetch failed:', error);
      return {
        success: false,
        error: error.message,
        status: null
      };
    }
  }

  /**
   * Get referral commission earnings for the authenticated user
   * @param {string} groveApiJwt - JWT token for authentication
   * @param {string} window - Time window: '24h', '7d', '30d', or 'all'
   * @returns {Promise<Object>} - Referral earnings data
   */
  static async getReferralEarnings(groveApiJwt, window = 'all') {
    const baseURL = await this.getBaseURL();
    const params = new URLSearchParams({ window });
    const apiUrl = `${baseURL}/v1/referrals/earnings?${params}`;

    try {
      const response = await GroveAPI._fetch(apiUrl, {
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
        data: data
      };
    } catch (error) {
      console.error('[Grove Extension] Referral earnings fetch failed:', error);
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
      const response = await GroveAPI._fetch(apiUrl, {
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
        groveLog.warn('Tip response parse failed:', parseError);
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

  /**
   * Fetch giveaways
   * @param {Object} params - Query parameters
   * @param {boolean} [params.browseable] - Filter browseable giveaways
   * @param {string} [params.status] - Filter by status ('active', 'ended')
   * @param {number} params.limit - Max results (default: 50)
   * @param {number} params.offset - Pagination offset (default: 0)
   * @returns {Promise<Object>} - Giveaways list with totals
   */
  static async listGiveaways({ browseable, status, limit = 50, offset = 0 } = {}) {
    const baseURL = await this.getBaseURL();
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (browseable !== undefined) params.set('browseable', String(browseable));
    if (status) params.set('status', status);
    const apiUrl = `${baseURL}/v1/giveaways?${params}`;

    try {
      const response = await GroveAPI._fetch(apiUrl, {
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
          giveaways: data.giveaways || [],
          total: data.total || 0
        }
      };
    } catch (error) {
      console.error('[Grove Extension] Giveaways fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a single giveaway with stats
   * @param {string} giveawayId - Giveaway UUID
   * @returns {Promise<Object>} - Giveaway details with stats
   */
  static async getGiveaway(giveawayId) {
    const baseURL = await this.getBaseURL();
    const apiUrl = `${baseURL}/v1/giveaway/${giveawayId}`;

    try {
      const response = await GroveAPI._fetch(apiUrl, {
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
          giveaway: data.giveaway,
          stats: data.stats
        }
      };
    } catch (error) {
      console.error('[Grove Extension] Giveaway detail fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get earnings summary for the authenticated user
   * @param {string} groveApiJwt - JWT token
   * @param {string} window - Time window: '24h', '7d', '30d', or 'all'
   * @returns {Promise<Object>} - { total_usd, tip_count, unique_tipper_count }
   */
  static async getEarningsSummary(groveApiJwt, window = 'all') {
    const baseURL = await this.getBaseURL();
    const params = new URLSearchParams({ window });
    const apiUrl = `${baseURL}/v1/account/earnings/summary?${params}`;

    try {
      const response = await GroveAPI._fetch(apiUrl, {
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
          total_usd: data.total_usd || '0',
          tip_count: data.tip_count || 0,
          unique_tipper_count: data.unique_tipper_count || 0
        }
      };
    } catch (error) {
      console.error('[Grove Extension] Earnings summary fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve a destination URL to determine if it's tippable and get addresses
   * Used for full page views (profiles, posts) to check tippability via API
   * @param {string} destination - URL or identifier to resolve (e.g., "x.com/olshansky")
   * @returns {Promise<Object>} - { tippable: boolean, addresses: Array, error?: string }
   */
  static async resolveDestination(destination) {
    const baseURL = await this.getBaseURL();
    const tipDomain = this.buildTipDomainFromURL(destination);

    // Check ResolveCache before making a network request.
    // This avoids redundant /v1/tip/resolve calls when users revisit pages,
    // navigate SPAs, or open the same site in multiple tabs.
    if (typeof ResolveCache !== 'undefined') {
      const cached = await ResolveCache.get(tipDomain);
      if (cached) {
        groveLog.log('[API] resolveDestination CACHE HIT:', { tipDomain, tippable: cached.tippable });
        return cached;
      }
    }

    const apiUrl = `${baseURL}/v1/tip/resolve?destination=${encodeURIComponent(tipDomain)}`;

    groveLog.log('[API] resolveDestination request:', {
      baseURL,
      apiUrl,
      destination,
      tipDomain
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await GroveAPI._fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      let data = null;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('[Grove API] resolveDestination JSON parse failed:', parseError);
        data = {};
      }

      groveLog.log('[API] resolveDestination response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const result = {
          tippable: false,
          addresses: [],
          cache_hint: data.cache_hint || null,
          error: data.message || data.detail || `API request failed with status ${response.status}`
        };
        // Cache non-tippable result so we don't re-ping for the same destination
        if (typeof ResolveCache !== 'undefined') {
          await ResolveCache.set(tipDomain, result);
        }
        return result;
      }

      // API returns { tippable: boolean, addresses: [...], source?: string, destination_kind?: string, cache_hint?: string }
      const result = {
        tippable: data.tippable || false,
        addresses: data.addresses || [],
        source: data.source || data.destination_kind || null,
        cache_hint: data.cache_hint || null,
        error: null
      };

      // Cache the result (positive or negative) to avoid redundant API calls
      if (typeof ResolveCache !== 'undefined') {
        await ResolveCache.set(tipDomain, result);
      }

      return result;
    } catch (error) {
      console.error('[Grove API] resolveDestination failed:', error);
      // Don't cache network errors — they're transient and should be retried
      return {
        tippable: false,
        addresses: [],
        error: error.message
      };
    }
  }

  /**
   * Claim a handle for the authenticated user
   * @param {string} handle - Desired handle (4-15 chars, [a-z0-9_])
   * @param {string} groveApiJwt - JWT token for authentication
   * @returns {Promise<Object>} - { success, data, error, status }
   */
  static async claimHandle(handle, groveApiJwt) {
    const baseURL = await this.getBaseURL();
    const apiUrl = `${baseURL}/v1/account/handle`;

    try {
      const response = await GroveAPI._fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groveApiJwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ handle })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `Request failed with status ${response.status}`,
          status: response.status,
          data
        };
      }

      return {
        success: true,
        data,
        status: response.status
      };

    } catch (error) {
      console.error('[Grove Extension] Handle claim failed:', error);
      return {
        success: false,
        error: error.message,
        status: null
      };
    }
  }

  /**
   * Get social links for the authenticated user
   * @param {string} groveApiJwt - JWT token
   * @returns {Promise<Object>} - { success, data: [{id, platform, url, verified, created_at}] }
   */
  static async getSocialLinks(groveApiJwt) {
    const baseURL = await this.getBaseURL();
    const apiUrl = `${baseURL}/v1/account/social-links`;

    try {
      const response = await GroveAPI._fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${groveApiJwt}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || data.error || 'Failed to get social links', status: response.status };
      }

      return { success: true, data, status: response.status };
    } catch (error) {
      console.error('[Grove Extension] Get social links failed:', error);
      return { success: false, error: error.message, status: null };
    }
  }

  /**
   * Add a social link to the authenticated user's profile
   * @param {string} platform - Platform key (e.g. 'x', 'youtube', 'github')
   * @param {string} url - The URL or handle for the platform
   * @param {string} groveApiJwt - JWT token
   * @returns {Promise<Object>} - { success, data: {id, platform, url, verified, created_at} }
   */
  static async addSocialLink(platform, url, groveApiJwt) {
    const baseURL = await this.getBaseURL();
    const apiUrl = `${baseURL}/v1/account/social-links`;

    try {
      const response = await GroveAPI._fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groveApiJwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ platform, url })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || data.error || 'Failed to add social link', status: response.status };
      }

      return { success: true, data, status: response.status };
    } catch (error) {
      console.error('[Grove Extension] Add social link failed:', error);
      return { success: false, error: error.message, status: null };
    }
  }

  /**
   * Remove a social link from the authenticated user's profile
   * @param {string} platform - Platform key to remove
   * @param {string} groveApiJwt - JWT token
   * @returns {Promise<Object>} - { success }
   */
  static async removeSocialLink(platform, groveApiJwt) {
    const baseURL = await this.getBaseURL();
    const apiUrl = `${baseURL}/v1/account/social-links/${encodeURIComponent(platform)}`;

    try {
      const response = await GroveAPI._fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${groveApiJwt}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let data = {};
        try { data = await response.json(); } catch (_) {}
        return { success: false, error: data.message || data.error || 'Failed to remove social link', status: response.status };
      }

      return { success: true, status: response.status };
    } catch (error) {
      console.error('[Grove Extension] Remove social link failed:', error);
      return { success: false, error: error.message, status: null };
    }
  }

  /**
   * Release the current handle for the authenticated user
   * @param {string} groveApiJwt - JWT token for authentication
   * @returns {Promise<Object>} - { success, data, error, status }
   */
  static async releaseHandle(groveApiJwt) {
    const baseURL = await this.getBaseURL();
    const apiUrl = `${baseURL}/v1/account/handle`;

    try {
      const response = await GroveAPI._fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${groveApiJwt}`,
          'Content-Type': 'application/json'
        }
      });

      let data = null;
      try {
        data = await response.json();
      } catch (_) {
        data = {};
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.message || data?.error || `Request failed with status ${response.status}`,
          status: response.status,
          data
        };
      }

      return {
        success: true,
        data,
        status: response.status
      };

    } catch (error) {
      console.error('[Grove Extension] Handle release failed:', error);
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
