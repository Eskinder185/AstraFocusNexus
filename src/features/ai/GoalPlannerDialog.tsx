import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog } from "../../components/ui/Dialog";
import { useAppToast } from "../../context/AppToast";
import { cx } from "../../lib/cx";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";
import { useAIConnection } from "./AIConnectionProvider";
import { AIError } from "./client";
import { validateEndpoint } from "./endpoint";
import {
  DESCRIPTION_MAX,
  GOAL_MAX_CHARS,
  GOAL_TASKS_FORMAT,
  MAX_MINUTES,
  MIN_MINUTES,
  TITLE_MAX,
  buildGoalMessages,
  parseSuggestions,
  type TaskSuggestion,
} from "./goalBreakdown";

interface Draft extends TaskSuggestion {
  key: string;
  selected: boolean;
}

type Phase = { kind: "compose" } | { kind: "loading" } | { kind: "review"; dropped: number } | { kind: "error"; message: string };

/**
 * Break a goal into tasks. Sends only the goal text; creates tasks only when the user
 * clicks "Add selected tasks" after reviewing and editing the draft.
 */
export const GoalPlannerDialog: React.FC<{ open: boolean; onClose: () => void; initialGoalId?: string | null }> = ({ open, onClose, initialGoalId }) => {
  const { goals } = useWorkspace();
  const { addTask } = useWorkspaceActions();
  const { showToast } = useAppToast();
  const { state, connected, chat } = useAIConnection();
  const ids = { goalText: useId(), goalSelect: useId(), link: useId() };

  const [source, setSource] = useState<"text" | "existing">(initialGoalId ? "existing" : "text");
  const [text, setText] = useState("");
  const [goalId, setGoalId] = useState<string>(initialGoalId ?? goals[0]?.id ?? "");
  const [linkGoalId, setLinkGoalId] = useState<string>(initialGoalId ?? "");
  const [phase, setPhase] = useState<Phase>({ kind: "compose" });
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [adding, setAdding] = useState(false);
  const addedRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  // Abort an in-flight request if the dialog closes.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const chosenGoal = goals.find(g => g.id === goalId);
  const goalText = (source === "existing" ? chosenGoal?.title ?? "" : text).trim().slice(0, GOAL_MAX_CHARS);
  const messages = useMemo(() => buildGoalMessages(goalText), [goalText]);
  const endpoint = validateEndpoint(state.baseUrl);
  const selected = drafts.filter(d => d.selected && d.title.trim());

  const close = () => {
    controllerRef.current?.abort();
    onClose();
  };

  const generate = async () => {
    if (!goalText || !connected || phase.kind === "loading") return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setPhase({ kind: "loading" });
    try {
      const reply = await chat(messages, { format: GOAL_TASKS_FORMAT, signal: controller.signal });
      const parsed = parseSuggestions(reply);
      if (!parsed.ok) {
        setPhase({ kind: "error", message: parsed.error });
        return;
      }
      addedRef.current = false;
      setDrafts(parsed.tasks.map((t, i) => ({ ...t, key: `${Date.now()}-${i}`, selected: true })));
      if (source === "existing") setLinkGoalId(goalId);
      setPhase({ kind: "review", dropped: parsed.dropped });
    } catch (e) {
      if (e instanceof AIError && e.kind === "cancelled") setPhase({ kind: "compose" });
      else setPhase({ kind: "error", message: e instanceof AIError ? e.message : "Something went wrong. Try again." });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  const update = (key: string, patch: Partial<Draft>) => setDrafts(ds => ds.map(d => (d.key === key ? { ...d, ...patch } : d)));

  const addSelected = () => {
    // Guard against double clicks / repeated submits before React re-renders.
    if (addedRef.current || adding || !selected.length) return;
    addedRef.current = true;
    setAdding(true);
    for (const d of selected) {
      addTask({
        title: d.title.trim().slice(0, TITLE_MAX),
        notes: d.description.trim().slice(0, DESCRIPTION_MAX),
        estimateMin: Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(d.minutes) || 30)),
        goalId: linkGoalId || null,
      });
    }
    showToast(`Added ${selected.length} ${selected.length === 1 ? "task" : "tasks"}.`, { tone: "success" });
    onClose();
  };

  const footer =
    phase.kind === "review" ? (
      <>
        <button type="button" className="btn btn--ghost" onClick={() => setPhase({ kind: "compose" })} disabled={adding}>
          Back
        </button>
        <button type="button" className="btn btn--primary" onClick={addSelected} disabled={adding || selected.length === 0}>
          <Plus size={16} aria-hidden /> Add selected tasks ({selected.length})
        </button>
      </>
    ) : phase.kind === "loading" ? (
      <button type="button" className="btn" onClick={() => controllerRef.current?.abort()}>
        <X size={15} aria-hidden /> Cancel
      </button>
    ) : (
      <>
        <button type="button" className="btn btn--ghost" onClick={close}>Close</button>
        <button type="button" className="btn btn--primary" onClick={() => void generate()} disabled={!connected || !goalText}>
          <Sparkles size={16} aria-hidden /> Break into tasks
        </button>
      </>
    );

  return (
    <Dialog open={open} onClose={close} title="Break a goal into tasks" className="ai-planner" footer={footer}>
      <div className="dialog__body">
        {!connected && (
          <div className="ai-note ai-note--warning" role="note">
            <AlertTriangle size={16} aria-hidden />
            <p>
              No AI model is connected. <Link to="/settings?section=ai" onClick={close}>Set one up in Settings → AI connections</Link>, test it, then
              come back. Everything else in AstraFocus works without AI.
            </p>
          </div>
        )}

        {phase.kind !== "review" && (
          <>
            {goals.length > 0 && (
              <div className="segmented ai-source" role="radiogroup" aria-label="Goal source">
                <button type="button" role="radio" aria-checked={source === "text"} onClick={() => setSource("text")} disabled={phase.kind === "loading"}>
                  Type a goal
                </button>
                <button type="button" role="radio" aria-checked={source === "existing"} onClick={() => setSource("existing")} disabled={phase.kind === "loading"}>
                  Use an existing goal
                </button>
              </div>
            )}

            {source === "existing" && goals.length > 0 ? (
              <div className="field">
                <label className="label" htmlFor={ids.goalSelect}>Goal</label>
                <select id={ids.goalSelect} className="select" value={goalId} onChange={e => setGoalId(e.target.value)} disabled={phase.kind === "loading"}>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.emoji} {g.title}</option>
                  ))}
                </select>
                <p className="hint">Only the goal’s title is sent, not its tasks or anything else.</p>
              </div>
            ) : (
              <div className="field">
                <label className="label" htmlFor={ids.goalText}>What do you want to achieve?</label>
                <textarea
                  id={ids.goalText}
                  className="textarea"
                  data-autofocus
                  maxLength={GOAL_MAX_CHARS}
                  rows={3}
                  placeholder="e.g. Pass the CCNA exam in six weeks"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  disabled={phase.kind === "loading"}
                />
                <p className="hint">{text.length}/{GOAL_MAX_CHARS} characters. Avoid personal or sensitive details.</p>
              </div>
            )}

            {goalText && endpoint.ok && (
              <section className="ai-preview" aria-label="What will be sent">
                <p>
                  <strong>What will be sent</strong> to <span className="ai-wrap">{endpoint.host}</span>
                  {state.model.trim() && <> using <code className="ai-wrap">{state.model.trim()}</code></>}:
                </p>
                <pre>{messages[1].content}</pre>
                <details>
                  <summary>Plus these fixed instructions</summary>
                  <pre>{messages[0].content}</pre>
                </details>
              </section>
            )}

            {phase.kind === "loading" && (
              <p className="ai-status__row" role="status">
                <Loader2 size={16} className="ai-spin" aria-hidden /> Waiting for the model… local models can take a few minutes.
              </p>
            )}
            {phase.kind === "error" && (
              <p className="ai-status__row ai-status--error" role="alert">
                <AlertTriangle size={16} aria-hidden /> <span className="ai-wrap">{phase.message}</span>
              </p>
            )}
          </>
        )}

        {phase.kind === "review" && (
          <>
            <div className="ai-review-head">
              <p className="muted">
                Review the draft. Nothing is added until you choose <strong>Add selected tasks</strong>.
                {phase.dropped > 0 && ` ${phase.dropped} unusable ${phase.dropped === 1 ? "item was" : "items were"} skipped.`}
              </p>
            </div>
            <ol className="ai-suggestions" aria-label="Suggested tasks">
              {drafts.map((d, i) => (
                <li key={d.key} className={cx("ai-suggestion", !d.selected && "is-off")}>
                  <div className="ai-suggestion__order">
                    <input
                      type="checkbox"
                      className="check check--accent"
                      checked={d.selected}
                      onChange={e => update(d.key, { selected: e.target.checked })}
                      aria-label={`Include task ${i + 1}`}
                    />
                    <span aria-label={`Suggested order ${i + 1}`}>#{i + 1}</span>
                  </div>
                  <div className="ai-suggestion__fields">
                    <input
                      className="input"
                      aria-label={`Task ${i + 1} title`}
                      maxLength={TITLE_MAX}
                      value={d.title}
                      onChange={e => update(d.key, { title: e.target.value })}
                    />
                    <textarea
                      className="textarea"
                      aria-label={`Task ${i + 1} description`}
                      maxLength={DESCRIPTION_MAX}
                      rows={2}
                      value={d.description}
                      onChange={e => update(d.key, { description: e.target.value })}
                    />
                    <label className="ai-suggestion__minutes">
                      <input
                        className="input"
                        type="number"
                        min={MIN_MINUTES}
                        max={MAX_MINUTES}
                        step={5}
                        value={d.minutes}
                        aria-label={`Task ${i + 1} duration in minutes`}
                        onChange={e => update(d.key, { minutes: Number(e.target.value) })}
                      />
                      minutes
                    </label>
                  </div>
                  <button type="button" className="btn btn--ghost btn--icon" onClick={() => setDrafts(ds => ds.filter(x => x.key !== d.key))} aria-label={`Remove task ${i + 1}`}>
                    <Trash2 size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ol>
            {drafts.length === 0 && <p className="muted">All suggestions removed. Go back to try again.</p>}
            {goals.length > 0 && (
              <div className="field">
                <label className="label" htmlFor={ids.link}>Link new tasks to a goal</label>
                <select id={ids.link} className="select" value={linkGoalId} onChange={e => setLinkGoalId(e.target.value)}>
                  <option value="">No goal</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.emoji} {g.title}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
};
