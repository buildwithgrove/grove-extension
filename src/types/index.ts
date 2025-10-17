export type ChainId = "pocket-mainnet" | "zcash-mainnet" | "ethereum-mainnet" | "base-mainnet";

export type ChainKind = "pokt" | "evm" | "zcash" | "stablecoin";

export interface ChainMetadata {
  id: ChainId;
  label: string;
  shortLabel: string;
  currency: string;
  networkTag: string;
  kind: ChainKind;
  description: string;
  accent: string;
  supportsX402: boolean;
  defaultUsdPerUnit: number;
  comingSoon?: boolean;
}

export const SUPPORTED_CHAINS: ChainMetadata[] = [
  {
    id: "pocket-mainnet",
    label: "Pocket Network",
    shortLabel: "POKT",
    currency: "POKT",
    networkTag: "Pocket Mainnet",
    kind: "pokt",
    description: "Tip with native Pocket Network tokens",
    accent: "#2d8f6b",
    supportsX402: true,
    defaultUsdPerUnit: 0.22
  },
  {
    id: "zcash-mainnet",
    label: "Zcash",
    shortLabel: "ZEC",
    currency: "ZEC",
    networkTag: "Zcash Mainnet",
    kind: "zcash",
    description: "Shielded-friendly tips for Zcash wallets",
    accent: "#1b3b6f",
    supportsX402: false,
    defaultUsdPerUnit: 26.5,
    comingSoon: true
  },
  {
    id: "ethereum-mainnet",
    label: "Ethereum",
    shortLabel: "ETH",
    currency: "ETH",
    networkTag: "Ethereum Mainnet",
    kind: "evm",
    description: "Direct ETH tips via x402",
    accent: "#5b6ef5",
    supportsX402: false,
    defaultUsdPerUnit: 3500,
    comingSoon: true
  },
  {
    id: "base-mainnet",
    label: "USDC on Base",
    shortLabel: "USDC",
    currency: "USDC",
    networkTag: "Base Mainnet",
    kind: "stablecoin",
    description: "Gasless USDC tips settled on Base",
    accent: "#0b7aff",
    supportsX402: true,
    defaultUsdPerUnit: 1
  }
];

export const DEFAULT_CHAIN_ID: ChainId = "pocket-mainnet";

export interface AccountRecord {
  id: string;
  label: string;
  chainId: ChainId;
  address: string;
  privateKey: string;
  createdAt: string;
  colorSeed: number;
  memo?: string;
  lastUsedAt?: string;
  importedFrom?: "text" | "file" | "clipboard";
}

export interface AccountsPayload {
  version: number;
  accounts: AccountRecord[];
}

export interface StoredCipher {
  version: number;
  encrypted: string;
  iv: string;
}

export interface EncryptionMetadata {
  version: number;
  salt: string;
  hint?: string;
  createdAt: string;
}

export interface ExtensionSettings {
  apiBaseUrl: string;
  usdPerPokt: number;
  preferFiat: boolean;
  defaultTipUsd: number;
  lastDomain?: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiBaseUrl: "https://grove-api.onrender.com",
  usdPerPokt: 0.22,
  preferFiat: true,
  defaultTipUsd: 0.50
};

export interface TipPreset {
  id: string;
  label: string;
  amountUsd: number;
}

export const TIP_PRESETS: TipPreset[] = [
  { id: "usd-0.25", label: "$0.25", amountUsd: 0.25 },
  { id: "usd-0.50", label: "$0.50", amountUsd: 0.50 },
  { id: "usd-1", label: "$1", amountUsd: 1 },
  { id: "usd-2", label: "$2", amountUsd: 2 },
  { id: "usd-10", label: "$10", amountUsd: 10 }
];

export interface TipSubmissionPayload {
  amountUsd: number;
  memo?: string;
}

export interface TipResult {
  success: boolean;
  message: string;
  txHash?: string;
  tipId?: string;
  statusCode?: number;
  // Detailed transaction info (when successful)
  tipperTxHash?: string;
  settlementTxHash?: string;
  to?: string;
  from?: string;
  amountSent?: string;
  amountReceived?: string;
  feeAmount?: string;
  denomination?: string;
  chain?: string;
}
