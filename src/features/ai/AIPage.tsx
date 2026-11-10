import React, { useId, useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, Cloud, Download, Laptop, ListChecks, Lock, RotateCcw, ShieldCheck, Sparkles, Target, Unplug, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { cx } from "../../lib/cx";
import { useAIConnection } from "./AIConnectionProvider";
import { AIConnectionsSection } from "./AIConnectionsSection";
import { RememberSetting } from "./aiActions";
import { ModelMeta } from "./aiUi";
import { validateEndpoint } from "./endpoint";
import { PROVIDERS, type ProviderId } from "./providers";
import { SetupWizard, TestPanel, type WizardPath } from "./SetupWizard";

type View = { kind: "home" } | { kind: "local" } | { kind: "cloud" } | { kind: "wizard"; path: WizardPath };

/** AI assistant: choose and connect your own AI (local or cloud), then use it for planning. */
export const AIPage: React.FC = () => {
  const { state, connected } = useAIConnection();
  const [view, setView] = useState<View>({ kind: "home" });
  const hasSetup = connected || state.restored || state.status.kind !== "idle" || !!state.consentFor;
  const home = () => setView({ kind: "home" });

  return (
    <div className="ai-page">
      <PageHeader
        eyebrow="Bring Your Own AI"
        title="AI assistant"
        description="Optional. Choose the AI that powers AstraFocus: a model on your own computer or your own cloud account. No AstraFocus account needed."
      />

      {view.kind === "wizard" ? (
        <SetupWizard path={view.path} onExit={home} />
      ) : view.kind === "local" ? (
        <LocalChoice onBack={home} onStart={path => setView({ kind: "wizard", path })} />
      ) : view.kind === "cloud" ? (
        <CloudSetup onDone={home} />
      ) : (
        <>
          {hasSetup ? (
            <Dashboard onStart={path => setView({ kind: "wizard", path })} />
          ) : (
            <Welcome onLocal={() => setView({ kind: "local" })} onCloud={() => setView({ kind: "cloud" })} />
          )}
          {hasSetup && (
            <div className="ai-actions ai-page__switch">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setView({ kind: "local" })}>
                <Laptop size={14} aria-hidden /> Use AI on this computer
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setView({ kind: "cloud" })}>
                <Cloud size={14} aria-hidden /> Connect a cloud provider
              </button>
            </div>
          )}
          <details className="card ai-manual">
            <summary>Manual connection: any provider, every setting</summary>
            <AIConnectionsSection />
          </details>
        </>
      )}
    </div>
  );
};

const Welcome: React.FC<{ onLocal: () => void; onCloud: () => void }> = ({ onLocal, onCloud }) => (
  <section className="ai-welcome" aria-label="Choose your AI">
    <button type="button" className="card ai-choice" onClick={onLocal}>
      <span className="ai-choice__icon" aria-hidden><Laptop size={22} /></span>
      <span className="ai-choice__title">Use AI on this computer</span>
      <span className="ai-choice__desc">Run a free model with Ollama or LM Studio. We’ll find it if it’s installed, or walk you through installing one.</span>
      <span className="ai-choice__meta">Free · needs a reasonably capable computer</span>
    </button>
    <button type="button" className="card ai-choice" onClick={onCloud}>
      <span className="ai-choice__icon" aria-hidden><Cloud size={22} /></span>
      <span className="ai-choice__title">Connect a cloud provider</span>
      <span className="ai-choice__desc">Use your own OpenAI account, or another OpenAI-compatible service, with your own API key.</span>
      <span className="ai-choice__meta">Works on any device · billed by your provider</span>
    </button>
    <ul className="ai-welcome__points">
      <li><ShieldCheck size={15} aria-hidden /> AI only sees what you choose to send, and never changes your tasks without your review.</li>
      <li><Lock size={15} aria-hidden /> API keys stay in memory only; they’re never saved or exported.</li>
    </ul>
  </section>
);

const LocalChoice: React.FC<{ onBack: () => void; onStart: (p: WizardPath) => void }> = ({ onBack, onStart }) => (
  <section className="stack" aria-label="Use AI on this computer">
    <button type="button" className="btn btn--ghost btn--sm ai-back" onClick={onBack}><ArrowLeft size={14} aria-hidden /> Back</button>
    <div className="ai-welcome">
      <button type="button" className="card ai-choice" onClick={() => onStart("existing")}>
        <span className="ai-choice__icon" aria-hidden><Laptop size={22} /></span>
        <span className="ai-choice__title">I already have a local AI</span>
        <span className="ai-choice__desc">Ollama, LM Studio or another app is installed. We’ll find it, show your installed models and test one.</span>
        <span className="ai-choice__meta">About 2 minutes</span>
      </button>
      <button type="button" className="card ai-choice" onClick={() => onStart("install")}>
        <span className="ai-choice__icon" aria-hidden><Download size={22} /></span>
        <span className="ai-choice__title">Help me install my first AI</span>
        <span className="ai-choice__desc">Get a model suggestion for your computer and step-by-step install instructions for Windows, macOS or Linux.</span>
        <span className="ai-choice__meta">About 10–20 minutes, plus download time</span>
      </button>
    </div>
    <div className="ai-note ai-note--info" role="note">
      <Laptop size={16} aria-hidden />
      <p>
        <strong>“On this computer” means the device you’re using now.</strong> A local model is reached at <code>localhost</code> /{" "}
        <code>127.0.0.1</code>, which always means the device running this browser. On a phone that points at the phone, so it can’t reach a
        model on your desktop. Local doesn’t automatically mean private either: some local apps can run cloud models.
      </p>
    </div>
  </section>
);

const CLOUD_PROVIDERS: { id: ProviderId; title: string; desc: string }[] = [
  { id: "openai", title: "OpenAI", desc: "Use your OpenAI API key. Requests go to api.openai.com." },
  { id: "custom", title: "Other OpenAI-compatible service", desc: "Any HTTPS service that implements /chat/completions and allows browser requests." },
];

const CloudSetup: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { state, dispatch, connected } = useAIConnection();
  const name = useId();
  const picked = state.provider === "openai" || state.provider === "custom" ? state.provider : null;
  return (
    <section className="card ai-cloud" aria-labelledby="ai-cloud-title">
      <button type="button" className="btn btn--ghost btn--sm ai-back" onClick={onDone}><ArrowLeft size={14} aria-hidden /> Back</button>
      <h2 id="ai-cloud-title" className="ai-wizard__title">Connect a cloud provider</h2>
      <div className="ai-tiers ai-cloud__providers" role="radiogroup" aria-label="Cloud provider">
        {CLOUD_PROVIDERS.map(p => (
          <label key={p.id} className={cx("ai-tier", picked === p.id && "is-selected")}>
            <input type="radio" name={name} className="visually-hidden" checked={picked === p.id} onChange={() => dispatch({ type: "provider", provider: p.id })} />
            <span className="ai-tier__label">{p.title}</span>
            <span className="hint">{p.desc}</span>
          </label>
        ))}
      </div>
      {picked ? (
        <>
          <ul className="ai-explain">
            <li><strong>API base URL:</strong> the address of the provider’s API. {picked === "openai" ? "Already filled in for OpenAI." : "Your provider’s docs list it; it usually ends in /v1 and must start with https://."}</li>
            <li><strong>API key:</strong> a secret from your provider’s dashboard. It stays in this tab’s memory and is forgotten on reload.</li>
            <li><strong>Model:</strong> the exact model ID. Press Load models after allowing the connection to see the ones your key can use.</li>
            <li><strong>Charges:</strong> your provider may bill every request, including connection tests. Use a key with a spending limit.</li>
          </ul>
          <AIConnectionsSection variant="cloud" />
          {connected && (
            <div className="ai-actions">
              <button type="button" className="btn btn--primary" onClick={onDone}><CheckCircle2 size={16} aria-hidden /> Done</button>
            </div>
          )}
        </>
      ) : (
        <p className="muted">Choose a provider to continue.</p>
      )}
    </section>
  );
};

const ACTIONS = [
  { icon: Target, title: "Break a goal into tasks", where: "Goals → Break into tasks", to: "/goals" },
  { icon: CalendarClock, title: "Plan my day", where: "Calendar → Plan my day", to: "/calendar" },
  { icon: Wand2, title: "Improve a task", where: "Open any task → Improve with AI", to: "/tasks" },
];

const ActionsCard: React.FC = () => (
  <section className="card ai-dash__actions-card" aria-labelledby="ai-actions-title">
    <h2 id="ai-actions-title" className="card__title">What you can do</h2>
    <ul className="ai-action-list">
      {ACTIONS.map(a => (
        <li key={a.title}>
          <a.icon size={16} aria-hidden />
          <span>
            <Link to={a.to}>{a.title}</Link>
            <span className="hint"> {a.where}</span>
          </span>
        </li>
      ))}
    </ul>
    <p className="hint ai-action-list__note"><ListChecks size={13} aria-hidden /> Every action shows what will be sent first, and changes nothing until you press Add or Apply.</p>
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
          <p className="hint">Your setup was remembered from last time. Allow the connection and run a check; AstraFocus doesn’t contact it automatically.</p>
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

      <ActionsCard />

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
          <li><Lock size={15} aria-hidden /> <span><strong>Saved on this device:</strong> nothing, unless you turn on “Remember” below. Then only provider, server address and model name. Never API keys or this permission.</span></li>
          {endpoint.ok && !endpoint.isLoopback && (
            <li><AlertTriangle size={15} aria-hidden /> <span>This server isn’t on your computer: text you send leaves your device, and your provider may charge for each request.</span></li>
          )}
        </ul>
        <RememberSetting />
      </section>
    </div>
  );
};
