/**
 * Chain/Network Configuration
 * Centralized chain definitions with RPC endpoints and explorers
 *
 * IMPORTANT: This is the single source of truth for chain configuration.
 * Do not duplicate chain config elsewhere - import/reference this instead.
 */

const CHAIN_CONFIG = {
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

const DEFAULT_CHAIN = 'base';

/**
 * Mapping from mainnet chains to their testnet equivalents
 */
const TESTNET_CHAIN_MAP = {
  'base': 'base-sepolia',
  'solana': 'solana-devnet'
};

/**
 * Normalize chain name from API format (e.g., 'base_sepolia' -> 'base-sepolia')
 * @param {string} rawChain - Raw chain name from API or storage
 * @returns {string} - Normalized chain key
 */
function normalizeChainName(rawChain) {
  return (rawChain || DEFAULT_CHAIN).toLowerCase().replace(/_/g, '-');
}

/**
 * Get the testnet equivalent of a chain
 * @param {string} rawChain - Raw chain name
 * @returns {string} - Testnet chain key, or the original if already testnet or no mapping exists
 */
function getTestnetChain(rawChain) {
  const chain = normalizeChainName(rawChain);
  return TESTNET_CHAIN_MAP[chain] || chain;
}

/**
 * Get the appropriate chain for explorer URLs based on environment settings
 * @param {string} rawChain - Raw chain name
 * @param {Object} settings - Storage settings with groveEnvironment and groveEndpoint
 * @returns {string} - Chain to use for explorer URLs (testnet if in test environment)
 */
function getExplorerChain(rawChain, settings = {}) {
  const env = settings.groveEnvironment || 'prod';
  const storedEndpoint = settings.groveEndpoint || 'production';
  const endpoint = env === 'local' ? storedEndpoint : 'production';
  const isTestEnvironment = endpoint === 'localhost' || endpoint === 'testnet';
  return isTestEnvironment ? getTestnetChain(rawChain) : rawChain;
}

/**
 * Get chain configuration by name
 * @param {string} rawChain - Raw chain name (handles underscore format from API)
 * @returns {Object} - Chain config with name, explorerUrl, etc.
 */
function getChainConfig(rawChain) {
  const chain = normalizeChainName(rawChain);
  return CHAIN_CONFIG[chain] || CHAIN_CONFIG[DEFAULT_CHAIN];
}

/**
 * Get transaction explorer URL for a chain
 * @param {string} rawChain - Raw chain name
 * @param {string} txHash - Transaction hash (optional)
 * @returns {string} - Full explorer URL for the transaction
 */
function getExplorerTxUrl(rawChain, txHash = '') {
  const config = getChainConfig(rawChain);
  return `${config.explorerUrl}/tx/${txHash}`;
}

// Export to window for browser context
if (typeof window !== 'undefined') {
  window.CHAIN_CONFIG = CHAIN_CONFIG;
  window.DEFAULT_CHAIN = DEFAULT_CHAIN;
  window.normalizeChainName = normalizeChainName;
  window.getTestnetChain = getTestnetChain;
  window.getExplorerChain = getExplorerChain;
  window.getChainConfig = getChainConfig;
  window.getExplorerTxUrl = getExplorerTxUrl;
}
