const isExtensionRuntime = typeof chrome !== "undefined" && !!chrome.runtime;
const hasStorage = isExtensionRuntime && !!chrome.storage;

type StorageArea = "local" | "sync" | "session";

async function withFallback<T>(fallback: () => T | Promise<T>, task: () => T | Promise<T>): Promise<T> {
  if (!isExtensionRuntime) {
    return await fallback();
  }
  try {
    return await task();
  } catch {
    return await fallback();
  }
}

function getArea(area: StorageArea) {
  if (!hasStorage) {
    return undefined;
  }
  switch (area) {
    case "local":
      return chrome.storage.local;
    case "sync":
      return chrome.storage.sync;
    case "session":
      return (chrome.storage as { session?: chrome.storage.StorageArea }).session ?? chrome.storage.local;
    default:
      return chrome.storage.local;
  }
}

export async function storageGet<T = unknown>(key: string, area: StorageArea = "local"): Promise<T | undefined> {
  return withFallback(
    async () => {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    },
    async () =>
      new Promise<T | undefined>(resolve => {
        const storageArea = getArea(area);
        if (!storageArea) {
          resolve(undefined);
          return;
        }
        storageArea.get([key], result => {
          resolve(result?.[key] as T | undefined);
        });
      })
  );
}

export async function storageSet<T>(key: string, value: T, area: StorageArea = "local"): Promise<void> {
  return withFallback(
    async () => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    async () =>
      new Promise<void>(resolve => {
        const storageArea = getArea(area);
        if (!storageArea) {
          resolve();
          return;
        }
        storageArea.set({ [key]: value }, () => resolve());
      })
  );
}

export async function storageRemove(key: string, area: StorageArea = "local"): Promise<void> {
  return withFallback(
    async () => {
      window.localStorage.removeItem(key);
    },
    async () =>
      new Promise<void>(resolve => {
        const storageArea = getArea(area);
        if (!storageArea) {
          resolve();
          return;
        }
        storageArea.remove(key, () => resolve());
      })
  );
}

export async function sendRuntimeMessage<TRequest, TResponse>(message: TRequest): Promise<TResponse> {
  if (!isExtensionRuntime) {
    throw new Error("Chrome runtime messaging is not available outside extension context.");
  }
  return await new Promise<TResponse>((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(lastError);
        return;
      }
      resolve(response as TResponse);
    });
  });
}

export async function queryActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  if (!isExtensionRuntime || !chrome.tabs) {
    return undefined;
  }
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0];
}

export function isRunningInExtension(): boolean {
  return isExtensionRuntime;
}
