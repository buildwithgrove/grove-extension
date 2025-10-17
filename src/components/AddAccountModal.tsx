import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAccounts } from "../hooks/useAccounts";
import { ChainId, DEFAULT_CHAIN_ID, SUPPORTED_CHAINS } from "../types";
import { validatePrivateKey, requiresManualAddress } from "../utils/account";
import { Modal } from "./Modal";
import { ChainBadge } from "./ChainBadge";

interface AddAccountModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    label: string;
    chainId: ChainId;
    address: string;
    privateKey: string;
    memo?: string;
    importedFrom?: "text" | "file" | "clipboard";
  }) => Promise<void>;
}

export function AddAccountModal({ open, onClose, onSubmit }: AddAccountModalProps) {
  const { accounts } = useAccounts();
  const [chainId, setChainId] = useState<ChainId>(DEFAULT_CHAIN_ID);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<"idle" | "validating" | "submitting">("idle");
  const [importSource, setImportSource] = useState<"text" | "file" | "clipboard">("text");

  const chainMeta = useMemo(() => SUPPORTED_CHAINS.find(chain => chain.id === chainId)!, [chainId]);
  const addressRequired = requiresManualAddress(chainMeta);
  const [derivedAddress, setDerivedAddress] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    if (!addressRequired && privateKey) {
      (async () => {
        const result = await validatePrivateKey(chainId, privateKey);
        if (!cancelled && result.valid && result.address) {
          setDerivedAddress(result.address);
        } else if (!cancelled) {
          setDerivedAddress(undefined);
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [chainId, privateKey, addressRequired]);

  const effectiveAddress = addressRequired ? address.trim() : derivedAddress ?? address.trim();

  const handleFileDrop = async (file: File) => {
    const text = await file.text();
    const cleaned = text.trim();
    if (cleaned) {
      setPrivateKey(cleaned);
      setImportSource("file");
    }
  };

  const resetState = () => {
    setChainId(DEFAULT_CHAIN_ID);
    setLabel("");
    setAddress("");
    setPrivateKey("");
    setError(undefined);
    setStatus("idle");
    setImportSource("text");
  };

  const closeAndReset = () => {
    resetState();
    onClose();
  };

  const submit = async (evt: FormEvent) => {
    evt.preventDefault();
    setStatus("validating");
    setError(undefined);

    const validation = await validatePrivateKey(chainId, privateKey);
    if (!validation.valid || !validation.normalizedKey) {
      setError(validation.message ?? "Private key is not valid for the selected chain.");
      setStatus("idle");
      return;
    }

    if (addressRequired && !address.trim()) {
      setError("Please provide the public address for this account.");
      setStatus("idle");
      return;
    }

    if (!effectiveAddress) {
      setError("Unable to derive an address from the provided key.");
      setStatus("idle");
      return;
    }

    setStatus("submitting");
    try {
      await onSubmit({
        label: label.trim() || `${chainMeta.shortLabel} account`,
        chainId,
        privateKey: validation.normalizedKey,
        address: effectiveAddress,
        importedFrom: importSource
      });
      closeAndReset();
    } catch (err) {
      console.error("Failed to add account", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStatus("idle");
    }
  };

  return (
    <Modal open={open} onClose={closeAndReset} title="Add account" width={680}>
      <form className="add-account-form" onSubmit={submit}>
        <section className="form-block">
          <label htmlFor="account-chain">Select chain</label>
          <div className="chain-selector">
            <select
              id="account-chain"
              value={chainId}
              onChange={event => {
                const next = event.target.value as ChainId;
                setChainId(next);
                setError(undefined);
              }}
            >
              {SUPPORTED_CHAINS.map(chain => (
                <option key={chain.id} value={chain.id} disabled={chain.comingSoon && chain.id !== chainId}>
                  {chain.label}
                  {chain.comingSoon ? " (soon)" : ""}
                </option>
              ))}
            </select>
            <ChainBadge chainId={chainId} />
          </div>
          {chainMeta.comingSoon && (
            <p className="hint warning">This chain is on the roadmap. You can still store keys to be ready.</p>
          )}
        </section>

        <section className="form-block">
          <label htmlFor="account-label">Display name</label>
          <input
            id="account-label"
            type="text"
            placeholder="e.g. Research wallet"
            value={label}
            onChange={event => setLabel(event.target.value)}
          />
        </section>

        {addressRequired && (
          <section className="form-block">
            <label htmlFor="account-address">Public address</label>
            <input
              id="account-address"
              type="text"
              placeholder={chainMeta.kind === "pokt" ? "pokt1…" : "zs…"}
              value={address}
              onChange={event => setAddress(event.target.value)}
              required
            />
            <p className="hint">We can’t derive {chainMeta.currency} addresses yet—paste the address you want to send tips from.</p>
          </section>
        )}

        <section className="form-block">
          <label htmlFor="account-key">Private key or file</label>
          <div
            className="dropzone"
            onDragOver={event => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={event => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) {
                void handleFileDrop(file);
              }
            }}
          >
            <textarea
              id="account-key"
              placeholder="Paste private key, mnemonic, or drop a .txt/.json file"
              value={privateKey}
              onChange={event => {
                setPrivateKey(event.target.value);
                setImportSource("text");
              }}
              rows={4}
            />
            <div className="dropzone-footer">
              <label className="upload-button">
                <input
                  type="file"
                  accept=".txt,.json,.key,.pem"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleFileDrop(file);
                    }
                  }}
                  hidden
                />
                Drag & drop or browse
              </label>
              <span className="hint">Stored with local AES-256 encryption.</span>
            </div>
          </div>
        </section>

        {!addressRequired && derivedAddress && (
          <section className="form-block preview">
            <label>Derived address</label>
            <code>{derivedAddress}</code>
          </section>
        )}

        {error && <div className="form-error">{error}</div>}

        <footer className="form-actions">
          <button type="button" className="secondary" onClick={closeAndReset}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={status !== "idle"}>
            {status === "submitting" ? "Saving…" : "Save account"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
