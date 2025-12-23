/**
 * Chain/Network Configuration
 * Centralized chain definitions with RPC endpoints and explorers
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

// Export to window for browser context
if (typeof window !== 'undefined') {
  window.CHAIN_CONFIG = CHAIN_CONFIG;
}
