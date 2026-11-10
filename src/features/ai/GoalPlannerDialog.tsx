import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus, Sparkles, Trash2, X } from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";
import { useAppToast } from "../../context/AppToast";
import { cx } from "../../lib/cx";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";
import { ActionStatus, ActiveModelLine, NotConnectedNotice, SendPreview, useAIAction, type ParseOutcome } from "./aiActions";
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

type Parsed = { tasks: TaskSuggestion[]; dropped: number };
const parse = (reply: string): ParseOutcome<Parsed> => {
  const r = parseSuggestions(reply);
  return r.ok ? { ok: true, value: { tasks: r.tasks, dropped: r.dropped } } : r;
};

/**
 * Break a goal into tasks. Sends only the goal text; creates tasks only when the user
 * clicks "Add selected tasks" after reviewing and editing the draft.
 */
export const GoalPlannerDialog: React.FC<{ open: boolean; onClose: () => void; initialGoalId?: string | null }> = ({ open, onClose, initialGoalId }) => {
  const { goals } = useWorkspace();
  const { addTask } = useWorkspaceActions();
  const { showToast } = useAppToast();
  const { phase: request, run, cancel, reset, connected } = useAIAction<Parsed>();
  const ids = { goalText: useId(), goalSelect: useId(), link: useId() };

  const [source, setSource] = useState<"text" | "existing">(initialGoalId ? "existing" : "text");
  const [text, setText] = useState("");
  const [goalId, setGoalId] = useState<string>(initialGoalId ?? goals[0]?.id ?? "");
  const [linkGoalId, setLinkGoalId] = useState<string>(initialGoalId ?? "");
  const [review, setReview] = useState<{ dropped: number } | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [adding, setAdding] = useState(false);
  const addedRef = useRef(false);

  const chosenGoal = goals.find(g => g.id === goalId);
  const goalText = (source === "existing" ? chosenGoal?.title ?? "" : text).trim().slice(0, GOAL_MAX_CHARS);
  const messages = useMemo(() => buildGoalMessages(goalText), [goalText]);
  const selected = drafts.filter(d => d.selected && d.title.trim());
  const loading = request.kind === "loading";

  // A validated reply becomes an editable draft.
  useEffect(() => {
    if (request.kind !== "done") return;
    addedRef.current = false;
    setDrafts(request.value.tasks.map((t, i) => ({ ...t, key: `${Date.now()}-${i}`, selected: true })));
    if (source === "existing") setLinkGoalId(goalId);
    setReview({ dropped: request.value.dropped });
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const close = () => {
    cancel();
    onClose();
  };

  const generate = () => {
    if (!goalText) return;
    void run(messages, GOAL_TASKS_FORMAT, parse);
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

  const footer = review ? (
    <>
      <button type="button" className="btn btn--ghost" onClick={() => setReview(null)} disabled={adding}>
        Back
      </button>
      <button type="button" className="btn btn--primary" onClick={addSelected} disabled={adding || selected.length === 0}>
        <Plus size={16} aria-hidden /> Add selected tasks ({selected.length})
      </button>
    </>
  ) : loading ? (
    <button type="button" className="btn" onClick={cancel}>
      <X size={15} aria-hidden /> Cancel
    </button>
  ) : (
    <>
      <button type="button" className="btn btn--ghost" onClick={close}>Close</button>
      <button type="button" className="btn btn--primary" onClick={generate} disabled={!connected || !goalText}>
        <Sparkles size={16} aria-hidden /> Break into tasks
      </button>
    </>
  );

  return (
    <Dialog open={open} onClose={close} title="Break a goal into tasks" className="ai-planner" footer={footer}>
      <div className="dialog__body">
        {connected ? <ActiveModelLine /> : <NotConnectedNotice onNavigate={close} />}

        {!review && (
          <>
            {goals.length > 0 && (
              <div className="segmented ai-source" role="radiogroup" aria-label="Goal source">
                <button type="button" role="radio" aria-checked={source === "text"} onClick={() => setSource("text")} disabled={loading}>
                  Type a goal
                </button>
                <button type="button" role="radio" aria-checked={source === "existing"} onClick={() => setSource("existing")} disabled={loading}>
                  Use an existing goal
                </button>
              </div>
            )}

            {source === "existing" && goals.length > 0 ? (
              <div className="field">
                <label className="label" htmlFor={ids.goalSelect}>Goal</label>
                <select id={ids.goalSelect} className="select" value={goalId} onChange={e => setGoalId(e.target.value)} disabled={loading}>
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
                  disabled={loading}
                />
                <p className="hint">{text.length}/{GOAL_MAX_CHARS} characters. Avoid personal or sensitive details.</p>
              </div>
            )}

            {goalText && connected && <SendPreview items={[{ label: "Goal", value: messages[1].content }]} instructions={messages[0].content} />}

            <ActionStatus phase={request} />
          </>
        )}

        {review && (
          <>
            <div className="ai-review-head">
              <p className="muted">
                Review the draft. Nothing is added until you choose <strong>Add selected tasks</strong>.
                {review.dropped > 0 && ` ${review.dropped} unusable ${review.dropped === 1 ? "item was" : "items were"} skipped.`}
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
