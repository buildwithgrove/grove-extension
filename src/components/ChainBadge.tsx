import { chainMetaById } from "../hooks/useAccounts";
import { ChainId } from "../types";

interface ChainBadgeProps {
  chainId: ChainId;
  compact?: boolean;
}

export function ChainBadge({ chainId, compact = false }: ChainBadgeProps) {
  const chain = chainMetaById(chainId);
  return (
    <span
      className="chain-badge"
      style={{
        background: `linear-gradient(120deg, ${chain.accent} 0%, rgba(20, 71, 85, 0.85) 100%)`
      }}
    >
      <span className="chain-pill-symbol">{chain.shortLabel}</span>
      {!compact && <span className="chain-pill-label">{chain.networkTag}</span>}
    </span>
  );
}
