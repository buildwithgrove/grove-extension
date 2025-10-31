import { Hex, isHex, keccak256, sha256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as secp256k1 from "@noble/secp256k1";
import { sha256 as nobleSha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { bech32 } from "@scure/base";

import { ChainId, ChainMetadata, SUPPORTED_CHAINS } from "../types";
import { chainMetaById } from "../hooks/useAccounts";

export interface KeyValidationResult {
  valid: boolean;
  normalizedKey?: string;
  address?: string;
  message?: string;
}

export function requiresManualAddress(chain: ChainMetadata): boolean {
  return chain.kind === "zcash";
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

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function derivePoktAddress(privateKeyHex: string): string {
  try {
    // Remove 0x prefix if present
    const cleanKey = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;

    // Ensure 32-byte private key (64 hex chars)
    if (cleanKey.length !== 64) {
      throw new Error("POKT private key must be 32 bytes");
    }

    // Convert private key hex to bytes
    const privateKeyBytes = hexToBytes(cleanKey);

    // Get secp256k1 public key (33 bytes compressed)
    const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes, true);

    // Hash with SHA256
    const sha = nobleSha256(publicKeyBytes);

    // Hash with RIPEMD160 to get 20-byte address
    const addressBytes = ripemd160(sha);

    // Encode with bech32 using "pokt" prefix
    const words = bech32.toWords(addressBytes);
    const address = bech32.encode("pokt", words);

    return address;
  } catch (error) {
    throw new Error(`Failed to derive POKT address: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function validatePrivateKey(chainId: ChainId, privateKey: string): Promise<KeyValidationResult> {
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

  if (chain.kind === "pokt") {
    const normalized = normalizeHexKey(privateKey);
    if (!normalized || !isHex(normalized, { strict: false }) || normalized.length !== 66) {
      return {
        valid: false,
        message: "POKT private key must be a 32-byte hex string.",
        normalizedKey: normalized
      };
    }

    try {
      const address = derivePoktAddress(normalized);
      return {
        valid: true,
        normalizedKey: normalized,
        address
      };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : "Failed to derive POKT address"
      };
    }
  }

  // For Zcash we accept plain strings (mnemonic or key) and require manual address entry.
  if (privateKey.trim().length < 32) {
    return { valid: false, message: "Private key or mnemonic appears too short." };
  }

  return { valid: true, normalizedKey: privateKey.trim() };
}

export function chainOptions() {
  return SUPPORTED_CHAINS;
}
