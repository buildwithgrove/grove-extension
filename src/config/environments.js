/**
 * Grove Environment Configuration
 * Single source of truth for all environment-specific config.
 *
 * Every file that needs an API URL, app URL, JWT key, chain list,
 * or dev-mode flag should reference this module instead of
 * hardcoding its own copy.
 *
 * Key decision: localhost defaults to 'base' (mainnet), NOT 'base-sepolia'.
 * Localhost means "production chain, local API."
 */

var GROVE_ENVIRONMENTS = {
  production: {
    label: 'Mainnet',
    apiUrl: 'https://api.grove.city',
    appUrl: 'https://grove.city',
    defaultChain: 'base',
    jwtStorageKey: 'GROVE_JWT_PRODUCTION',
    isDevMode: false,
  },
  testnet: {
    label: 'Testnet',
    apiUrl: 'https://api.testnet.grove.city',
    appUrl: 'https://testnet.grove.city',
    defaultChain: 'base-sepolia',
    jwtStorageKey: 'GROVE_JWT_TESTNET',
    isDevMode: true,
  },
  localhost: {
    label: 'Localhost',
    apiUrl: 'http://localhost:8000',
    appUrl: 'http://localhost:3000',
    defaultChain: 'base',
    jwtStorageKey: 'GROVE_JWT_LOCALHOST',
    isDevMode: true,
  },
};

var GroveEnv = {
  /**
   * Get full config for an environment ID.
   * @param {string} envId - 'production', 'testnet', or 'localhost'
   * @returns {Object|null}
   */
  get(envId) {
    return GROVE_ENVIRONMENTS[envId] || null;
  },

  /**
   * THE one place for environment detection.
   * Resolves stored groveEnvironment + groveEndpoint to a canonical env ID.
   * @param {string} groveEnvironment - 'local' or 'prod' (from storage)
   * @param {string} groveEndpoint - 'production', 'testnet', or 'localhost' (from storage)
   * @returns {string} - 'production', 'testnet', or 'localhost'
   */
  resolveActiveEnvId(groveEnvironment, groveEndpoint) {
    if (groveEnvironment !== 'local') return 'production';
    if (groveEndpoint === 'localhost') return 'localhost';
    if (groveEndpoint === 'testnet') return 'testnet';
    return 'production';
  },

  /**
   * Top-up URL for an environment (derived from appUrl).
   * @param {string} envId
   * @returns {string}
   */
  topUpUrl(envId) {
    const env = GROVE_ENVIRONMENTS[envId] || GROVE_ENVIRONMENTS.production;
    return `${env.appUrl}/wallets?action=topup`;
  },

  /**
   * Extension activation URL for an environment.
   * @param {string} envId
   * @returns {string}
   */
  extensionUrl(envId) {
    const env = GROVE_ENVIRONMENTS[envId] || GROVE_ENVIRONMENTS.production;
    return `${env.appUrl}/extension`;
  },

  // TODO_IMPROVE: Derive apiLabel() from apiUrl instead of hardcoded map
  //   Why: Adding a new environment requires updating two places
  //   How: Use new URL(env.apiUrl).host in apiLabel()
  /**
   * Display label for the API endpoint.
   * @param {string} envId
   * @returns {string}
   */
  apiLabel(envId) {
    const labels = {
      production: 'api.grove.city',
      testnet: 'api.testnet.grove.city',
      localhost: 'localhost:8000',
    };
    return labels[envId] || 'api.grove.city';
  },

  // TODO_IMPROVE: Derive allowedChains() from CHAIN_CONFIG + TESTNET_CHAIN_MAP
  //   Why: Adding a new chain requires updating chains.js AND environments.js
  //   How: Use Object.keys(TESTNET_CHAIN_MAP) for mainnet, Object.values() for testnet
  /**
   * Allowed chains for an environment.
   * @param {string} envId
   * @returns {string[]}
   */
  allowedChains(envId) {
    return this.isTestChains(envId)
      ? ['base-sepolia', 'solana-devnet']
      : ['base', 'solana'];
  },

  /**
   * Default chain for an environment.
   * @param {string} envId
   * @returns {string}
   */
  defaultChain(envId) {
    const env = GROVE_ENVIRONMENTS[envId] || GROVE_ENVIRONMENTS.production;
    return env.defaultChain;
  },

  /**
   * Whether this environment uses testnet chains.
   * Only 'testnet' uses testnet chains — localhost uses mainnet chains.
   * @param {string} envId
   * @returns {boolean}
   */
  isTestChains(envId) {
    return envId === 'testnet';
  },

  /**
   * JWT storage key for an environment.
   * @param {string} envId
   * @returns {string}
   */
  jwtKeyForEnv(envId) {
    const env = GROVE_ENVIRONMENTS[envId] || GROVE_ENVIRONMENTS.production;
    return env.jwtStorageKey;
  },
};

// Export for content scripts (window context)
if (typeof window !== 'undefined') {
  window.GROVE_ENVIRONMENTS = GROVE_ENVIRONMENTS;
  window.GroveEnv = GroveEnv;
}

// Export for service worker (self context, no window)
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.GROVE_ENVIRONMENTS = GROVE_ENVIRONMENTS;
  self.GroveEnv = GroveEnv;
}
