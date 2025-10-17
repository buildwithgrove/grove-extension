import { FormEvent, useEffect, useMemo, useState } from "react";

import { AccountsProvider, useAccounts } from "../hooks/useAccounts";
import { SettingsProvider, useSettings } from "../hooks/useSettings";
import { AddAccountModal } from "../components/AddAccountModal";
import { AccountDropdown } from "../components/AccountDropdown";
import { TipCard } from "../components/TipCard";
import { CustomAmountModal } from "../components/CustomAmountModal";
import { TipResult } from "../types";
import { sendRuntimeMessage } from "../utils/chrome";
import { RuntimeMessage, RuntimeResponse } from "../types/messages";

export default function App() {
  return (
    <SettingsProvider>
      <AccountsProvider>
        <PopupRoot />
      </AccountsProvider>
    </SettingsProvider>
  );
}

function PopupRoot() {
  const { status } = useAccounts();
  const { isReady: settingsReady } = useSettings();

  if (!settingsReady || status === "initializing" || status === "loading") {
    return <LoadingScreen message="Loading vault…" />;
  }

  if (status === "needs-setup") {
    return <VaultSetupScreen />;
  }

  if (status === "locked") {
    return <UnlockScreen />;
  }

  if (status === "error") {
    return <ErrorScreen />;
  }

  return <TipExperience />;
}

function VaultSetupScreen() {
  const { createVault, isBusy } = useAccounts();
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState<string | undefined>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (passphrase.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (passphrase !== confirm) {
      setError("Passphrases do not match.");
      return;
    }
    try {
      await createVault(passphrase, hint.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="auth-screen">
      <h1>Secure your Grove keys</h1>
      <p>Set a passphrase to encrypt private keys before storing them locally.</p>
      <form onSubmit={submit} className="auth-form">
        <label>
          Passphrase
          <input
            type="password"
            value={passphrase}
            onChange={event => setPassphrase(event.target.value)}
            autoFocus
          />
        </label>
        <label>
          Confirm passphrase
          <input type="password" value={confirm} onChange={event => setConfirm(event.target.value)} />
        </label>
        <label>
          Hint (optional)
          <input
            type="text"
            value={hint}
            onChange={event => setHint(event.target.value)}
            placeholder="In case you forget"
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="primary" disabled={isBusy}>
          {isBusy ? "Creating vault…" : "Create vault"}
        </button>
      </form>
    </div>
  );
}

function UnlockScreen() {
  const { unlock, encryptionHint, isBusy } = useAccounts();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | undefined>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    try {
      await unlock(passphrase);
    } catch (err) {
      setError("Incorrect passphrase. Try again.");
    }
  };

  return (
    <div className="auth-screen">
      <h1>Unlock Grove vault</h1>
      <p>{encryptionHint ? `Hint: ${encryptionHint}` : "Enter your passphrase to continue."}</p>
      <form onSubmit={submit} className="auth-form">
        <label>
          Passphrase
          <input
            type="password"
            value={passphrase}
            onChange={event => setPassphrase(event.target.value)}
            autoFocus
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="primary" disabled={isBusy}>
          {isBusy ? "Unlocking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

function TipExperience() {
  const { accounts, activeAccount, activeAccountId, addAccount, setActiveAccount, markAccountUsed } = useAccounts();
  const { settings, updateSettings } = useSettings();

  const [domain, setDomain] = useState<string | undefined>();
  const [isAddOpen, setAddOpen] = useState(false);
  const [isCustomOpen, setCustomOpen] = useState(false);
  const [customMode, setCustomMode] = useState<"edit" | "confirm">("edit");
  const [selectedUsd, setSelectedUsd] = useState(settings.defaultTipUsd ?? 1);
  const [tipResult, setTipResult] = useState<TipResult | undefined>();
  const [isTipLoading, setTipLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await sendRuntimeMessage<RuntimeMessage, RuntimeResponse>({ type: "GET_ACTIVE_DOMAIN" });
        if (!cancelled && response.type === "ACTIVE_DOMAIN") {
          setDomain(response.domain);
        }
      } catch (error) {
        console.warn("Failed to fetch active domain", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await sendRuntimeMessage<RuntimeMessage, RuntimeResponse>({ type: "SETTINGS_UPDATED", payload: settings });
      } catch (error) {
        console.debug("Settings sync skipped", error);
      }
    })();
  }, [settings]);

  const addAccountHandler = async (payload: Parameters<typeof addAccount>[0]) => {
    await addAccount(payload);
  };

  const runTip = async (amountOverride?: number) => {
    if (!activeAccount) return;
    setTipLoading(true);
    setTipResult(undefined);
    try {
      const nextAmount = amountOverride ?? selectedUsd;
      const response = await sendRuntimeMessage<RuntimeMessage, RuntimeResponse>({
        type: "RUN_TIP",
        payload: {
          account: {
            id: activeAccount.id,
            chainId: activeAccount.chainId,
            address: activeAccount.address,
            privateKey: activeAccount.privateKey
          },
          amountUsd: nextAmount,
          memo: undefined,
          apiBaseUrl: settings.apiBaseUrl,
          domain
        }
      });

      if (response.type === "TIP_RESULT") {
        setTipResult(response.result);
        if (response.result.success) {
          await markAccountUsed(activeAccount.id);
        }
      } else if (response.type === "ERROR") {
        setTipResult({ success: false, message: response.message });
      }
    } catch (error) {
      console.error("Tip failed", error);
      setTipResult({ success: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setTipLoading(false);
    }
  };

  const emptyState = accounts.length === 0;

  return (
    <div className="popup-shell">
      <header className="popup-header">
        {!emptyState && (
          <AccountDropdown
            accounts={accounts}
            activeId={activeAccountId}
            onSelect={setActiveAccount}
            onAddRequest={() => setAddOpen(true)}
          />
        )}
        <button className="icon-button" onClick={() => setAddOpen(true)} aria-label="Add account">
          +
        </button>
      </header>

      {emptyState ? (
        <EmptyState onAdd={() => setAddOpen(true)} />
      ) : (
        <TipCard
          domain={domain}
          selectedUsd={selectedUsd}
          onAmountChange={setSelectedUsd}
          onOpenCustom={() => {
            setCustomMode("edit");
            setCustomOpen(true);
          }}
          onTip={() => {
            setCustomMode("confirm");
            setCustomOpen(true);
          }}
          isBusy={isTipLoading}
          tipResult={tipResult}
          activeAccount={activeAccount}
          usdPerPokt={settings.usdPerPokt}
        />
      )}

      <footer className="popup-footer">
        <span className="api-label">
          API: {settings.apiBaseUrl === "https://grove-api.onrender.com" ? "🌿 Grove Cloud" : settings.apiBaseUrl === "http://localhost:8000" ? "Local" : "Custom"}
        </span>
        <div className="api-controls">
          <button
            className="link"
            onClick={() => {
              const isCloud = settings.apiBaseUrl === "https://grove-api.onrender.com";
              void updateSettings({
                apiBaseUrl: isCloud ? "http://localhost:8000" : "https://grove-api.onrender.com"
              });
            }}
          >
            {settings.apiBaseUrl === "https://grove-api.onrender.com" ? "Local" : "Cloud"}
          </button>
          <button
            className="link"
            onClick={() => {
              const next = window.prompt("Grove API base URL", settings.apiBaseUrl);
              if (next) {
                void updateSettings({ apiBaseUrl: next.trim() });
              }
            }}
          >
            Custom
          </button>
        </div>
      </footer>

      <AddAccountModal open={isAddOpen} onClose={() => setAddOpen(false)} onSubmit={addAccountHandler} />
      <CustomAmountModal
        open={isCustomOpen}
        initialAmount={selectedUsd}
        mode={customMode}
        onClose={() => setCustomOpen(false)}
        onSave={next => {
          setSelectedUsd(next);
          if (customMode === "confirm") {
            void runTip(next);
          }
        }}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <h2>Add an account to begin tipping</h2>
      <p>
        Bring a private key or file, pick the chain, and we’ll encrypt everything locally so that only you control your
        keys.
      </p>
      <button className="primary" onClick={onAdd}>
        Add account
      </button>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="auth-screen">
      <h1>{message}</h1>
    </div>
  );
}

function ErrorScreen() {
  return (
    <div className="auth-screen">
      <h1>Something went wrong</h1>
      <p>Reload the extension or reset the vault from settings.</p>
    </div>
  );
}
