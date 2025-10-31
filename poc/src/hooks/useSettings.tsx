import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { loadSettings, persistSettings } from "../lib/accountVault";
import { DEFAULT_SETTINGS, ExtensionSettings } from "../types";

interface SettingsContextValue {
  settings: ExtensionSettings;
  isReady: boolean;
  isSaving: boolean;
  updateSettings: (next: Partial<ExtensionSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadSettings();
        if (!cancelled) {
          setSettings(loaded);
          setIsReady(true);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
        if (!cancelled) {
          setIsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(async (next: Partial<ExtensionSettings>) => {
    setIsSaving(true);
    try {
      const merged = { ...settings, ...next };
      await persistSettings(merged);
      setSettings(merged);
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      isReady,
      isSaving,
      updateSettings
    }),
    [settings, isReady, isSaving, updateSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
