import { FormEvent, useState } from "react";

import { useAccounts } from "../hooks/useAccounts";
import { useSettings } from "../hooks/useSettings";

export default function OptionsApp() {
  const { settings, updateSettings, isSaving } = useSettings();
  const { accounts } = useAccounts();
  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl);
  const [usdPerPokt, setUsdPerPokt] = useState(settings.usdPerPokt.toString());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedRate = Number.parseFloat(usdPerPokt);
    if (Number.isNaN(parsedRate) || parsedRate <= 0) {
      alert("Use a positive USD/POKT value");
      return;
    }
    await updateSettings({ apiBaseUrl: apiBaseUrl.trim(), usdPerPokt: parsedRate });
    alert("Settings saved");
  };

  return (
    <div className="options-shell">
      <header>
        <h1>Grove Tip Extension</h1>
        <p>{accounts.length} account{accounts.length === 1 ? "" : "s"} stored securely.</p>
      </header>

      <form className="options-form" onSubmit={submit}>
        <label>
          Grove API base URL
          <input value={apiBaseUrl} onChange={event => setApiBaseUrl(event.target.value)} />
        </label>
        <label>
          USD value for 1 POKT
          <input value={usdPerPokt} onChange={event => setUsdPerPokt(event.target.value)} />
        </label>
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
