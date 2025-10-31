/**
 * POKT transaction signing using CosmJS
 * Creates and signs Cosmos SDK transactions for POKT Network
 */

import { toBase64 } from "@cosmjs/encoding";
import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { SigningStargateClient, StdFee } from "@cosmjs/stargate";
import * as secp256k1 from "@noble/secp256k1";

const POKT_CHAIN_ID = "pocket";
const POKT_DENOM = "upokt";
const GAS_LIMIT = "200000";
const FEE_AMOUNT = "200000"; // 200000 upokt fee

interface PoktTransactionParams {
  toAddress: string;
  amount: string; // in upokt
  memo?: string;
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Create and sign a POKT bank send transaction offline
 * Returns base64-encoded signed transaction
 */
export async function createSignedPoktTransaction(
  privateKey: string,
  params: PoktTransactionParams,
  rpcUrl?: string
): Promise<string> {
  const { toAddress, amount, memo = "" } = params;

  // Convert private key to bytes
  const privateKeyBytes = hexToBytes(privateKey);

  // Create wallet from private key
  const wallet = await DirectSecp256k1Wallet.fromKey(privateKeyBytes, "pokt");

  // Get the sender address
  const [account] = await wallet.getAccounts();
  const fromAddress = account.address;

  // If RPC URL is provided, use online signing with account info from chain
  if (rpcUrl) {
    try {
      // Connect to POKT network
      const client = await SigningStargateClient.connectWithSigner(rpcUrl, wallet, {
        broadcastTimeoutMs: 30000,
        broadcastPollIntervalMs: 1000,
      });

      const fee: StdFee = {
        amount: [{ denom: POKT_DENOM, amount: FEE_AMOUNT }],
        gas: GAS_LIMIT,
      };

      // Create and sign the transaction (without broadcasting)
      const txRaw = await client.sign(
        fromAddress,
        [
          {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: {
              fromAddress,
              toAddress,
              amount: [{ denom: POKT_DENOM, amount }],
            },
          },
        ],
        fee,
        memo
      );

      // Use client.signAndBroadcast's internal encoding instead
      // We'll use the StargateClient's internal TxRaw encoder
      // The txRaw object should already be properly formatted

      // Import the proper encoder - it's in the generated code
      // CosmJS provides a helper to serialize TxRaw
      const txBytes = await (async () => {
        // Use the registry to encode the transaction
        const { TxRaw: TxRawProto } = await import("cosmjs-types/cosmos/tx/v1beta1/tx");
        return TxRawProto.encode(txRaw).finish();
      })();

      return toBase64(txBytes);
    } catch (error) {
      console.error("Failed to sign POKT transaction:", error);

      // Provide more detailed error message
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("status") && errorMessage.includes("415")) {
        errorMessage = "Invalid RPC endpoint. Please check the POKT RPC URL configuration.";
      } else if (errorMessage.includes("fetch")) {
        errorMessage = "Network error connecting to POKT RPC. Please check your connection.";
      }

      throw new Error(`Failed to sign POKT transaction: ${errorMessage}`);
    }
  }

  // Offline signing is not supported yet
  throw new Error(
    "POKT transaction signing requires an RPC URL to fetch account info. " +
    "Please configure POKT RPC endpoint in settings."
  );
}
