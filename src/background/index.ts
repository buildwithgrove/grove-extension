// Polyfills must be imported first
import "./polyfills";

import { DEFAULT_SETTINGS, ExtensionSettings, SUPPORTED_CHAINS } from "../types";
import { RuntimeMessage, RuntimeResponse } from "../types/messages";
import { PaymentRequiredResponseDto, PaymentRequirementsDto, TipResponseDto, SettledPaymentHeader } from "../types/x402";
import { createExactEvmPaymentHeader } from "../lib/x402";
import { createCosmosPaymentHeader } from "../lib/cosmosX402";
import { createSignedPoktTransaction } from "../lib/poktSigner";

const SUCCESS_CODES = new Set([200, 201, 204]);
let cachedSettings: ExtensionSettings = DEFAULT_SETTINGS;

chrome.runtime.onMessage.addListener((rawMessage: RuntimeMessage, _sender, sendResponse) => {
  handleMessage(rawMessage)
    .then(response => sendResponse(response))
    .catch(error => {
      console.error("[background] Unhandled error", error);
      sendResponse({ type: "ERROR", message: error instanceof Error ? error.message : String(error) } satisfies RuntimeResponse);
    });
  return true;
});

async function handleMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  switch (message.type) {
    case "PING":
      return { type: "ACK" };
    case "SETTINGS_UPDATED":
      cachedSettings = message.payload;
      return { type: "ACK" };
    case "GET_ACTIVE_DOMAIN": {
      const domain = await getActiveDomain();
      return { type: "ACTIVE_DOMAIN", domain };
    }
    case "RUN_TIP":
      return await processTip(message.payload);
    default:
      return { type: "ERROR", message: "Unknown message type" };
  }
}

async function getActiveDomain(): Promise<string | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return undefined;
  try {
    const url = new URL(tab.url);
    return url.hostname;
  } catch {
    return undefined;
  }
}

function normaliseDomain(input?: string): string | undefined {
  if (!input) return undefined;
  try {
    const url = input.startsWith("http") ? new URL(input) : new URL(`https://${input}`);
    return url.origin;
  } catch {
    return undefined;
  }
}

async function processTip(payload: Extract<RuntimeMessage, { type: "RUN_TIP" }>["payload"]): Promise<RuntimeResponse> {
  const {
    account,
    amountUsd,
    memo,
    apiBaseUrl,
    domain: explicitDomain
  } = payload;

  const domain = explicitDomain ?? (await getActiveDomain());
  if (!domain) {
    return { type: "ERROR", message: "Unable to resolve active domain." };
  }

  const baseUrl = apiBaseUrl || cachedSettings.apiBaseUrl;
  const endpoint = `${baseUrl.replace(/\/$/, "")}/v1/tip`;
  const idempotencyKey = crypto.randomUUID();

  const chain = SUPPORTED_CHAINS.find(item => item.id === account.chainId);
  const amountForRequest = computeTipAmountString(amountUsd, chain);

  let requestBody: any = {
    domainURL: normaliseDomain(domain) ?? `https://${domain}`,
    amount: amountForRequest,
    denomination: chain?.currency ?? "POKT",
    memo
  };

  const commonHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey
  };

  const initialResponse = await fetch(endpoint, {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify(requestBody)
  });

  if (SUCCESS_CODES.has(initialResponse.status)) {
    const parsed = (await safeJson(initialResponse)) as TipResponseDto | undefined;
    const receipt = parsed?.result;
    return {
      type: "TIP_RESULT",
      result: {
        success: true,
        message: "Tip processed successfully.",
        tipId: receipt?.tip_id,
        txHash: receipt?.tipper_tx_hash,
        tipperTxHash: receipt?.tipper_tx_hash,
        settlementTxHash: receipt?.settlement_tx_hash,
        to: receipt?.to,
        from: receipt?.from,
        amountSent: receipt?.amount_sent,
        amountReceived: receipt?.amount_received,
        feeAmount: receipt?.fee_amount,
        denomination: receipt?.denomination,
        chain: receipt?.chain
      }
    };
  }

  if (initialResponse.status !== 402) {
    const errorPayload = await safeJson(initialResponse);
    return {
      type: "TIP_RESULT",
      result: {
        success: false,
        statusCode: initialResponse.status,
        message: stringifyError(errorPayload) || `Unexpected response: ${initialResponse.status}`
      }
    };
  }

  const paymentRequired = (await initialResponse.json()) as PaymentRequiredResponseDto;
  const requirement = selectPaymentRequirements(paymentRequired, account.chainId);
  if (!requirement) {
    return {
      type: "TIP_RESULT",
      result: {
        success: false,
        statusCode: 400,
        message: `No compatible payment requirements for ${account.chainId}`
      }
    };
  }

  // Block unsupported chains
  if (account.chainId === "zcash-mainnet") {
    return {
      type: "TIP_RESULT",
      result: {
        success: false,
        statusCode: 501,
        message: "Zcash signing is not yet available."
      }
    };
  }

  // Handle POKT vs EVM chains differently
  let paymentHeader: string;
  let signedTransaction: string | undefined;

  if (account.chainId === "pocket-mainnet") {
    // POKT (Cosmos chain) signing
    // Create X-PAYMENT header for Cosmos
    const { header } = await createCosmosPaymentHeader(
      account.privateKey,
      requirement,
      paymentRequired.x402Version
    );
    paymentHeader = header;

    // Create signed POKT transaction
    // TODO: Get POKT RPC URL from settings
    // Note: CosmJS requires Tendermint RPC (HTTP), not gRPC
    // Using Shannon mainnet RPC endpoint
    const poktRpcUrl = "https://shannon-grove-rpc.mainnet.poktroll.com";
    try {
      signedTransaction = await createSignedPoktTransaction(
        account.privateKey,
        {
          toAddress: requirement.payTo,
          amount: requirement.maxAmountRequired,
          memo: memo || "",
        },
        poktRpcUrl
      );
    } catch (error) {
      console.error("Failed to sign POKT transaction:", error);
      return {
        type: "TIP_RESULT",
        result: {
          success: false,
          statusCode: 500,
          message: `Failed to sign POKT transaction: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }

    // Add signedTransaction to request body
    requestBody = {
      ...requestBody,
      signedTransaction,
    };
  } else {
    // EVM chain signing
    const { header } = await createExactEvmPaymentHeader(account.privateKey, requirement, paymentRequired.x402Version);
    paymentHeader = header;
  }

  const settlementResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...commonHeaders,
      "X-PAYMENT": paymentHeader
    },
    body: JSON.stringify(requestBody)
  });

  const settlementBody = await safeJson(settlementResponse);
  if (!SUCCESS_CODES.has(settlementResponse.status)) {
    return {
      type: "TIP_RESULT",
      result: {
        success: false,
        statusCode: settlementResponse.status,
        message: stringifyError(settlementBody) || "Payment failed to settle."
      }
    };
  }

  const tipReceipt = settlementBody as TipResponseDto | undefined;
  const receipt = tipReceipt?.result;
  const paymentResponseHeader = settlementResponse.headers.get("X-PAYMENT-RESPONSE");
  const settlementHeader = paymentResponseHeader ? decodeSettlementHeader(paymentResponseHeader) : undefined;

  return {
    type: "TIP_RESULT",
    result: {
      success: true,
      message: "Tip settled via Grove.",
      tipId: receipt?.tip_id,
      txHash: settlementHeader?.transaction ?? receipt?.tipper_tx_hash,
      tipperTxHash: receipt?.tipper_tx_hash,
      settlementTxHash: receipt?.settlement_tx_hash,
      to: receipt?.to,
      from: receipt?.from,
      amountSent: receipt?.amount_sent,
      amountReceived: receipt?.amount_received,
      feeAmount: receipt?.fee_amount,
      denomination: receipt?.denomination,
      chain: receipt?.chain
    }
  };
}

function computeTipAmountString(amountUsd: number, chain = SUPPORTED_CHAINS.find(item => item.id === "base-mainnet")) {
  if (!chain) {
    return amountUsd.toFixed(2);
  }

  if (chain.kind === "stablecoin") {
    return amountUsd.toFixed(2);
  }

  const usdPerUnit = chain.kind === "pokt" ? cachedSettings.usdPerPokt || DEFAULT_SETTINGS.usdPerPokt : chain.defaultUsdPerUnit;
  const units = amountUsd / usdPerUnit;
  return units.toFixed(3);
}

function selectPaymentRequirements(
  response: PaymentRequiredResponseDto,
  chainId: string
): PaymentRequirementsDto | undefined {
  return (
    response.accepts.find(req => req.network === chainId) ??
    response.accepts.find(req => req.scheme === "exact")
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function stringifyError(payload: unknown): string | undefined {
  if (!payload) return undefined;
  if (typeof payload === "string") return payload;
  if (payload instanceof Error) return payload.message;
  if (typeof payload === "object" && "error" in payload && typeof (payload as { error?: unknown }).error === "string") {
    return (payload as { error: string }).error;
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return undefined;
  }
}

function decodeSettlementHeader(header: string): SettledPaymentHeader | undefined {
  try {
    const decoded = atob(header);
    return JSON.parse(decoded) as SettledPaymentHeader;
  } catch (error) {
    console.warn("Failed to decode settlement header", error);
    return undefined;
  }
}
