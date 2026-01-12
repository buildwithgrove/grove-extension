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
 * Normalize chain name from API format (e.g., 'base_sepolia' -> 'base-sepolia')
 * @param {string} rawChain - Raw chain name from API or storage
 * @returns {string} - Normalized chain key
 */
function normalizeChainName(rawChain) {
  return (rawChain || DEFAULT_CHAIN).toLowerCase().replace(/_/g, '-');
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
  window.getChainConfig = getChainConfig;
  window.getExplorerTxUrl = getExplorerTxUrl;
}
