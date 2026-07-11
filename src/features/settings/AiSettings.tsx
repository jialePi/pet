import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import type {
  UserAiProvider,
  UserAiSettings,
} from "../../lib/ai/userAiSettings";

type AiSettingsProps = {
  settings?: UserAiSettings;
  onSave: (settings: UserAiSettings) => void;
  onClear: () => void;
};

export function AiSettings({ settings, onSave, onClear }: AiSettingsProps) {
  const [provider, setProvider] = useState<UserAiProvider>(
    settings?.provider ?? "google",
  );
  const [apiKey, setApiKey] = useState(settings?.apiKey ?? "");
  const [showKey, setShowKey] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    setProvider(settings?.provider ?? "google");
    setApiKey(settings?.apiKey ?? "");
  }, [settings]);

  function save() {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;
    onSave({ provider, apiKey: trimmedKey });
    setSavedMessage("API key saved for this browser session.");
  }

  function clear() {
    onClear();
    setApiKey("");
    setShowKey(false);
    setSavedMessage("API key cleared from this browser session.");
  }

  return (
    <section className="settings-view">
      <div className="section-heading">
        <div>
          <span className="eyebrow">AI settings</span>
          <h1>Use your own API key</h1>
        </div>
        <span className={`connection-chip ${settings ? "connected" : "local"}`}>
          {settings ? `${providerLabel(settings.provider)} connected` : "Local rules only"}
        </span>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <KeyRound aria-hidden="true" />
          <div>
            <h2>Provider</h2>
            <p>Choose the account that should pay for your optional AI requests.</p>
          </div>
          <label>
            AI provider
            <select
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value as UserAiProvider)
              }
            >
              <option value="google">Google AI Studio</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>

          <label>
            API key
            <span className="api-key-input">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setSavedMessage("");
                }}
                placeholder={
                  provider === "google" ? "Enter Google AI key" : "Enter OpenAI key"
                }
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowKey((current) => !current)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </span>
          </label>

          <div className="action-row">
            <button className="primary" disabled={!apiKey.trim()} onClick={save}>
              <ShieldCheck aria-hidden="true" /> Save for this session
            </button>
            {settings && (
              <button onClick={clear}>
                <Trash2 aria-hidden="true" /> Clear key
              </button>
            )}
          </div>
          {savedMessage && <p className="settings-message" role="status">{savedMessage}</p>}
        </div>

        <aside className="privacy-card">
          <ShieldCheck aria-hidden="true" />
          <h2>How your key is handled</h2>
          <ul>
            <li>Stored only in this tab's session storage.</li>
            <li>Sent over HTTPS only when you request an AI feature.</li>
            <li>Forwarded by the Cloudflare Worker to your selected provider.</li>
            <li>Never written to the repository or returned in an API response.</li>
            <li>Cleared when you clear it here or close the browser session.</li>
          </ul>
          <p>
            Browser extensions and scripts running on this site can access session data.
            Use a restricted key with a spending limit, and revoke it if you suspect exposure.
          </p>
        </aside>
      </div>
    </section>
  );
}

function providerLabel(provider: UserAiProvider): string {
  return provider === "google" ? "Google AI" : "OpenAI";
}
