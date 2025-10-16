import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";

import { AccountRecord, ChainId, EncryptionMetadata, SUPPORTED_CHAINS } from "../types";
import {
  getActiveAccountId,
  initializeVault,
  loadEncryptionMetadata,
  persistAccounts,
  setActiveAccount as persistActiveAccount,
  unlockAccounts
} from "../lib/accountVault";

type AccountsStatus = "initializing" | "needs-setup" | "locked" | "loading" | "ready" | "error";

export interface CreateAccountInput {
  label: string;
  chainId: ChainId;
  address: string;
  privateKey: string;
  memo?: string;
  importedFrom?: AccountRecord["importedFrom"];
}

export interface UpdateAccountInput {
  id: string;
  label?: string;
  memo?: string;
}

interface AccountsContextValue {
  status: AccountsStatus;
  accounts: AccountRecord[];
  activeAccountId?: string;
  activeAccount?: AccountRecord;
  encryptionHint?: string;
  isBusy: boolean;
  createVault: (passphrase: string, hint?: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;
  addAccount: (input: CreateAccountInput) => Promise<void>;
  updateAccount: (input: UpdateAccountInput) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  setActiveAccount: (id: string) => Promise<void>;
  markAccountUsed: (id: string) => Promise<void>;
  lastError?: string;
}

const AccountsContext = createContext<AccountsContextValue | undefined>(undefined);

function randomColorSeed() {
  return Math.floor(Math.random() * 360);
}

export function AccountsProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AccountsStatus>("initializing");
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | undefined>();
  const [metadata, setMetadata] = useState<EncryptionMetadata | undefined>();
  const [lastError, setLastError] = useState<string | undefined>();
  const [encryptionHint, setEncryptionHint] = useState<string | undefined>();
  const [isBusy, setIsBusy] = useState(false);

  const passphraseRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedMetadata, storedActiveId] = await Promise.all([loadEncryptionMetadata(), getActiveAccountId()]);
        if (cancelled) return;
        setMetadata(storedMetadata);
        setEncryptionHint(storedMetadata?.hint);
        setActiveAccountId(storedActiveId);
        setStatus(storedMetadata ? "locked" : "needs-setup");
      } catch (error) {
        console.error("Failed to load vault metadata", error);
        if (!cancelled) {
          setStatus("error");
          setLastError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requirePassphrase = useCallback(() => {
    if (!passphraseRef.current) {
      throw new Error("Vault is locked");
    }
    return passphraseRef.current;
  }, []);

  const createVault = useCallback(
    async (passphrase: string, hint?: string) => {
      setIsBusy(true);
      try {
        const newMetadata = await initializeVault(passphrase, hint);
        passphraseRef.current = passphrase;
        setMetadata(newMetadata);
        setEncryptionHint(newMetadata.hint);
        setAccounts([]);
        setStatus("ready");
        setLastError(undefined);
      } catch (error) {
        console.error("Failed to initialize vault", error);
        setLastError(error instanceof Error ? error.message : String(error));
        setStatus("error");
        throw error;
      } finally {
        setIsBusy(false);
      }
    },
    []
  );

  const unlock = useCallback(
    async (passphrase: string) => {
      setStatus("loading");
      setIsBusy(true);
      try {
        const { accounts: unlockedAccounts } = await unlockAccounts(passphrase);
        passphraseRef.current = passphrase;
        setAccounts(unlockedAccounts);
        setStatus("ready");
        setLastError(undefined);
        if (!activeAccountId && unlockedAccounts.length > 0) {
          const defaultAccount = unlockedAccounts[0];
          await persistActiveAccount(defaultAccount.id);
          setActiveAccountId(defaultAccount.id);
        }
      } catch (error) {
        console.error("Failed to unlock vault", error);
        setStatus("locked");
        setLastError(error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        setIsBusy(false);
      }
    },
    [activeAccountId]
  );

  const lock = useCallback(() => {
    passphraseRef.current = null;
    setAccounts([]);
    setStatus(metadata ? "locked" : "needs-setup");
  }, [metadata]);

  const withPersist = useCallback(
    async (updater: (current: AccountRecord[]) => AccountRecord[]) => {
      const passphrase = requirePassphrase();
      setIsBusy(true);
      try {
        const next = updater(accounts);
        await persistAccounts(passphrase, next);
        setAccounts(next);
      } finally {
        setIsBusy(false);
      }
    },
    [accounts, requirePassphrase]
  );

  const addAccount = useCallback(
    async (input: CreateAccountInput) => {
      let createdId: string | undefined;
      await withPersist(current => {
        const newAccount: AccountRecord = {
          id: uuid(),
          label: input.label.trim() || "New account",
          chainId: input.chainId,
          address: input.address,
          privateKey: input.privateKey,
          memo: input.memo,
          createdAt: new Date().toISOString(),
          colorSeed: randomColorSeed(),
          importedFrom: input.importedFrom
        };
        createdId = newAccount.id;
        return [...current, newAccount];
      });
      if (!activeAccountId && createdId) {
        await persistActiveAccount(createdId);
        setActiveAccountId(createdId);
      }
    },
    [activeAccountId, withPersist]
  );

  const updateAccount = useCallback(
    async (input: UpdateAccountInput) => {
      await withPersist(current =>
        current.map(account => {
          if (account.id !== input.id) return account;
          return {
            ...account,
            label: input.label ?? account.label,
            memo: input.memo ?? account.memo
          };
        })
      );
    },
    [withPersist]
  );

  const removeAccount = useCallback(
    async (id: string) => {
      await withPersist(current => current.filter(account => account.id !== id));
      if (activeAccountId === id) {
        const remaining = accounts.filter(account => account.id !== id);
        const fallback = remaining[0]?.id;
        await persistActiveAccount(fallback);
        setActiveAccountId(fallback);
      }
    },
    [accounts, activeAccountId, withPersist]
  );

  const setActiveAccount = useCallback(async (id: string) => {
    await persistActiveAccount(id);
    setActiveAccountId(id);
  }, []);

  const markAccountUsed = useCallback(
    async (id: string) => {
      await withPersist(current =>
        current.map(account => {
          if (account.id !== id) return account;
          return {
            ...account,
            lastUsedAt: new Date().toISOString()
          };
        })
      );
    },
    [withPersist]
  );

  const activeAccount = useMemo(
    () => accounts.find(account => account.id === activeAccountId),
    [accounts, activeAccountId]
  );

  const value = useMemo<AccountsContextValue>(
    () => ({
      status,
      accounts,
      activeAccountId,
      activeAccount,
      encryptionHint,
      isBusy,
      createVault,
      unlock,
      lock,
      addAccount,
      updateAccount,
      removeAccount,
      setActiveAccount,
      markAccountUsed,
      lastError
    }),
    [
      status,
      accounts,
      activeAccountId,
      activeAccount,
      encryptionHint,
      isBusy,
      createVault,
      unlock,
      lock,
      addAccount,
      updateAccount,
      removeAccount,
      setActiveAccount,
      markAccountUsed,
      lastError
    ]
  );

  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>;
}

export function useAccounts() {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error("useAccounts must be used within AccountsProvider");
  }
  return context;
}

export function chainMetaById(chainId: ChainId) {
  return SUPPORTED_CHAINS.find(chain => chain.id === chainId) ?? SUPPORTED_CHAINS[0];
}

export function formatAddress(address: string) {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
