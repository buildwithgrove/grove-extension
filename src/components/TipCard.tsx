import { useMemo } from "react";

import { AccountRecord, ChainMetadata, TIP_PRESETS } from "../types";
import { TipResult } from "../types";
import { chainMetaById } from "../hooks/useAccounts";
import { ChainBadge } from "./ChainBadge";

interface TipCardProps {
  domain?: string;
  selectedUsd: number;
  onAmountChange: (usd: number) => void;
  onOpenCustom: () => void;
  onTip: () => void;
  isBusy: boolean;
  tipResult?: TipResult;
  activeAccount?: AccountRecord;
  usdPerPokt: number;
}

export function TipCard({
  domain,
  selectedUsd,
  onAmountChange,
  onOpenCustom,
  onTip,
  isBusy,
  tipResult,
  activeAccount,
  usdPerPokt
}: TipCardProps) {
  const chain = activeAccount ? chainMetaById(activeAccount.chainId) : undefined;
  const secondaryLabel = formatSecondary(selectedUsd, chain, usdPerPokt);
  const isDisabled = !activeAccount || isBusy;

  const statusMessage = useMemo(() => {
    if (!tipResult) return undefined;
    if (tipResult.success) {
      return {
        tone: "success" as const,
        text: chain
          ? `Tip authorized for ${chain.shortLabel}.` + (tipResult.txHash ? ` Tx: ${shortHash(tipResult.txHash)}` : "")
          : "Tip sent successfully."
      };
    }
    return {
      tone: "error" as const,
      text: tipResult.message ?? "Tip failed."
    };
  }, [tipResult, chain]);

  return (
    <div className="tip-card">
      <header className="tip-card-header">
        <div className="tip-domain">
          <h1>{domain ? `Tip ${prettifyDomain(domain)}` : "Pick a site to tip"}</h1>
          <p>{domain ? "We’ll read llms.txt to find the right human to pay." : "Open a tab you want to reward."}</p>
        </div>
        {activeAccount && <ChainBadge chainId={activeAccount.chainId} />}
      </header>

      <div className="tip-amounts">
        <div className="quick-grid">
          {TIP_PRESETS.map(option => (
            <button
              key={option.id}
              type="button"
              className={`quick-chip ${selectedUsd === option.amountUsd ? "active" : ""}`}
              onClick={() => onAmountChange(option.amountUsd)}
            >
              {option.label}
            </button>
          ))}
          <button type="button" className="quick-chip outline" onClick={onOpenCustom}>
            Custom…
          </button>
        </div>
        <div className="amount-summary">
          <span className="primary-number">${selectedUsd.toFixed(2)}</span>
          <span className="secondary-number">{secondaryLabel}</span>
        </div>
      </div>

      <footer className="tip-actions">
        <button type="button" className="tip-button" onClick={onTip} disabled={isDisabled}>
          {isBusy ? "Sending tip…" : `Tip ${selectedUsd >= 1 ? `$${selectedUsd.toFixed(0)}` : `$${selectedUsd.toFixed(2)}`}`}
        </button>
        <span className="tip-disclaimer">Demo flow: we sign with your key, Grove funds the on-chain tip.</span>
      </footer>

      {statusMessage && <div className={`tip-state ${statusMessage.tone}`}>{statusMessage.text}</div>}
    </div>
  );
}

function prettifyDomain(domain: string) {
  try {
    const url = domain.startsWith("http") ? new URL(domain) : new URL(`https://${domain}`);
    return url.hostname.replace("www.", "");
  } catch {
    return domain;
  }
}

function formatSecondary(amountUsd: number, chain: ChainMetadata | undefined, usdPerPokt: number) {
  if (!chain) return ``;
  if (chain.kind === "stablecoin") {
    return `${amountUsd.toFixed(2)} ${chain.currency}`;
  }
  const unitPrice = chain.kind === "pokt" ? usdPerPokt : chain.defaultUsdPerUnit;
  const units = amountUsd / unitPrice;
  return `≈ ${units.toFixed(3)} ${chain.currency}`;
}

function shortHash(hash?: string) {
  if (!hash) return "";
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}
