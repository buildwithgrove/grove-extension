import { storageGet, storageRemove, storageSet } from "../utils/chrome";
import {
  AccountRecord,
  AccountsPayload,
  DEFAULT_SETTINGS,
  EncryptionMetadata,
  ExtensionSettings,
  StoredCipher
} from "../types";
import { decryptPayload, encryptPayload, generateSalt, toBase64 } from "./crypto";

const ACCOUNTS_KEY = "grove::accounts";
const ENCRYPTION_KEY = "grove::encryption";
const ACTIVE_ACCOUNT_KEY = "grove::active-account";
const SETTINGS_KEY = "grove::settings";

interface UnlockResult {
  accounts: AccountRecord[];
  cipher?: StoredCipher;
}

export async function loadEncryptionMetadata(): Promise<EncryptionMetadata | undefined> {
  return await storageGet<EncryptionMetadata>(ENCRYPTION_KEY);
}

export async function loadStoredCipher(): Promise<StoredCipher | undefined> {
  return await storageGet<StoredCipher>(ACCOUNTS_KEY);
}

export async function initializeVault(passphrase: string, hint?: string): Promise<EncryptionMetadata> {
  const salt = generateSalt();
  const metadata: EncryptionMetadata = {
    version: 1,
    salt: toBase64(salt),
    hint,
    createdAt: new Date().toISOString()
  };
  // Persist empty account payload so future unlocks succeed
  const cipher = await encryptPayload<AccountsPayload>(passphrase, { version: 1, accounts: [] }, metadata.salt);
  await storageSet(ENCRYPTION_KEY, metadata);
  await storageSet<StoredCipher>(ACCOUNTS_KEY, { version: 1, encrypted: cipher.encrypted, iv: cipher.iv });
  return metadata;
}

export async function unlockAccounts(passphrase: string): Promise<UnlockResult> {
  const metadata = await loadEncryptionMetadata();
  if (!metadata) {
    throw new Error("Vault not initialized");
  }
  const storedCipher = await loadStoredCipher();
  if (!storedCipher) {
    return { accounts: [], cipher: undefined };
  }
  const payload = await decryptPayload<AccountsPayload>(
    passphrase,
    storedCipher.encrypted,
    storedCipher.iv,
    metadata.salt
  );
  return { accounts: payload.accounts, cipher: storedCipher };
}

export async function persistAccounts(passphrase: string, accounts: AccountRecord[]): Promise<void> {
  const metadata = await loadEncryptionMetadata();
  if (!metadata) {
    throw new Error("Vault not initialized");
  }
  const cipher = await encryptPayload<AccountsPayload>(passphrase, { version: 1, accounts }, metadata.salt);
  const storedCipher: StoredCipher = {
    version: 1,
    encrypted: cipher.encrypted,
    iv: cipher.iv
  };
  await storageSet(ACCOUNTS_KEY, storedCipher);
}

export async function setActiveAccount(id: string | undefined): Promise<void> {
  if (!id) {
    await storageRemove(ACTIVE_ACCOUNT_KEY);
    return;
  }
  await storageSet(ACTIVE_ACCOUNT_KEY, id);
}

export async function getActiveAccountId(): Promise<string | undefined> {
  return await storageGet<string>(ACTIVE_ACCOUNT_KEY);
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await storageGet<ExtensionSettings>(SETTINGS_KEY, "sync");
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function persistSettings(settings: ExtensionSettings): Promise<void> {
  await storageSet(SETTINGS_KEY, settings, "sync");
}
