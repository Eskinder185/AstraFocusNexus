/**
 * Shared plumbing for AI actions (Break a goal into tasks, Plan my day, Improve a task).
 * Every action uses the ONE active connection from AIConnectionProvider, previews exactly
 * what will be sent, runs a single request (no retries, cancellable), validates the reply
 * with app rules, and only changes data after an explicit Apply/Add by the user.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Cpu, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAIConnection } from "./AIConnectionProvider";
import { AIError, type ChatMessage, type JsonSchemaFormat } from "./client";
import { validateEndpoint } from "./endpoint";
import { PROVIDERS } from "./providers";

export type ParseOutcome<T> = { ok: true; value: T } | { ok: false; error: string };

export type ActionPhase<T> =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; value: T };

/** Run one structured AI request with cancellation; the reply goes through `parse` before use. */
export function useAIAction<T>() {
  const { chat, connected } = useAIConnection();
  const [phase, setPhase] = useState<ActionPhase<T>>({ kind: "idle" });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(
    async (messages: ChatMessage[], format: JsonSchemaFormat, parse: (reply: string) => ParseOutcome<T>) => {
      if (!connected || controller.current) return;
      const c = new AbortController();
      controller.current = c;
      setPhase({ kind: "loading" });
      try {
        const { text } = await chat(messages, { format, signal: c.signal });
        const parsed = parse(text);
        setPhase(parsed.ok ? { kind: "done", value: parsed.value } : { kind: "error", message: parsed.error });
      } catch (e) {
        if (e instanceof AIError && e.kind === "cancelled") setPhase({ kind: "idle" });
        else setPhase({ kind: "error", message: e instanceof AIError ? e.message : "Something went wrong. Try again." });
      } finally {
        if (controller.current === c) controller.current = null;
      }
    },
    [chat, connected]
  );

  const cancel = useCallback(() => controller.current?.abort(), []);
  const reset = useCallback(() => setPhase({ kind: "idle" }), []);
  return { phase, run, cancel, reset, connected };
}

/** "Using qwen3:8b · Ollama (local) at 127.0.0.1:11434" */
export const ActiveModelLine: React.FC = () => {
  const { state, connected } = useAIConnection();
  if (!connected) return null;
  const v = validateEndpoint(state.baseUrl);
  return (
    <p className="ai-active-model">
      <Cpu size={14} aria-hidden />
      <span className="ai-wrap">
        Using <strong>{state.model}</strong> · {PROVIDERS[state.provider].label}
        {v.ok && <> at {v.host}</>}
      </span>
    </p>
  );
};

export const NotConnectedNotice: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => (
  <div className="ai-note ai-note--warning" role="note">
    <AlertTriangle size={16} aria-hidden />
    <p>
      No AI model is connected. <Link to="/ai" onClick={onNavigate}>Set one up on the AI assistant page</Link>, check it, then come back. Everything
      else in AstraFocus works without AI.
    </p>
  </div>
);

export interface SendItem {
  label: string;
  value: string;
}

/** Shows exactly what an action will send, and where, before the user presses the button. */
export const SendPreview: React.FC<{ items: SendItem[]; instructions: string; extra?: React.ReactNode }> = ({ items, instructions, extra }) => {
  const { state } = useAIConnection();
  const v = validateEndpoint(state.baseUrl);
  const id = useId();
  return (
    <section className="ai-preview" aria-labelledby={id}>
      <p id={id}>
        <strong>What will be sent</strong>
        {v.ok && <> to <span className="ai-wrap">{v.host}</span></>}
        {state.model.trim() && <> using <code className="ai-wrap">{state.model.trim()}</code></>}:
      </p>
      {items.length ? (
        <dl className="ai-send">
          {items.map((it, i) => (
            <div key={i}>
              <dt>{it.label}</dt>
              <dd><pre>{it.value}</pre></dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="muted">Nothing selected yet.</p>
      )}
      {extra}
      <details>
        <summary>Plus these fixed instructions</summary>
        <pre>{instructions}</pre>
      </details>
      <p className="hint">Nothing else from your workspace is included.{v.ok && !v.isLoopback ? " Your provider may charge for this request." : ""}</p>
    </section>
  );
};

export function ActionStatus<T>({ phase, waiting = "Waiting for the model… local models can take a few minutes." }: { phase: ActionPhase<T>; waiting?: string }) {
  if (phase.kind === "loading") {
    return (
      <p className="ai-status__row" role="status">
        <Loader2 size={16} className="ai-spin" aria-hidden /> {waiting}
      </p>
    );
  }
  if (phase.kind === "error") {
    return (
      <p className="ai-status__row ai-status--error" role="alert">
        <AlertTriangle size={16} aria-hidden /> <span className="ai-wrap">{phase.message}</span>
      </p>
    );
  }
  return null;
}

/** Opt-in for remembering provider, URL and model (never keys or permission). */
export const RememberSetting: React.FC = () => {
  const { state, dispatch } = useAIConnection();
  const id = useId();
  return (
    <label className="ai-consent__check ai-remember" htmlFor={id}>
      <input id={id} type="checkbox" className="check check--accent" checked={state.remember} onChange={e => dispatch({ type: "remember", value: e.target.checked })} />
      <span>
        Remember provider, server and model on this device
        <span className="hint ai-remember__hint"> Never your API key or permission. After a reload you allow and check the connection again.</span>
      </span>
    </label>
  );
};
