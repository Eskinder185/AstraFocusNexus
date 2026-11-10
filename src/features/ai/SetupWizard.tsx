import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Cpu, Loader2, Play, Radar, RefreshCw, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cx } from "../../lib/cx";
import { useAIConnection } from "./AIConnectionProvider";
import { CommandBlock, DiagnosticsList, GuideSteps, ModelMeta, SourceBadge } from "./aiUi";
import { RememberSetting } from "./aiActions";
import type { ScanResult } from "./discovery";
import { validateEndpoint } from "./endpoint";
import { applySignals, emptyProfile, readBrowserSignals, type AiTask, type Field, type GpuVendor, type HardwareProfile, type OS } from "./hardware";
import { LM_STUDIO_STEPS, OS_LABELS, isLocalOrigin, modelSteps, ollamaInstallSteps, ollamaOriginSteps, ollamaServerSteps } from "./installGuide";
import { PROVIDER_ORDER, PROVIDERS, type ProviderId } from "./providers";
import { accelLabel, recommend } from "./recommend";

export type WizardPath = "existing" | "install";
type StepId = "computer" | "recommend" | "install" | "download" | "allow" | "find" | "model" | "test" | "done";

const STEPS: Record<WizardPath, StepId[]> = {
  existing: ["find", "model", "test", "done"],
  install: ["computer", "recommend", "install", "download", "allow", "find", "model", "test", "done"],
};

const TITLES: Record<StepId, string> = {
  computer: "About your computer",
  recommend: "Choose a model",
  install: "Install Ollama",
  download: "Download your model",
  allow: "Let AstraFocus connect",
  find: "Find your local AI",
  model: "Pick a model",
  test: "Test the connection",
  done: "You’re all set",
};

const SHORT: Record<StepId, string> = {
  computer: "Computer",
  recommend: "Model",
  install: "Install",
  download: "Download",
  allow: "Allow",
  find: "Find",
  model: "Pick",
  test: "Test",
  done: "Done",
};

type GuideOS = Exclude<OS, "other">;

export const SetupWizard: React.FC<{ path: WizardPath; onExit: () => void }> = ({ path, onExit }) => {
  const steps = STEPS[path];
  const [index, setIndex] = useState(0);
  const [profile, setProfile] = useState<HardwareProfile>(() => applySignals(emptyProfile(), readBrowserSignals()));
  const [plannedModel, setPlannedModel] = useState<string | null>(null);
  const [guideOs, setGuideOs] = useState<GuideOS>(() => (profile.os.value === "other" ? "windows" : profile.os.value));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const step = steps[index];
  const { connected, state } = useAIConnection();

  // Move focus to the new step's heading so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [index]);

  useEffect(() => {
    if (profile.os.value !== "other") setGuideOs(profile.os.value);
  }, [profile.os.value]);

  const endpoint = validateEndpoint(state.baseUrl);
  const consented = endpoint.ok && state.consentFor === endpoint.baseUrl;
  const canNext: Record<StepId, boolean> = {
    computer: true,
    recommend: true,
    install: true,
    download: true,
    allow: true,
    find: consented,
    model: !!state.model.trim(),
    test: connected,
    done: true,
  };
  const blockedReason: Partial<Record<StepId, string>> = {
    find: "Choose a server and allow AstraFocus to contact it to continue.",
    model: "Pick a model to continue.",
    test: "Run the connection test. You can continue once it passes.",
  };

  return (
    <section className="card ai-wizard" aria-labelledby="ai-wizard-title">
      <div className="ai-wizard__top">
        <p className="eyebrow" id="ai-wizard-title">
          {path === "install" ? "Install your first local AI" : "Connect your local AI"}
        </p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>
          <X size={15} aria-hidden /> Exit setup
        </button>
      </div>

      <nav aria-label="Setup progress" className="ai-progress">
        <p className="ai-progress__count">
          Step {index + 1} of {steps.length}
        </p>
        <div className="progress" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}>
          <div className="progress__fill" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <ol className="ai-progress__steps">
          {steps.map((s, i) => (
            <li key={s} className={cx(i < index && "is-done", i === index && "is-current")} aria-current={i === index ? "step" : undefined}>
              {i < index ? <CheckCircle2 size={13} aria-hidden /> : <span className="ai-progress__num">{i + 1}</span>}
              <span>{SHORT[s]}</span>
            </li>
          ))}
        </ol>
      </nav>

      <h2 ref={headingRef} tabIndex={-1} className="ai-wizard__title">
        {TITLES[step]}
      </h2>

      <div className="ai-wizard__body">
        {step === "computer" && <ComputerStep profile={profile} setProfile={setProfile} />}
        {step === "recommend" && <RecommendStep profile={profile} planned={plannedModel} setPlanned={setPlannedModel} />}
        {step === "install" && <InstallStep os={guideOs} setOs={setGuideOs} />}
        {step === "download" && <DownloadStep model={plannedModel} os={guideOs} />}
        {step === "allow" && <AllowStep os={guideOs} setOs={setGuideOs} />}
        {step === "find" && <FindStep os={guideOs} />}
        {step === "model" && <ModelStep planned={plannedModel} />}
        {step === "test" && <TestStep />}
        {step === "done" && <DoneStep onExit={onExit} />}
      </div>

      <div className="ai-wizard__nav">
        <button type="button" className="btn btn--ghost" onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0}>
          <ArrowLeft size={16} aria-hidden /> Back
        </button>
        {step !== "done" && (
          <>
            {!canNext[step] && blockedReason[step] && <p className="hint ai-wizard__why">{blockedReason[step]}</p>}
            <button type="button" className="btn btn--primary" onClick={() => setIndex(i => Math.min(steps.length - 1, i + 1))} disabled={!canNext[step]}>
              Next <ArrowRight size={16} aria-hidden />
            </button>
          </>
        )}
      </div>
    </section>
  );
};

/* ---------------- Steps ---------------- */

const OS_OPTIONS: { id: OS; label: string }[] = [
  { id: "windows", label: "Windows" },
  { id: "mac", label: "macOS" },
  { id: "linux", label: "Linux" },
  { id: "other", label: "Other / not sure" },
];
const GPU_OPTIONS: { id: GpuVendor; label: string }[] = [
  { id: "nvidia", label: "NVIDIA" },
  { id: "amd", label: "AMD" },
  { id: "apple", label: "Apple Silicon (M-series)" },
  { id: "intel", label: "Intel (integrated or Arc)" },
  { id: "other", label: "Other" },
  { id: "none", label: "None / not sure" },
];
const TASKS: { id: AiTask; label: string }[] = [
  { id: "planning", label: "Planning and breaking down goals" },
  { id: "writing", label: "Writing and summarising" },
  { id: "coding", label: "Coding help" },
  { id: "long-documents", label: "Long notes and documents" },
];

const ComputerStep: React.FC<{ profile: HardwareProfile; setProfile: React.Dispatch<React.SetStateAction<HardwareProfile>> }> = ({ profile, setProfile }) => {
  const set = <K extends keyof HardwareProfile>(key: K, value: HardwareProfile[K] extends Field<infer T> ? T : never) =>
    setProfile(p => ({ ...p, [key]: { value, source: "manual" } }));
  const numOrNull = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v)));
  const id = useId();
  const isApple = profile.gpuVendor.value === "apple";

  return (
    <div className="stack">
      <p className="muted">
        This helps us suggest a model your computer can run. Your browser can only share a little, so check the values and fill in what you know.
        Nothing here leaves your device.
      </p>
      <div className="ai-hw">
        <HwField id={`${id}-os`} label="Operating system" field={profile.os}>
          <select id={`${id}-os`} className="select" value={profile.os.value} onChange={e => set("os", e.target.value as OS)}>
            {OS_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </HwField>
        <HwField id={`${id}-cpu`} label="Processor (CPU)" field={profile.cpuModel} hint="Browsers can’t see this. Optional, e.g. “Ryzen 7 5800X” or “Apple M2”.">
          <input id={`${id}-cpu`} className="input" value={profile.cpuModel.value} placeholder="Optional" onChange={e => set("cpuModel", e.target.value)} />
        </HwField>
        <HwField id={`${id}-ram`} label="Memory (RAM), GB" field={profile.ramGb}>
          <input id={`${id}-ram`} className="input" type="number" min={1} max={1024} inputMode="numeric" value={profile.ramGb.value ?? ""} placeholder="e.g. 16" onChange={e => set("ramGb", numOrNull(e.target.value))} />
        </HwField>
        <HwField id={`${id}-gpu`} label="Graphics (GPU)" field={profile.gpuVendor}>
          <select id={`${id}-gpu`} className="select" value={profile.gpuVendor.value} onChange={e => set("gpuVendor", e.target.value as GpuVendor)}>
            {GPU_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </HwField>
        <HwField id={`${id}-gpum`} label="Graphics model" field={profile.gpuModel}>
          <input id={`${id}-gpum`} className="input" value={profile.gpuModel.value} placeholder="Optional, e.g. RTX 4070" onChange={e => set("gpuModel", e.target.value)} />
        </HwField>
        {!isApple && (
          <HwField id={`${id}-vram`} label="Graphics memory (VRAM), GB" field={profile.vramGb} hint="Browsers can’t see this. Windows: Task Manager → Performance → GPU → Dedicated GPU memory.">
            <input id={`${id}-vram`} className="input" type="number" min={0} max={256} inputMode="numeric" value={profile.vramGb.value ?? ""} placeholder="e.g. 8" onChange={e => set("vramGb", numOrNull(e.target.value))} />
          </HwField>
        )}
        <HwField id={`${id}-disk`} label="Free disk space, GB" field={profile.diskFreeGb} hint="Browsers can’t see this. Models need 1–20 GB each.">
          <input id={`${id}-disk`} className="input" type="number" min={0} inputMode="numeric" value={profile.diskFreeGb.value ?? ""} placeholder="Optional" onChange={e => set("diskFreeGb", numOrNull(e.target.value))} />
        </HwField>
        {profile.cpuThreads.value != null && (
          <div className="field">
            <span className="label ai-hw__label">CPU threads <SourceBadge source={profile.cpuThreads.source} /></span>
            <p className="ai-hw__static tabular">{profile.cpuThreads.value}</p>
            {profile.cpuThreads.note && <p className="hint">{profile.cpuThreads.note}</p>}
          </div>
        )}
      </div>
      {isApple && <p className="hint">Apple Silicon shares memory between the CPU and GPU, so your RAM is what matters.</p>}
      <fieldset className="ai-tasks">
        <legend className="label">What will you use AI for?</legend>
        {TASKS.map(t => (
          <label key={t.id} className="ai-tasks__item">
            <input
              type="checkbox"
              className="check check--accent"
              checked={profile.tasks.includes(t.id)}
              onChange={e => setProfile(p => ({ ...p, tasks: e.target.checked ? [...p.tasks, t.id] : p.tasks.filter(x => x !== t.id) }))}
            />
            {t.label}
          </label>
        ))}
      </fieldset>
    </div>
  );
};

const HwField: React.FC<{ id: string; label: string; field: Field<unknown>; hint?: string; children: React.ReactNode }> = ({ id, label, field, hint, children }) => (
  <div className="field">
    <label className="label ai-hw__label" htmlFor={id}>
      {label} <SourceBadge source={field.source} />
    </label>
    {children}
    {(field.source === "detected" && field.note) || hint ? <p className="hint ai-wrap">{field.source === "detected" && field.note ? field.note : hint}</p> : null}
  </div>
);

const RecommendStep: React.FC<{ profile: HardwareProfile; planned: string | null; setPlanned: (t: string) => void }> = ({ profile, planned, setPlanned }) => {
  const rec = useMemo(() => recommend(profile), [profile]);
  const name = useId();
  useEffect(() => {
    if (!planned && rec.tiers.length) setPlanned((rec.tiers.find(t => t.id === "balanced") ?? rec.tiers[0]).fit.model.tag);
  }, [rec, planned, setPlanned]);

  return (
    <div className="stack">
      <p className="muted">
        Based on what you told us, these models should run on your computer. Sizes and memory are estimates, not benchmarks: real speed depends on your
        drivers and what else is running.
      </p>
      {rec.warnings.length > 0 && (
        <ul className="ai-warnings">
          {rec.warnings.map(w => (
            <li key={w}><AlertTriangle size={14} aria-hidden /> <span>{w}</span></li>
          ))}
        </ul>
      )}
      {rec.tiers.length > 0 ? (
        <div className="ai-tiers" role="radiogroup" aria-label="Recommended models">
          {rec.tiers.map(t => {
            const selected = planned === t.fit.model.tag;
            return (
              <label key={t.id} className={cx("ai-tier", selected && "is-selected")}>
                <input type="radio" name={name} className="visually-hidden" checked={selected} onChange={() => setPlanned(t.fit.model.tag)} />
                <span className="ai-tier__head">
                  <span className="ai-tier__label">{t.label}</span>
                  {t.id === "balanced" && <span className="chip chip--accent">Suggested</span>}
                </span>
                <span className="ai-tier__name">{t.fit.model.family} <code>{t.fit.model.tag}</code></span>
                <span className="ai-tier__facts">
                  <span>Download ≈ {t.fit.model.downloadGb} GB</span>
                  <span>Needs ≈ {t.fit.memoryGb} GB memory</span>
                  <span>{accelLabel(t.fit.accel)}</span>
                </span>
                <span className="hint">{t.fit.model.note}</span>
                <span className="ai-tier__tradeoff">{t.tradeoff}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="muted">You can still try the smallest model (<code>llama3.2:1b</code>, about 1.3 GB), or connect a cloud provider from the AI page.</p>
      )}
      <p className="hint">
        Estimated with ≈{Math.round(rec.contextTokens / 1024)}K tokens of context and a {rec.budget.primaryGb} GB memory budget for{" "}
        {rec.budget.kind === "cpu" ? "the CPU" : rec.budget.kind === "unified" ? "unified memory" : "your graphics card"}.
      </p>
    </div>
  );
};

const OsTabs: React.FC<{ os: GuideOS; setOs: (o: GuideOS) => void }> = ({ os, setOs }) => (
  <div className="segmented" role="radiogroup" aria-label="Operating system">
    {(Object.keys(OS_LABELS) as GuideOS[]).map(o => (
      <button key={o} type="button" role="radio" aria-checked={os === o} onClick={() => setOs(o)}>
        {OS_LABELS[o]}
      </button>
    ))}
  </div>
);

const InstallStep: React.FC<{ os: GuideOS; setOs: (o: GuideOS) => void }> = ({ os, setOs }) => (
  <div className="stack">
    <p className="muted">
      Ollama is a free app that runs AI models on your own computer. AstraFocus doesn’t download or install anything for you: follow these steps
      yourself.
    </p>
    <OsTabs os={os} setOs={setOs} />
    <GuideSteps steps={ollamaInstallSteps(os)} />
    <details className="ai-help">
      <summary>Starting and stopping Ollama</summary>
      <div className="ai-help__body">
        <GuideSteps steps={ollamaServerSteps(os)} />
      </div>
    </details>
    <details className="ai-help">
      <summary>Prefer LM Studio?</summary>
      <div className="ai-help__body">
        <p>LM Studio is another free app with a visual model browser. AstraFocus can connect to it too.</p>
        <GuideSteps steps={LM_STUDIO_STEPS} />
      </div>
    </details>
  </div>
);

const DownloadStep: React.FC<{ model: string | null; os: GuideOS }> = ({ model, os }) => (
  <div className="stack">
    <p className="muted">
      {model ? (
        <>Open {os === "windows" ? "PowerShell or Terminal" : "Terminal"} and download <code>{model}</code>.</>
      ) : (
        <>Open a terminal and download a model. Replace &lt;model&gt; with a name from ollama.com/library.</>
      )}
    </p>
    <GuideSteps steps={modelSteps(model ?? "<model>")} />
    <p className="hint">Models are stored by Ollama on this computer. Remove one later with <code>ollama rm {model ?? "<model>"}</code>.</p>
  </div>
);

const AllowStep: React.FC<{ os: GuideOS; setOs: (o: GuideOS) => void }> = ({ os, setOs }) => {
  const origin = window.location.origin;
  if (isLocalOrigin(origin)) {
    return (
      <div className="stack">
        <p className="ai-note ai-note--info"><CheckCircle2 size={16} aria-hidden /> <span>You’re running AstraFocus from this computer ({origin}). Ollama already accepts requests from local pages, so there’s nothing to change.</span></p>
      </div>
    );
  }
  return (
    <div className="stack">
      <p className="muted">
        For safety, Ollama only answers web pages it trusts. Add AstraFocus (<code className="ai-wrap">{origin}</code>) to its list. This doesn’t open
        Ollama to the internet; it stays on your computer.
      </p>
      <OsTabs os={os} setOs={setOs} />
      <GuideSteps steps={ollamaOriginSteps(os, origin)} />
      <p className="hint">
        Don’t set <code>OLLAMA_HOST</code> to <code>0.0.0.0</code>: that would let other devices on your network use Ollama without a password.
      </p>
      <BrowserPermissionNote />
    </div>
  );
};

const BrowserPermissionNote: React.FC = () => (
  <p className="hint">
    Chrome and Edge may ask whether this site can “access other apps and services on this device” or your local network the first time it
    connects. Choose Allow. If your browser blocks it, run AstraFocus locally instead (see the docs).
  </p>
);

const FindStep: React.FC<{ os: GuideOS }> = ({ os }) => {
  const { state, dispatch, scan, cancel } = useAIConnection();
  const [results, setResults] = useState<ScanResult[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderId>(state.provider);
  const [url, setUrl] = useState(state.baseUrl);
  const ids = { p: useId(), u: useId(), c: useId() };
  const endpoint = validateEndpoint(state.baseUrl);
  const consented = endpoint.ok && state.consentFor === endpoint.baseUrl;
  const origin = window.location.origin;

  const doScan = async () => {
    setScanning(true);
    try {
      setResults(await scan());
    } catch {
      setResults(null);
    } finally {
      setScanning(false);
    }
  };

  const use = (r: Extract<ScanResult, { status: "found" }>) => {
    dispatch({ type: "destination", provider: r.target.provider, baseUrl: r.target.baseUrl });
    dispatch({ type: "models", models: r.models });
    setChosen(r.target.id);
  };

  const urlCheck = validateEndpoint(url);

  return (
    <div className="stack">
      <p className="muted">
        AstraFocus can look for AI apps running on this computer. It checks the usual local addresses (ports 11434, 1234 and 8080 on 127.0.0.1) and
        sends no personal data.
      </p>
      <div className="ai-actions">
        {scanning ? (
          <button type="button" className="btn" onClick={cancel}><X size={15} aria-hidden /> Stop</button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => void doScan()}>
            <Radar size={16} aria-hidden /> Scan this computer
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={() => setManual(m => !m)} aria-expanded={manual}>
          Enter an address instead
        </button>
      </div>
      <div role="status" aria-live="polite">
        {scanning && <p className="ai-status__row"><Loader2 size={16} className="ai-spin" aria-hidden /> Looking for local AI…</p>}
      </div>

      {results && (
        <ul className="ai-scan" aria-label="Scan results">
          {results.map(r => {
            const active = r.status === "found" && chosen === r.target.id && state.baseUrl === r.target.baseUrl && state.provider === r.target.provider;
            return (
              <li key={r.target.id} className={cx("ai-scan__item", `is-${r.status}`, active && "is-active")}>
                <div className="ai-scan__main">
                  <p className="ai-scan__name">{r.target.label}</p>
                  <p className="hint ai-wrap">{r.target.baseUrl}</p>
                  <p className="ai-scan__state">
                    {r.status === "found" && <>Found · {r.models.length} {r.models.length === 1 ? "model" : "models"} · {r.latencyMs} ms</>}
                    {r.status === "unreachable" && <>Not reachable from this page</>}
                    {r.status === "blocked" && <>Running, but blocked this website</>}
                    {r.status === "error" && <span className="ai-wrap">{r.message}</span>}
                  </p>
                </div>
                {r.status === "found" &&
                  (active ? (
                    <span className="chip chip--success"><CheckCircle2 size={13} aria-hidden /> Selected</span>
                  ) : (
                    <button type="button" className="btn btn--sm" onClick={() => use(r)}>Use this</button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}

      {results && !results.some(r => r.status === "found") && (
        <div className="ai-note ai-note--warning" role="note">
          <AlertTriangle size={16} aria-hidden />
          <div className="ai-wrap">
            <p><strong>Nothing answered.</strong> A browser can’t tell whether the app isn’t running or is blocking this website. Check:</p>
            <ul className="ai-consent__list">
              <li>Ollama or LM Studio is open and running (see “Starting and stopping” in the install step).</li>
              {!isLocalOrigin(origin) && <li>Ollama allows this website: set <code>OLLAMA_ORIGINS</code> (the “Let AstraFocus connect” step) and restart it. In LM Studio, turn on Enable CORS.</li>}
              <li>Your browser didn’t block access to local apps. Look for a permission prompt or icon in the address bar.</li>
            </ul>
          </div>
        </div>
      )}
      {results?.some(r => r.status === "blocked") && !isLocalOrigin(origin) && (
        <details className="ai-help" open>
          <summary>Allow this website in Ollama</summary>
          <div className="ai-help__body"><GuideSteps steps={ollamaOriginSteps(os, origin)} /></div>
        </details>
      )}

      {manual && (
        <div className="ai-form ai-form--compact">
          <div className="field">
            <label className="label" htmlFor={ids.p}>App</label>
            <select
              id={ids.p}
              className="select"
              value={provider}
              onChange={e => {
                const p = e.target.value as ProviderId;
                setProvider(p);
                setUrl(PROVIDERS[p].defaultBaseUrl);
              }}
            >
              {PROVIDER_ORDER.map(p => <option key={p} value={p}>{PROVIDERS[p].label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor={ids.u}>Server address</label>
            <div className="ai-inline">
              <input id={ids.u} className="input" value={url} spellCheck={false} autoComplete="off" onChange={e => setUrl(e.target.value)} aria-invalid={!!url && !urlCheck.ok} />
              <button
                type="button"
                className="btn"
                disabled={!urlCheck.ok}
                onClick={() => {
                  dispatch({ type: "destination", provider, baseUrl: url.trim() });
                  setChosen("manual");
                }}
              >
                Use
              </button>
            </div>
            <p className={cx("hint ai-wrap", url && !urlCheck.ok && "ai-hint--error")}>{urlCheck.ok ? "Cloud providers and keys: use Manual connection on the AI page." : urlCheck.error}</p>
          </div>
        </div>
      )}

      {endpoint.ok && (chosen || state.restored || consented) && (
        <div className="ai-consent">
          <p className="ai-consent__dest">
            Selected: <strong>{PROVIDERS[state.provider].label}</strong> at <strong className="ai-wrap">{endpoint.baseUrl}</strong>
          </p>
          {!endpoint.isLoopback && <p className="hint">This server isn’t on this computer. Text you send will leave your device.</p>}
          <label className="ai-consent__check" htmlFor={ids.c}>
            <input id={ids.c} type="checkbox" className="check check--accent" checked={consented} onChange={e => dispatch({ type: "consent", value: e.target.checked })} />
            <span>Allow AstraFocus to send requests to <strong className="ai-wrap">{endpoint.host}</strong> when I ask it to</span>
          </label>
        </div>
      )}
    </div>
  );
};

const ModelStep: React.FC<{ planned: string | null }> = ({ planned }) => {
  const { state, dispatch, loadModels } = useAIConnection();
  const name = useId();
  const manualId = useId();
  const models = state.models ?? [];
  const busy = state.status.kind === "testing";
  const plannedMissing = planned && state.models && !models.some(m => m.id === planned);

  useEffect(() => {
    if (!state.model && planned && models.some(m => m.id === planned)) dispatch({ type: "model", model: planned });
  }, [planned, models, state.model, dispatch]);

  return (
    <div className="stack">
      <div className="ai-actions">
        <p className="muted ai-grow">
          {state.models ? `${models.length} ${models.length === 1 ? "model" : "models"} on this server.` : "Load the list of models on your server."}
        </p>
        <button type="button" className="btn btn--sm" onClick={() => void loadModels()} disabled={busy}>
          <RefreshCw size={14} aria-hidden /> {state.models ? "Refresh" : "Load models"}
        </button>
      </div>
      {state.status.kind === "error" && <p className="ai-status__row ai-status--error" role="alert"><AlertTriangle size={16} aria-hidden /> <span className="ai-wrap">{state.status.message}</span></p>}
      {plannedMissing && (
        <div className="ai-note ai-note--warning" role="note">
          <AlertTriangle size={16} aria-hidden />
          <div className="ai-wrap">
            <p><code>{planned}</code> isn’t downloaded yet. Run this, then press Refresh:</p>
            <CommandBlock text={`ollama pull ${planned}`} />
          </div>
        </div>
      )}
      {models.length > 0 && (
        <div className="ai-models" role="radiogroup" aria-label="Installed models">
          {models.map(m => (
            <label key={m.id} className={cx("ai-model", state.model === m.id && "is-selected")}>
              <input type="radio" name={name} className="check check--accent" checked={state.model === m.id} onChange={() => dispatch({ type: "model", model: m.id })} />
              <span className="ai-model__text">
                <span className="ai-model__name ai-wrap">
                  {m.id} {m.id === planned && <span className="chip chip--accent">Recommended</span>}
                </span>
                <ModelMeta model={m} />
              </span>
            </label>
          ))}
        </div>
      )}
      <div className="field">
        <label className="label" htmlFor={manualId}>Or type a model name</label>
        <input id={manualId} className="input" value={state.model} spellCheck={false} autoComplete="off" placeholder={PROVIDERS[state.provider].modelPlaceholder} onChange={e => dispatch({ type: "model", model: e.target.value })} />
      </div>
    </div>
  );
};

export const TestPanel: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { state, testConnection, runInferenceTest, cancel, connected } = useAIConnection();
  const [streamText, setStreamText] = useState("");
  const [running, setRunning] = useState<"connection" | "inference" | null>(null);
  const inference = state.inference;

  const runConnection = async () => {
    setRunning("connection");
    try {
      await testConnection();
    } finally {
      setRunning(null);
    }
  };
  const runPrompt = async () => {
    setStreamText("");
    setRunning("inference");
    try {
      await runInferenceTest(piece => setStreamText(t => t + piece));
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="stack">
      {!compact && <p className="muted">First we check the server and model (no text is generated). Then you can send a short test prompt to measure speed.</p>}
      <div className="ai-actions">
        {running ? (
          <button type="button" className="btn" onClick={cancel}><X size={15} aria-hidden /> Cancel</button>
        ) : (
          <>
            <button type="button" className={cx("btn", !connected && "btn--primary")} onClick={() => void runConnection()}>
              <Cpu size={15} aria-hidden /> {connected ? "Check again" : "Run connection test"}
            </button>
            <button type="button" className={cx("btn", connected && !inference && "btn--primary")} onClick={() => void runPrompt()} disabled={!connected}>
              <Play size={15} aria-hidden /> Send a test prompt
            </button>
          </>
        )}
      </div>
      <DiagnosticsList items={state.diagnostics} />
      {(running === "inference" || streamText || inference) && (
        <div className="ai-reply">
          <p className="label">Model reply</p>
          <p className="ai-reply__text ai-wrap" aria-live="off">{running === "inference" ? streamText || "…" : (streamText || inference?.text)}</p>
        </div>
      )}
      <div role="status" aria-live="polite" className="ai-status">
        {state.status.kind === "connected" && connected && !running && (
          <p className="ai-status__row ai-status--ok"><CheckCircle2 size={16} aria-hidden /> <span className="ai-wrap">Connected. {state.status.detail}</span></p>
        )}
        {state.status.kind === "error" && !running && (
          <p className="ai-status__row ai-status--error"><AlertTriangle size={16} aria-hidden /> <span className="ai-wrap">{state.status.message}</span></p>
        )}
      </div>
    </div>
  );
};

const TestStep: React.FC = () => <TestPanel />;

const DoneStep: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { state } = useAIConnection();
  const inferenceOk = state.diagnostics.some(d => d.id === "inference" && d.state === "ok");
  return (
    <div className="stack">
      <p className="ai-note ai-note--info">
        <Sparkles size={16} aria-hidden />
        <span>
          AstraFocus is connected to <strong className="ai-wrap">{state.model}</strong>.{" "}
          {inferenceOk ? "The test prompt worked." : "Tip: send a test prompt from the AI page to check speed."}
        </span>
      </p>
      <ul className="ai-consent__list">
        <li>Use it from Goals → <strong>Break into tasks</strong>.</li>
        <li>AI only sees text you choose to send, and never changes your tasks without your review.</li>
      </ul>
      <RememberSetting />
      <div className="ai-actions">
        <Link to="/goals" className="btn btn--primary"><Sparkles size={16} aria-hidden /> Break a goal into tasks</Link>
        <button type="button" className="btn" onClick={onExit}>Go to AI dashboard</button>
      </div>
    </div>
  );
};
