import React, { useId, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, HardDrive, Laptop, Lock, RotateCcw, ShieldCheck, Sparkles, Unplug } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { cx } from "../../lib/cx";
import { useAIConnection } from "./AIConnectionProvider";
import { AIConnectionsSection } from "./AIConnectionsSection";
import { ModelMeta } from "./aiUi";
import { validateEndpoint } from "./endpoint";
import { PROVIDERS } from "./providers";
import { SetupWizard, TestPanel, type WizardPath } from "./SetupWizard";

/** AI assistant: guided local setup, connection dashboard and manual connection. */
export const AIPage: React.FC = () => {
  const { state, connected } = useAIConnection();
  const [wizard, setWizard] = useState<WizardPath | null>(null);
  const hasSetup = connected || state.restored || state.status.kind !== "idle" || !!state.consentFor;

  return (
    <div className="ai-page">
      <PageHeader
        title="AI assistant"
        description="Optional. Connect an AI model that runs on your own computer, then use it to plan your work. No AstraFocus account needed."
      />

      {wizard ? (
        <SetupWizard path={wizard} onExit={() => setWizard(null)} />
      ) : (
        <>
          {!hasSetup && <Welcome onStart={setWizard} />}
          {hasSetup && <Dashboard onStart={setWizard} />}
          <details className="card ai-manual">
            <summary>Manual connection: cloud providers, custom servers and API keys</summary>
            <AIConnectionsSection />
          </details>
        </>
      )}
    </div>
  );
};

const Welcome: React.FC<{ onStart: (p: WizardPath) => void }> = ({ onStart }) => (
  <section className="ai-welcome" aria-label="Get started">
    <button type="button" className="card ai-choice" onClick={() => onStart("existing")}>
      <span className="ai-choice__icon" aria-hidden><Laptop size={22} /></span>
      <span className="ai-choice__title">I already have a local AI</span>
      <span className="ai-choice__desc">Ollama, LM Studio or another app is installed. We’ll find it, pick a model and test it.</span>
      <span className="ai-choice__meta">About 2 minutes</span>
    </button>
    <button type="button" className="card ai-choice" onClick={() => onStart("install")}>
      <span className="ai-choice__icon" aria-hidden><Download size={22} /></span>
      <span className="ai-choice__title">Help me install my first AI</span>
      <span className="ai-choice__desc">Get a model suggestion for your computer and step-by-step install instructions for Windows, macOS or Linux.</span>
      <span className="ai-choice__meta">About 10–20 minutes, plus download time</span>
    </button>
    <ul className="ai-welcome__points">
      <li><Lock size={15} aria-hidden /> Runs on your computer. Your prompts don’t go to AstraFocus.</li>
      <li><ShieldCheck size={15} aria-hidden /> AI never changes your tasks without your review.</li>
      <li><HardDrive size={15} aria-hidden /> Free: local models cost nothing to use.</li>
    </ul>
  </section>
);

const Dashboard: React.FC<{ onStart: (p: WizardPath) => void }> = ({ onStart }) => {
  const { state, dispatch, connected, loadModels, disconnect, reset } = useAIConnection();
  const endpoint = validateEndpoint(state.baseUrl);
  const consented = endpoint.ok && state.consentFor === endpoint.baseUrl;
  const ids = { model: useId(), consent: useId() };
  const details = state.modelDetails?.id === state.model.trim() ? state.modelDetails : state.models?.find(m => m.id === state.model) ?? null;
  const s = state.status;
  const statusLabel = connected
    ? "Connected"
    : s.kind === "testing"
      ? "Checking…"
      : s.kind === "error"
        ? "Problem"
        : state.restored
          ? "Saved, not checked yet"
          : "Not connected";

  return (
    <div className="ai-dash">
      <section className="card ai-dash__status" aria-labelledby="ai-status-title">
        <div className="ai-dash__head">
          <h2 id="ai-status-title" className="card__title">Connection</h2>
          <span className={cx("chip", connected ? "chip--success" : s.kind === "error" ? "chip--danger" : "chip--outline")}>
            {connected ? <CheckCircle2 size={13} aria-hidden /> : s.kind === "error" ? <AlertTriangle size={13} aria-hidden /> : null} {statusLabel}
          </span>
        </div>
        <dl className="ai-facts">
          <div><dt>Provider</dt><dd>{PROVIDERS[state.provider].label}</dd></div>
          <div><dt>Server</dt><dd className="ai-wrap">{state.baseUrl || "—"}{state.serverVersion && <span className="hint"> · Ollama {state.serverVersion}</span>}</dd></div>
          <div><dt>Model</dt><dd className="ai-wrap">{state.model || "—"}</dd></div>
          <div><dt>Last checked</dt><dd>{s.kind === "connected" ? new Date(s.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Not this session"}</dd></div>
        </dl>
        {state.restored && !connected && (
          <p className="hint">Your local setup was remembered from last time. Run a check to confirm it still works; AstraFocus doesn’t contact it automatically.</p>
        )}
        <TestPanel compact />
        <div className="ai-actions ai-dash__actions">
          <button type="button" className="btn btn--ghost" onClick={() => onStart("existing")}>Run setup again</button>
          <button type="button" className="btn btn--ghost" onClick={disconnect} disabled={!connected && !state.consentFor && !state.apiKey}>
            <Unplug size={15} aria-hidden /> Disconnect
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--danger"
            onClick={() => {
              if (window.confirm("Reset AI settings? This forgets the server, model and permissions on this device.")) reset();
            }}
          >
            <RotateCcw size={15} aria-hidden /> Reset
          </button>
        </div>
      </section>

      <section className="card ai-dash__model" aria-labelledby="ai-model-title">
        <h2 id="ai-model-title" className="card__title">Default model</h2>
        <div className="field">
          <label className="label" htmlFor={ids.model}>Model used by AstraFocus</label>
          <div className="ai-inline">
            {state.models && state.models.length > 0 ? (
              <select id={ids.model} className="select" value={state.model} onChange={e => dispatch({ type: "model", model: e.target.value })}>
                {!state.models.some(m => m.id === state.model) && <option value={state.model}>{state.model || "Choose a model"}</option>}
                {state.models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
              </select>
            ) : (
              <input id={ids.model} className="input" value={state.model} spellCheck={false} autoComplete="off" onChange={e => dispatch({ type: "model", model: e.target.value })} />
            )}
            <button type="button" className="btn" onClick={() => void loadModels()} disabled={!consented || s.kind === "testing"}>Load models</button>
          </div>
          <p className="hint">Changing the model means checking the connection again.</p>
        </div>
        {details ? (
          <div className="ai-capabilities">
            <p className="label">Capabilities</p>
            <ModelMeta model={details} />
          </div>
        ) : (
          <p className="hint">Run a connection check to see this model’s capabilities.</p>
        )}
        <Link to="/goals" className="btn btn--sm ai-dash__use"><Sparkles size={14} aria-hidden /> Use it: Break a goal into tasks</Link>
      </section>

      <section className="card ai-dash__privacy" aria-labelledby="ai-privacy-title">
        <h2 id="ai-privacy-title" className="card__title">Privacy and permissions</h2>
        {endpoint.ok && (
          <label className="ai-consent__check" htmlFor={ids.consent}>
            <input id={ids.consent} type="checkbox" className="check check--accent" checked={consented} onChange={e => dispatch({ type: "consent", value: e.target.checked })} />
            <span>Allow AstraFocus to send requests to <strong className="ai-wrap">{endpoint.host}</strong> when I ask it to</span>
          </label>
        )}
        <ul className="ai-perm">
          <li><ShieldCheck size={15} aria-hidden /> <span><strong>What AI receives:</strong> only text you choose to send, shown to you first. Never your whole workspace.</span></li>
          <li><ShieldCheck size={15} aria-hidden /> <span><strong>What AI can change:</strong> nothing by itself. Suggestions become tasks only after you review them and press Add.</span></li>
          <li><ShieldCheck size={15} aria-hidden /> <span><strong>Background activity:</strong> none. AstraFocus only contacts the server when you press a button.</span></li>
          <li><Lock size={15} aria-hidden /> <span><strong>Saved on this device:</strong> provider, local server address, model name and this permission, for servers on this computer only. API keys are never saved.</span></li>
          {endpoint.ok && !endpoint.isLoopback && (
            <li><AlertTriangle size={15} aria-hidden /> <span>This server isn’t on your computer, so its settings aren’t remembered and text you send leaves your device.</span></li>
          )}
        </ul>
      </section>
    </div>
  );
};
