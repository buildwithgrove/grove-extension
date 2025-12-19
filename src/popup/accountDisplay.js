/**
 * Account Display Module
 * Handles balance display, address display, ENS resolution, and copy functionality
 */

const DEFAULT_BALANCE_DISPLAY = '0.00';
const DEFAULT_CHAIN = 'base';

const AccountDisplay = {
  // DOM element references
  elements: {
    balanceDisplay: null,
    balanceAmount: null,
    earnAddressText: null,
    copyEarnAddressBtn: null,
    ensLinksSection: null
  },

  // Callback functions provided by popup.js
  callbacks: {
    getActiveJWT: null,
    showToast: null,
    onAuthFailure: null
  },

  /**
   * Initialize the Earn Tab module
   * @param {Object} elements - DOM element references
   * @param {Object} callbacks - Callback functions
   */
  init(elements, callbacks) {
    this.elements = { ...this.elements, ...elements };
    this.callbacks = { ...this.callbacks, ...callbacks };
  },

  /**
   * Format balance for display
   * @param {string|number} balance - Balance value
   * @returns {string} Formatted balance
   */
  formatBalance(balance) {
    const parsed = parseFloat(balance);
    if (Number.isNaN(parsed)) {
      return DEFAULT_BALANCE_DISPLAY;
    }
    return parsed.toFixed(2);
  },

  /**
   * Fetch balance from API and update UI
   */
  async fetchBalance() {
    const { balanceDisplay, balanceAmount } = this.elements;

    if (balanceDisplay) {
      balanceDisplay.classList.add('loading');
    }

    // Get JWT based on current dev mode
    const jwt = await this.callbacks.getActiveJWT();

    // Get chain and cached balances
    const storageResult = await chrome.storage.local.get([
      STORAGE_KEYS.CHAIN,
      STORAGE_KEYS.LAST_BALANCES
    ]);
    const chain = storageResult[STORAGE_KEYS.CHAIN] || DEFAULT_CHAIN;
    const cachedBalances = storageResult[STORAGE_KEYS.LAST_BALANCES] || {};
    const cachedBalance = cachedBalances[chain];

    // Show cached balance if available to avoid flashing $0.00
    if (balanceAmount) {
      if (cachedBalance !== undefined) {
        balanceAmount.textContent = cachedBalance;
      } else {
        balanceAmount.textContent = DEFAULT_BALANCE_DISPLAY;
      }
    }

    try {
      if (!jwt) {
        return;
      }

      // Fetch account data from API
      const response = await GroveAPI.getAccount(jwt);

      if (!response.success || !response.data?.balances) {
        console.error('[Grove Extension] Balance fetch failed:', response.error);

        // Check if this is an auth/account failure (401/403 for invalid JWT, 404 for account not found)
        const isAuthFailure = response.status === 401 || response.status === 403 || response.status === 404;
        if (isAuthFailure && this.callbacks.onAuthFailure) {
          await this.callbacks.onAuthFailure(jwt, response);
        }
        return;
      }

      // Store client_address for Earn tab display
      if (response.data.client_address) {
        const result = await chrome.storage.local.get([STORAGE_KEYS.CLIENT_ADDRESS]);
        const previousAddress = result[STORAGE_KEYS.CLIENT_ADDRESS];

        await chrome.storage.local.set({ [STORAGE_KEYS.CLIENT_ADDRESS]: response.data.client_address });
        this.updateEarnAddressDisplay(response.data.client_address);

        // If address changed, clear cached ENS name and re-resolve
        if (previousAddress !== response.data.client_address) {
          await chrome.storage.local.remove([STORAGE_KEYS.ENS_NAME]);
          this.updateEnsNameDisplay(null);
          // Resolve in background
          this.loadAndResolveEnsName();
        }
      }

      // Find balance for current chain (USDC)
      const chainBalance = response.data.balances.find(
        b => b.network === chain && b.token_symbol === 'USDC'
      );

      if (balanceAmount) {
        if (chainBalance) {
          // Format balance (remove trailing zeros, max 2 decimal places for display)
          const formattedBalance = this.formatBalance(chainBalance.balance);
          balanceAmount.textContent = formattedBalance;
          cachedBalances[chain] = formattedBalance;
          await chrome.storage.local.set({ [STORAGE_KEYS.LAST_BALANCES]: cachedBalances });
        } else {
          balanceAmount.textContent = DEFAULT_BALANCE_DISPLAY;
          cachedBalances[chain] = DEFAULT_BALANCE_DISPLAY;
          await chrome.storage.local.set({ [STORAGE_KEYS.LAST_BALANCES]: cachedBalances });
        }
      }
    } catch (e) {
      console.error('[Grove Extension] Balance fetch failed:', e);
    } finally {
      if (balanceDisplay) {
        balanceDisplay.classList.remove('loading');
      }
    }
  },

  /**
   * Update the address display in the Earn tab
   * Shows ENS name or base name if available, otherwise shows 0x address
   * @param {string|null} displayValue - Value to display
   * @param {boolean} hasEnsName - Whether the value is an ENS name
   */
  updateEarnAddressDisplay(displayValue, hasEnsName = false) {
    const { earnAddressText, copyEarnAddressBtn, ensLinksSection } = this.elements;

    if (earnAddressText && displayValue) {
      earnAddressText.textContent = displayValue;
      earnAddressText.classList.remove('placeholder');
      if (copyEarnAddressBtn) {
        copyEarnAddressBtn.disabled = false;
      }
      // Hide "Get an ENS name" links when user has one
      if (ensLinksSection) {
        if (hasEnsName) {
          ensLinksSection.classList.add('hidden');
        } else {
          ensLinksSection.classList.remove('hidden');
        }
      }
    } else if (earnAddressText) {
      earnAddressText.textContent = 'Connect to see address';
      earnAddressText.classList.add('placeholder');
      if (copyEarnAddressBtn) {
        copyEarnAddressBtn.disabled = true;
      }
      // Show "Get an ENS name" links when not connected
      if (ensLinksSection) {
        ensLinksSection.classList.remove('hidden');
      }
    }
  },

  /**
   * Load client address from storage and display it
   */
  async loadClientAddress() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.CLIENT_ADDRESS, STORAGE_KEYS.ENS_NAME]);
    const address = result[STORAGE_KEYS.CLIENT_ADDRESS];
    const ensName = result[STORAGE_KEYS.ENS_NAME];

    // Show ENS/base name if available, otherwise show truncated 0x address
    if (ensName) {
      this.updateEarnAddressDisplay(ensName, true);
    } else if (address) {
      // Truncate address for display: 0x1234...abcd
      const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
      this.updateEarnAddressDisplay(truncated, false);
    } else {
      this.updateEarnAddressDisplay(null, false);
    }
  },

  /**
   * Copy earn address to clipboard
   */
  async copyEarnAddress() {
    const { copyEarnAddressBtn } = this.elements;

    const result = await chrome.storage.local.get([STORAGE_KEYS.CLIENT_ADDRESS, STORAGE_KEYS.ENS_NAME]);
    const address = result[STORAGE_KEYS.CLIENT_ADDRESS];
    const ensName = result[STORAGE_KEYS.ENS_NAME];

    // Copy ENS name if available, otherwise copy 0x address
    const valueToCopy = ensName || address;

    if (valueToCopy) {
      try {
        await navigator.clipboard.writeText(valueToCopy);
        if (this.callbacks.showToast) {
          this.callbacks.showToast('Address copied!');
        }

        // Visual feedback
        if (copyEarnAddressBtn) {
          copyEarnAddressBtn.classList.add('copied');
          setTimeout(() => {
            copyEarnAddressBtn.classList.remove('copied');
          }, 2000);
        }
      } catch (err) {
        console.error('[Grove Extension] Copy failed:', err);
        if (this.callbacks.showToast) {
          this.callbacks.showToast('Failed to copy');
        }
      }
    }
  },

  /**
   * Resolve ENS name for an address using reverse resolution
   * Checks both Ethereum ENS (.eth) and Base ENS (.base.eth)
   * @param {string} address - Ethereum address
   * @returns {Promise<string|null>} ENS name or null
   */
  async resolveEnsName(address) {
    if (!address || !address.startsWith('0x')) {
      return null;
    }

    const addr = address.toLowerCase();

    // Try web3.bio API (handles both ENS and Basenames)
    try {
      const response = await fetch(`https://api.web3.bio/profile/${addr}`);
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        // Prefer ENS (.eth) over Basenames (.base.eth)
        const ensProfile = data.find(p => p.platform === 'ens' || (p.identity && p.identity.endsWith('.eth') && !p.identity.endsWith('.base.eth')));
        if (ensProfile?.identity) {
          console.log('[Grove Extension] Resolved ENS:', ensProfile.identity);
          return ensProfile.identity;
        }

        // Check for Basenames
        const baseProfile = data.find(p => p.platform === 'basenames' || (p.identity && p.identity.endsWith('.base.eth')));
        if (baseProfile?.identity) {
          console.log('[Grove Extension] Resolved Basename:', baseProfile.identity);
          return baseProfile.identity;
        }
      }
    } catch (e) {
      console.log('[Grove Extension] web3.bio lookup failed:', e.message);
    }

    // Fallback: Try Ensideas API for ENS only
    try {
      const response = await fetch(`https://ensideas.com/ens/resolve/${addr}`);
      const data = await response.json();
      if (data.name && data.name.endsWith('.eth')) {
        console.log('[Grove Extension] Resolved ENS via Ensideas:', data.name);
        return data.name;
      }
    } catch (e) {
      console.log('[Grove Extension] Ensideas lookup failed:', e.message);
    }

    return null;
  },

  /**
   * Update ENS name display - triggers address reload
   * @param {string|null} ensName - ENS name or null
   */
  async updateEnsNameDisplay(ensName) {
    // Re-load and display the address (will show ENS if available)
    await this.loadClientAddress();
  },

  /**
   * Load and resolve ENS name for stored address
   */
  async loadAndResolveEnsName() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.CLIENT_ADDRESS, STORAGE_KEYS.ENS_NAME]);
    const address = result[STORAGE_KEYS.CLIENT_ADDRESS];
    const cachedEnsName = result[STORAGE_KEYS.ENS_NAME];

    // Show cached name immediately if available
    if (cachedEnsName) {
      this.updateEnsNameDisplay(cachedEnsName);
    }

    // If we have an address, try to resolve it
    if (address) {
      try {
        const ensName = await this.resolveEnsName(address);
        if (ensName) {
          await chrome.storage.local.set({ [STORAGE_KEYS.ENS_NAME]: ensName });
          this.updateEnsNameDisplay(ensName);
        } else if (cachedEnsName) {
          // Clear cached name if resolution returns nothing
          await chrome.storage.local.remove([STORAGE_KEYS.ENS_NAME]);
          this.updateEnsNameDisplay(null);
        }
      } catch (e) {
        console.error('[Grove Extension] ENS resolution failed:', e);
        // Keep showing cached name on error
      }
    }
  }
};
