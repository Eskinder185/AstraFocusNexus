/** Small presentational pieces shared by the AI setup wizard and dashboard. */
import React, { useState } from "react";
import { AlertTriangle, Check, CheckCircle2, CircleDashed, Copy, ExternalLink, Loader2, MinusCircle } from "lucide-react";
import { useAppToast } from "../../context/AppToast";
import { cx } from "../../lib/cx";
import type { ModelInfo } from "./client";
import type { Diagnostic } from "./connectionState";
import type { Source } from "./hardware";
import type { GuideStep } from "./installGuide";

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers/contexts without the async clipboard API.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label = "Copy" }) => {
  const { showToast } = useAppToast();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn--sm ai-copy"
      onClick={async () => {
        const ok = await copyText(text);
        if (ok) {
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } else showToast("Couldn’t copy. Select the text and copy it manually.", { tone: "warning" });
      }}
      aria-label={`${label}: ${text.split("\n")[0]}`}
    >
      {done ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {done ? "Copied" : label}
    </button>
  );
};

export const CommandBlock: React.FC<{ text: string; label?: string }> = ({ text, label }) => (
  <div className="ai-cmd">
    {label && <span className="ai-cmd__label">{label}</span>}
    <pre className="ai-cmd__text" tabIndex={0} aria-label={label ? `${label} command` : "Command"}>
      <code>{text}</code>
    </pre>
    <CopyButton text={text} />
  </div>
);

export const GuideSteps: React.FC<{ steps: GuideStep[] }> = ({ steps }) => (
  <ol className="ai-guide">
    {steps.map(s => (
      <li key={s.title} className="ai-guide__step">
        <p className="ai-guide__title">{s.title}</p>
        <p className="ai-guide__body">{s.body}</p>
        {s.link && (
          <a className="btn btn--sm ai-guide__link" href={s.link.href} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} aria-hidden /> {s.link.label}
          </a>
        )}
        {s.commands?.map(c => <CommandBlock key={c.text} text={c.text} label={c.label} />)}
        {s.note && <p className="hint ai-wrap">{s.note}</p>}
      </li>
    ))}
  </ol>
);

export const SourceBadge: React.FC<{ source: Source }> = ({ source }) =>
  source === "detected" ? (
    <span className="chip chip--accent ai-badge">Detected</span>
  ) : source === "manual" ? (
    <span className="chip chip--success ai-badge">You entered</span>
  ) : (
    <span className="chip chip--outline ai-badge">Unknown</span>
  );

export const DiagnosticsList: React.FC<{ items: Diagnostic[] }> = ({ items }) =>
  items.length ? (
    <ul className="ai-diag" aria-label="Connection checks">
      {items.map(d => (
        <li key={d.id} className={cx("ai-diag__item", `is-${d.state}`)}>
          <span className="ai-diag__icon" aria-hidden>
            {d.state === "ok" ? <CheckCircle2 size={16} /> : d.state === "fail" ? <AlertTriangle size={16} /> : d.state === "running" ? <Loader2 size={16} className="ai-spin" /> : <MinusCircle size={16} />}
          </span>
          <span className="ai-diag__text">
            <span className="ai-diag__label">
              {d.label}
              <span className="visually-hidden">: {d.state === "ok" ? "passed" : d.state === "fail" ? "failed" : d.state === "running" ? "in progress" : "skipped"}</span>
            </span>
            <span className="ai-diag__detail ai-wrap">{d.detail}</span>
          </span>
          {d.ms != null && <span className="ai-diag__ms tabular">{d.ms < 1000 ? `${d.ms} ms` : `${(d.ms / 1000).toFixed(1)} s`}</span>}
        </li>
      ))}
    </ul>
  ) : null;

export const formatGb = (bytes?: number) => (bytes ? `${(bytes / 1e9).toFixed(bytes > 1e10 ? 0 : 1)} GB` : null);

const CAPABILITY_LABELS: Record<string, string> = { completion: "Text", vision: "Images", tools: "Tools", thinking: "Reasoning", embedding: "Embeddings", insert: "Fill-in" };

export const ModelMeta: React.FC<{ model: ModelInfo }> = ({ model }) => {
  const bits = [
    model.parameterSize && `${model.parameterSize} parameters`,
    model.quantization,
    formatGb(model.sizeBytes),
    model.contextLength && `${model.contextLength >= 1000 ? Math.round(model.contextLength / 1024) + "K" : model.contextLength} context`,
  ].filter(Boolean);
  return (
    <span className="ai-model-meta">
      {bits.length > 0 && <span className="hint">{bits.join(" · ")}</span>}
      {model.capabilities?.length ? (
        <span className="ai-caps">
          {model.capabilities.map(c => (
            <span key={c} className="chip chip--outline">{CAPABILITY_LABELS[c] ?? c}</span>
          ))}
        </span>
      ) : null}
    </span>
  );
};

export const EmptyIcon = CircleDashed;
