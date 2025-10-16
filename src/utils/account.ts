import { Hex, isHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { ChainId, ChainMetadata, SUPPORTED_CHAINS } from "../types";
import { chainMetaById } from "../hooks/useAccounts";

export interface KeyValidationResult {
  valid: boolean;
  normalizedKey?: string;
  address?: string;
  message?: string;
}

export function requiresManualAddress(chain: ChainMetadata): boolean {
  return chain.kind === "pokt" || chain.kind === "zcash";
}

export function normalizeHexKey(privateKey: string): Hex | undefined {
  if (!privateKey) return undefined;
  const trimmed = privateKey.trim();
  if (trimmed.startsWith("0x")) {
    return trimmed as Hex;
  }
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    return (`0x${trimmed}`) as Hex;
  }
  return undefined;
}

export function validatePrivateKey(chainId: ChainId, privateKey: string): KeyValidationResult {
  const chain = chainMetaById(chainId);
  if (!privateKey) {
    return { valid: false, message: "Private key is required." };
  }

  if (chain.kind === "evm" || chain.kind === "stablecoin") {
    const normalized = normalizeHexKey(privateKey);
    if (!normalized || !isHex(normalized, { strict: false }) || normalized.length !== 66) {
      return {
        valid: false,
        message: "Private key must be a 32-byte hex string.",
        normalizedKey: normalized
      };
    }
    const account = privateKeyToAccount(normalized);
    return {
      valid: true,
      normalizedKey: normalized,
      address: account.address
    };
  }

  // For POKT & Zcash we accept plain strings (mnemonic or key) and require manual address entry.
  if (privateKey.trim().length < 32) {
    return { valid: false, message: "Private key or mnemonic appears too short." };
  }

  return { valid: true, normalizedKey: privateKey.trim() };
}

export function chainOptions() {
  return SUPPORTED_CHAINS;
}
