import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { PaymentRequirementsDto } from "../types/x402";

const AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
};

const NETWORK_TO_CHAIN_ID: Record<string, number> = {
  base: 8453,
  "base-mainnet": 8453,
  "base-sepolia": 84532,
  ethereum: 1,
  "ethereum-mainnet": 1,
  "polygon": 137,
  "polygon-amoy": 80_002,
  avalanche: 43_114,
  "avalanche-fuji": 43_113,
  sei: 1_329,
  "sei-testnet": 1_328,
  peaq: 3_338,
  iotex: 4_689
};

function ensureHexPrivateKey(privateKey: string): Hex {
  const normalized = privateKey.trim();
  if (normalized.startsWith("0x")) {
    return normalized as Hex;
  }
  return (`0x${normalized}`) as Hex;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function base64Encode(object: unknown): string {
  return btoa(JSON.stringify(object));
}

interface PaymentHeaderResult {
  header: string;
  fromAddress: string;
  nonce: string;
}

export async function createExactEvmPaymentHeader(
  privateKey: string,
  requirements: PaymentRequirementsDto,
  x402Version: number
): Promise<PaymentHeaderResult> {
  const chainId = NETWORK_TO_CHAIN_ID[requirements.network];
  if (!chainId) {
    throw new Error(`Unsupported EVM network: ${requirements.network}`);
  }

  const account = privateKeyToAccount(ensureHexPrivateKey(privateKey));
  const fromAddress = account.address;
  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(now - 600).toString();
  const validBefore = BigInt(now + (requirements.maxTimeoutSeconds || 300)).toString();
  const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));

  const domain = {
    name: requirements.extra?.name ?? "USD Coin",
    version: requirements.extra?.version ?? "2",
    chainId,
    verifyingContract: requirements.asset
  };

  const message = {
    from: fromAddress,
    to: requirements.payTo,
    value: requirements.maxAmountRequired,
    validAfter,
    validBefore,
    nonce
  };

  const signature = await account.signTypedData({
    domain,
    primaryType: "TransferWithAuthorization",
    types: AUTHORIZATION_TYPES,
    message
  });

  const payload = {
    x402Version,
    scheme: requirements.scheme,
    network: requirements.network,
    payload: {
      signature,
      authorization: {
        ...message
      }
    }
  };

  return {
    header: base64Encode(payload),
    fromAddress,
    nonce
  };
}
