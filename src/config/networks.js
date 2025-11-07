/**
 * Network Configuration
 * Maps network names to RPC endpoints and contract addresses
 */

const NETWORKS = {
  'base': {
    name: 'Base',
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
  }
};

// ERC20 ABI method signatures
const ERC20_METHODS = {
  balanceOf: '0x70a08231' // balanceOf(address)
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.NETWORKS = NETWORKS;
  window.ERC20_METHODS = ERC20_METHODS;
}
