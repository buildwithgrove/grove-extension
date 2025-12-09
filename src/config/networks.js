/**
 * Network Configuration
 * Maps network names to RPC endpoints, contract addresses, and UI metadata
 */

const NETWORKS = {
  'base': {
    name: 'Base',
    type: 'Mainnet',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    contracts: {
      usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    }
  },
  'base-sepolia': {
    name: 'Base Sepolia',
    type: 'Testnet',
    chainId: 84532,
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    contracts: {
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
    }
  },
  'solana': {
    name: 'Solana',
    type: 'Mainnet',
    chainId: null, // Solana doesn't use chainId
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://explorer.solana.com',
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9
    },
    contracts: {
      usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    }
  },
  'solana-devnet': {
    name: 'Solana Devnet',
    type: 'Testnet',
    chainId: null,
    rpcUrl: 'https://api.devnet.solana.com',
    explorerUrl: 'https://explorer.solana.com?cluster=devnet',
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9
    },
    contracts: {
      usdc: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' // Devnet USDC
    }
  }
};

const ERC20_METHODS = {
  balanceOf: '0x70a08231' // balanceOf(address)
};

if (typeof window !== 'undefined') {
  window.NETWORKS = NETWORKS;
  window.ERC20_METHODS = ERC20_METHODS;
}
