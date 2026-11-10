import React, { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Info, Loader2, Plug, RefreshCw, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cx } from "../../lib/cx";
import { useAIConnection } from "./AIConnectionProvider";
import { validateEndpoint } from "./endpoint";
import { PROVIDER_ORDER, PROVIDERS, type ProviderId } from "./providers";

/** Settings → AI connections. Optional; everything else in AstraFocus works without it. */
export const AIConnectionsSection: React.FC = () => {
  const { state, dispatch, testConnection, loadModels, cancel, connected } = useAIConnection();
  const [showKey, setShowKey] = useState(false);
  const [urlDraft, setUrlDraft] = useState(state.baseUrl);
  const location = useLocation();
  const sectionRef = useRef<HTMLElement>(null);
  const providerRef = useRef<HTMLSelectElement>(null);
  const ids = { provider: useId(), url: useId(), model: useId(), key: useId(), models: useId(), consent: useId(), urlHint: useId(), keyHint: useId() };

  const preset = PROVIDERS[state.provider];
  const endpoint = validateEndpoint(state.baseUrl);
  const busy = state.status.kind === "testing";
  const consented = endpoint.ok && state.consentFor === endpoint.baseUrl;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Keep the draft in sync when the provider preset replaces the URL.
  useEffect(() => setUrlDraft(state.baseUrl), [state.baseUrl]);

  // /settings?section=ai (linked from the goal planner) scrolls here.
  useEffect(() => {
    if (new URLSearchParams(location.search).get("section") === "ai") {
      sectionRef.current?.scrollIntoView({ block: "start" });
      providerRef.current?.focus({ preventScroll: true });
    }
  }, [location.search]);

  /** Commit the URL on blur/Enter so typing doesn't wipe the key on every keystroke. */
  const commitUrl = () => {
    if (urlDraft !== state.baseUrl) dispatch({ type: "baseUrl", baseUrl: urlDraft.trim() });
  };

  return (
    <section ref={sectionRef} id="ai-connections" className="card settings-section ai-section" aria-labelledby="ai-connections-title">
      <div className="ai-section__head">
        <h2 id="ai-connections-title" className="settings-section__title">
          AI connections <span className="chip chip--outline">Optional</span>
        </h2>
        <ConnectionBadge />
      </div>
      <p className="setting-row__desc ai-section__intro">
        Connect a model you run yourself, or your own provider account, to get help breaking goals into tasks. AstraFocus works fully without
        it, and never sends anything in the background.
      </p>

      <div className="ai-note ai-note--info" role="note">
        <Info size={16} aria-hidden />
        <p>
          <strong>Kept in memory only.</strong> Your connection and key stay in this tab while you move around the app. Reloading or closing
          AstraFocus forgets them. They’re never saved to this device, included in exports, or sent anywhere except the server you approve below.
        </p>
      </div>

      <div className="ai-form">
        <div className="field">
          <label className="label" htmlFor={ids.provider}>Provider</label>
          <select
            ref={providerRef}
            id={ids.provider}
            className="select"
            value={state.provider}
            onChange={e => {
              setShowKey(false);
              dispatch({ type: "provider", provider: e.target.value as ProviderId });
            }}
          >
            {PROVIDER_ORDER.map(id => (
              <option key={id} value={id}>{PROVIDERS[id].label}</option>
            ))}
          </select>
          <p className="hint">{preset.setupHint}</p>
        </div>

        <div className="field">
          <label className="label" htmlFor={ids.url}>API base URL</label>
          <input
            id={ids.url}
            className={cx("input", urlDraft.trim() && !validateEndpoint(urlDraft).ok && "is-invalid")}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={preset.defaultBaseUrl || "https://your-server.example.com/v1"}
            value={urlDraft}
            aria-describedby={ids.urlHint}
            aria-invalid={!!urlDraft.trim() && !validateEndpoint(urlDraft).ok}
            onChange={e => setUrlDraft(e.target.value)}
            onBlur={commitUrl}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), commitUrl())}
          />
          <p id={ids.urlHint} className={cx("hint ai-wrap", urlDraft.trim() && !validateEndpoint(urlDraft).ok && "ai-hint--error")}>
            {!urlDraft.trim()
              ? "Usually ends in /v1."
              : validateEndpoint(urlDraft).ok
                ? "Changing this clears the key, consent and connection status."
                : (validateEndpoint(urlDraft) as { error: string }).error}
          </p>
        </div>

        <div className="field">
          <label className="label" htmlFor={ids.model}>Model</label>
          <div className="ai-inline">
            <input
              id={ids.model}
              className="input"
              autoComplete="off"
              spellCheck={false}
              list={state.models?.length ? ids.models : undefined}
              placeholder={preset.modelPlaceholder}
              value={state.model}
              onChange={e => dispatch({ type: "model", model: e.target.value })}
            />
            <button type="button" className="btn" onClick={() => void loadModels()} disabled={busy || !consented} title={consented ? "Ask the server which models it has" : "Confirm the destination first"}>
              <RefreshCw size={15} aria-hidden /> Load models
            </button>
          </div>
          {state.models && state.models.length > 0 && (
            <>
              <datalist id={ids.models}>
                {state.models.map(m => <option key={m} value={m} />)}
              </datalist>
              <p className="hint">{state.models.length} {state.models.length === 1 ? "model" : "models"} found. Start typing to pick one, or enter a name manually.</p>
            </>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor={ids.key}>
            API key {!preset.keyRequired && <span className="muted">(optional)</span>}
          </label>
          <div className="ai-inline">
            <input
              id={ids.key}
              className="input ai-key"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              placeholder={preset.keyRequired ? "Paste your key here" : "Leave empty if not needed"}
              value={state.apiKey}
              aria-describedby={ids.keyHint}
              onChange={e => dispatch({ type: "apiKey", apiKey: e.target.value })}
            />
            <button type="button" className="btn btn--icon" onClick={() => setShowKey(v => !v)} aria-label={showKey ? "Hide API key" : "Show API key"} aria-pressed={showKey}>
              {showKey ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
          <p id={ids.keyHint} className="hint">{preset.keyHint}</p>
        </div>
      </div>

      {endpoint.ok && (
        <div className="ai-consent">
          <p className="ai-consent__dest">
            Requests will go to <strong className="ai-wrap">{endpoint.baseUrl}</strong>
          </p>
          <ul className="ai-consent__list">
            {endpoint.isLoopback ? (
              <li>
                This is a server on your own device. Being on localhost doesn’t guarantee the model runs locally: some servers (for example
                Ollama’s cloud models) forward requests to an online service.
              </li>
            ) : (
              <li>Text you send, such as a goal you ask to break down, goes to {endpoint.host} and is handled under that provider’s terms.</li>
            )}
            {!endpoint.isLoopback && <li>Provider charges may apply to every request, including connection tests.</li>}
            <li>A key held by a web page isn’t a secure vault: browser extensions or other code on this page could read it. Use a key with a spending limit.</li>
            <li>Nothing is sent until you press a button. AstraFocus never sends your tasks or other data on its own.</li>
          </ul>
          <label className="ai-consent__check" htmlFor={ids.consent}>
            <input
              id={ids.consent}
              type="checkbox"
              className="check check--accent"
              checked={consented}
              onChange={e => dispatch({ type: "consent", value: e.target.checked })}
            />
            <span>Allow AstraFocus to send requests to <strong className="ai-wrap">{endpoint.host}</strong></span>
          </label>
        </div>
      )}

      <div className="ai-actions">
        {busy ? (
          <button type="button" className="btn" onClick={cancel}>
            <X size={15} aria-hidden /> Cancel
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => void testConnection()} disabled={!consented}>
            <Plug size={15} aria-hidden /> Test connection
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            cancel();
            setShowKey(false);
            dispatch({ type: "clear" });
          }}
          disabled={!state.apiKey && !state.model && !state.consentFor && state.status.kind === "idle" && !state.models && state.baseUrl === preset.defaultBaseUrl}
        >
          Clear connection
        </button>
      </div>

      <StatusLine connected={connected} />

      <details className="ai-help">
        <summary>Can’t connect? Setup and browser notes</summary>
        <div className="ai-help__body">
          <p>
            AstraFocus talks to the server straight from your browser, with no proxy in between. The server must allow requests from{" "}
            <code className="ai-wrap">{origin}</code> (CORS).
          </p>
          <ul>
            <li>
              <strong>Ollama:</strong> by default it accepts browser requests only from pages on this device (localhost or 127.0.0.1). To allow
              this site, set the environment variable <code>OLLAMA_ORIGINS</code> to <code className="ai-wrap">{origin}</code>, then quit and
              restart Ollama. On Windows, use
              “Edit environment variables for your account”. Keep Ollama bound to 127.0.0.1; don’t expose it to your network or the internet.
            </li>
            <li><strong>LM Studio:</strong> in the Developer tab, start the server and turn on Enable CORS.</li>
            <li>
              <strong>Browser permission:</strong> when a website contacts a server on your device, recent versions of Chrome and Edge ask
              whether to allow access to local network devices. Choose Allow. Some browsers block it entirely; running AstraFocus locally with
              <code>npm run dev</code> avoids that.
            </li>
            <li><strong>Cloud providers</strong> must allow direct browser requests. If a provider blocks them, it can’t be used here; AstraFocus doesn’t route keys through a third-party proxy.</li>
          </ul>
        </div>
      </details>
    </section>
  );
};

const ConnectionBadge: React.FC = () => {
  const { state, connected } = useAIConnection();
  if (state.status.kind === "testing") return <span className="chip"><Loader2 size={13} className="ai-spin" aria-hidden /> Checking…</span>;
  if (connected) return <span className="chip chip--success"><CheckCircle2 size={13} aria-hidden /> Connected</span>;
  return <span className="chip chip--outline">Not connected</span>;
};

const StatusLine: React.FC<{ connected: boolean }> = ({ connected }) => {
  const { state } = useAIConnection();
  const s = state.status;
  return (
    <div className="ai-status" role="status" aria-live="polite">
      {s.kind === "testing" && (
        <p className="ai-status__row"><Loader2 size={16} className="ai-spin" aria-hidden /> Contacting the server…</p>
      )}
      {s.kind === "connected" && connected && (
        <p className="ai-status__row ai-status--ok"><CheckCircle2 size={16} aria-hidden /> <span className="ai-wrap">Connected. {s.detail}</span></p>
      )}
      {s.kind === "error" && (
        <p className="ai-status__row ai-status--error"><AlertTriangle size={16} aria-hidden /> <span className="ai-wrap">{s.message}</span></p>
      )}
    </div>
  );
};
