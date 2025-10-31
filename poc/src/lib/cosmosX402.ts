/**
 * Cosmos x402 client for creating payment headers for Cosmos-based chains (POKT, Cosmos Hub, etc.)
 * Based on grove_api/x402_cosmos_client.py
 */

import { keccak256, recoverAddress, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { PaymentRequirementsDto } from "../types/x402";

interface CosmosPaymentAuthorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

interface CosmosPaymentHeader {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: string;
    authorization: CosmosPaymentAuthorization & { nonce: string };
  };
}

/**
 * Generate a random nonce for payment uniqueness
 */
function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Sign authorization data for Cosmos payment
 * Creates a message signature compatible with x402 protocol
 */
async function signAuthorization(
  privateKey: string,
  authorization: CosmosPaymentAuthorization,
  network: string
): Promise<string> {
  // Create message to sign
  // Format: from|to|value|validAfter|validBefore|nonce|network
  const messageParts = [
    authorization.from,
    authorization.to,
    authorization.value,
    authorization.validAfter,
    authorization.validBefore,
    authorization.nonce,
    network,
  ];
  const message = messageParts.join("|");

  // Sign the message using viem account
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const signature = await account.signMessage({ message });

  return signature;
}

/**
 * Create a Cosmos x402 payment header
 */
export async function createCosmosPaymentHeader(
  privateKey: string,
  paymentRequirement: PaymentRequirementsDto,
  x402Version: number = 1
): Promise<{ header: string }> {
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  // Generate nonce
  const nonce = generateNonce();

  // Create authorization data
  const currentTime = Math.floor(Date.now() / 1000);
  const authorization: CosmosPaymentAuthorization = {
    from: account.address,
    to: paymentRequirement.payTo,
    value: paymentRequirement.maxAmountRequired,
    validAfter: String(currentTime - 60), // 60 seconds before
    validBefore: String(currentTime + (paymentRequirement.maxTimeoutSeconds || 60)),
    nonce,
  };

  // Sign the authorization
  const signature = await signAuthorization(
    privateKey,
    authorization,
    paymentRequirement.network
  );

  // Create payment header
  const headerData: CosmosPaymentHeader = {
    x402Version,
    scheme: paymentRequirement.scheme,
    network: paymentRequirement.network,
    payload: {
      signature,
      authorization: {
        ...authorization,
        nonce: `0x${nonce}`, // Hex format for nonce in header
      },
    },
  };

  // Encode as base64 JSON
  const headerJson = JSON.stringify(headerData);
  const headerBase64 = btoa(headerJson);

  return { header: headerBase64 };
}
