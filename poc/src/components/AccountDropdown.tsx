import { AccountRecord } from "../types";
import { ChainBadge } from "./ChainBadge";

interface AccountDropdownProps {
  accounts: AccountRecord[];
  activeId?: string;
  onSelect: (id: string) => void;
  onAddRequest: () => void;
}

export function AccountDropdown({ accounts, activeId, onSelect, onAddRequest }: AccountDropdownProps) {
  const active = accounts.find(account => account.id === activeId);
  return (
    <div className="account-dropdown">
      <div className="account-info">
        {active ? (
          <>
            <ChainBadge chainId={active.chainId} compact />
            <div className="account-labels">
              <span className="account-name">{active.label}</span>
              <span className="account-address">{shortAddress(active.address)}</span>
            </div>
          </>
        ) : (
          <span className="account-empty">No account selected</span>
        )}
      </div>
      <div className="account-controls">
        <select
          value={activeId ?? accounts[0]?.id ?? ""}
          onChange={event => {
            if (event.target.value === "__add__") {
              onAddRequest();
            } else {
              onSelect(event.target.value);
            }
          }}
        >
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.label}
            </option>
          ))}
          <option value="__add__">➕ Add new account…</option>
        </select>
      </div>
    </div>
  );
}

function shortAddress(address: string) {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
