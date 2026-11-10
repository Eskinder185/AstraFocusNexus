import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Trash2, Wand2, X } from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";
import { useAppToast } from "../../context/AppToast";
import { cx } from "../../lib/cx";
import type { Task } from "../workspace/schema";
import { useWorkspaceActions } from "../workspace/WorkspaceProvider";
import { ActionStatus, ActiveModelLine, NotConnectedNotice, SendPreview, useAIAction } from "./aiActions";
import {
  ESTIMATE_MAX,
  ESTIMATE_MIN,
  IMPROVE_FORMAT,
  IMPROVE_NOTES_MAX,
  IMPROVE_TITLE_MAX,
  SUBTASK_MAX_MINUTES,
  buildImproveMessages,
  parseImprovement,
  type Improvement,
} from "./improveTask";

interface SubDraft {
  key: string;
  title: string;
  minutes: number | null;
  selected: boolean;
}

interface Review {
  title: string;
  useTitle: boolean;
  description: string;
  useDescription: boolean;
  estimate: number | null;
  useEstimate: boolean;
  subtasks: SubDraft[];
  dropped: number;
}

const clampEstimate = (n: number | null, max: number) => (n == null || !Number.isFinite(n) ? null : Math.min(max, Math.max(ESTIMATE_MIN, Math.round(n))));

/** Improve a task with AI. Nothing changes until the user presses "Apply". */
export const ImproveTaskDialog: React.FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
  const { updateTask, addTask } = useWorkspaceActions();
  const { showToast } = useAppToast();
  const { phase, run, cancel, reset, connected } = useAIAction<Improvement>();
  const [includeNotes, setIncludeNotes] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const appliedRef = useRef(false);
  const [applying, setApplying] = useState(false);
  const ids = { notes: useId(), title: useId(), desc: useId(), est: useId() };
  const hasNotes = !!task.notes.trim();

  const messages = useMemo(() => buildImproveMessages({ title: task.title, notes: includeNotes ? task.notes : undefined }), [task.title, task.notes, includeNotes]);
  const sendItems = [
    { label: "Task", value: task.title },
    ...(includeNotes && hasNotes ? [{ label: "Notes", value: task.notes.trim().slice(0, IMPROVE_NOTES_MAX) }] : []),
  ];

  useEffect(() => {
    if (phase.kind !== "done") return;
    const v = phase.value;
    appliedRef.current = false;
    setReview({
      title: v.title,
      useTitle: v.title !== task.title,
      description: v.description,
      useDescription: false,
      estimate: v.estimateMin,
      // Don't overwrite an estimate the user already set unless they choose to.
      useEstimate: v.estimateMin != null && task.estimateMin == null,
      subtasks: v.subtasks.map((s, i) => ({ key: `${Date.now()}-${i}`, title: s.title, minutes: s.minutes, selected: true })),
      dropped: v.dropped,
    });
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const close = () => {
    cancel();
    onClose();
  };

  const selectedSubs = review?.subtasks.filter(s => s.selected && s.title.trim()) ?? [];
  const changeCount = review ? Number(review.useTitle && !!review.title.trim()) + Number(review.useDescription && !!review.description.trim()) + Number(review.useEstimate && review.estimate != null) + selectedSubs.length : 0;

  const apply = () => {
    if (!review || appliedRef.current || applying || changeCount === 0) return;
    appliedRef.current = true;
    setApplying(true);
    const patch: Partial<Task> = {};
    if (review.useTitle && review.title.trim()) patch.title = review.title.trim().slice(0, IMPROVE_TITLE_MAX);
    if (review.useDescription && review.description.trim()) patch.notes = [task.notes.trim(), review.description.trim()].filter(Boolean).join("\n\n").slice(0, 20_000);
    if (review.useEstimate && review.estimate != null) patch.estimateMin = clampEstimate(review.estimate, ESTIMATE_MAX);
    if (Object.keys(patch).length) updateTask(task.id, patch);
    const parentTitle = patch.title ?? task.title;
    for (const s of selectedSubs) {
      addTask({
        title: s.title.trim().slice(0, IMPROVE_TITLE_MAX),
        notes: `Part of “${parentTitle}”.`,
        estimateMin: clampEstimate(s.minutes, SUBTASK_MAX_MINUTES),
        priority: task.priority,
        goalId: task.goalId,
        projectId: task.projectId ?? null,
      });
    }
    showToast(`Applied ${changeCount} ${changeCount === 1 ? "change" : "changes"}.`, { tone: "success" });
    onClose();
  };

  const set = (patch: Partial<Review>) => setReview(r => (r ? { ...r, ...patch } : r));
  const setSub = (key: string, patch: Partial<SubDraft>) => setReview(r => (r ? { ...r, subtasks: r.subtasks.map(s => (s.key === key ? { ...s, ...patch } : s)) } : r));

  const footer = review ? (
    <>
      <button type="button" className="btn btn--ghost" onClick={() => setReview(null)} disabled={applying}>Back</button>
      <button type="button" className="btn btn--primary" onClick={apply} disabled={applying || changeCount === 0}>
        <Check size={16} aria-hidden /> Apply selected ({changeCount})
      </button>
    </>
  ) : phase.kind === "loading" ? (
    <button type="button" className="btn" onClick={cancel}><X size={15} aria-hidden /> Cancel</button>
  ) : (
    <>
      <button type="button" className="btn btn--ghost" onClick={close}>Close</button>
      <button type="button" className="btn btn--primary" onClick={() => void run(messages, IMPROVE_FORMAT, parseImprovement)} disabled={!connected}>
        <Wand2 size={16} aria-hidden /> Suggest improvements
      </button>
    </>
  );

  return (
    <Dialog open onClose={close} title="Improve this task" className="ai-planner" footer={footer}>
      <div className="dialog__body">
        {connected ? <ActiveModelLine /> : <NotConnectedNotice onNavigate={close} />}
        {!review && (
          <>
            <p className="muted">Get a clearer title, a first step, an estimate and optional subtasks for “{task.title}”. You choose what to apply.</p>
            {hasNotes && (
              <label className="ai-consent__check" htmlFor={ids.notes}>
                <input id={ids.notes} type="checkbox" className="check check--accent" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)} disabled={phase.kind === "loading"} />
                <span>Include this task’s notes <span className="hint">(off by default; only this task’s notes)</span></span>
              </label>
            )}
            {connected && <SendPreview items={sendItems} instructions={messages[0].content} />}
            <ActionStatus phase={phase} />
          </>
        )}
        {review && (
          <>
            <p className="muted">Review the suggestion. Nothing changes until you press <strong>Apply selected</strong>.{review.dropped > 0 && ` ${review.dropped} unusable ${review.dropped === 1 ? "subtask was" : "subtasks were"} skipped.`}</p>
            <div className="ai-improve">
              <label className="ai-improve__toggle">
                <input type="checkbox" className="check check--accent" checked={review.useTitle} onChange={e => set({ useTitle: e.target.checked })} aria-label="Use the new title" />
                <span className="field">
                  <span className="label" id={ids.title}>New title</span>
                  <input className="input" aria-labelledby={ids.title} maxLength={IMPROVE_TITLE_MAX} value={review.title} onChange={e => set({ title: e.target.value })} />
                  <span className="hint ai-wrap">Current: {task.title}</span>
                </span>
              </label>
              {review.description && (
                <label className="ai-improve__toggle">
                  <input type="checkbox" className="check check--accent" checked={review.useDescription} onChange={e => set({ useDescription: e.target.checked })} aria-label="Add the description to the notes" />
                  <span className="field">
                    <span className="label" id={ids.desc}>Add to notes</span>
                    <textarea className="textarea" aria-labelledby={ids.desc} rows={2} value={review.description} onChange={e => set({ description: e.target.value })} />
                    <span className="hint">Added below your existing notes.</span>
                  </span>
                </label>
              )}
              {review.estimate != null && (
                <label className="ai-improve__toggle">
                  <input type="checkbox" className="check check--accent" checked={review.useEstimate} onChange={e => set({ useEstimate: e.target.checked })} aria-label="Set the estimate" />
                  <span className="field">
                    <span className="label" id={ids.est}>Estimated effort (minutes)</span>
                    <input className="input ai-improve__minutes" type="number" min={ESTIMATE_MIN} max={ESTIMATE_MAX} step={5} aria-labelledby={ids.est} value={review.estimate} onChange={e => set({ estimate: Number(e.target.value) })} />
                    <span className="hint">{task.estimateMin ? `Current estimate: ${task.estimateMin} min.` : "No estimate yet."} Effort only; your start and due dates don’t change.</span>
                  </span>
                </label>
              )}
            </div>
            {review.subtasks.length > 0 && (
              <>
                <p className="label">Subtasks (added as new tasks)</p>
                <ol className="ai-suggestions" aria-label="Suggested subtasks">
                  {review.subtasks.map((s, i) => (
                    <li key={s.key} className={cx("ai-suggestion", !s.selected && "is-off")}>
                      <div className="ai-suggestion__order">
                        <input type="checkbox" className="check check--accent" checked={s.selected} onChange={e => setSub(s.key, { selected: e.target.checked })} aria-label={`Include subtask ${i + 1}`} />
                      </div>
                      <div className="ai-suggestion__fields">
                        <input className="input" aria-label={`Subtask ${i + 1} title`} maxLength={IMPROVE_TITLE_MAX} value={s.title} onChange={e => setSub(s.key, { title: e.target.value })} />
                        <label className="ai-suggestion__minutes">
                          <input className="input" type="number" min={ESTIMATE_MIN} max={SUBTASK_MAX_MINUTES} step={5} aria-label={`Subtask ${i + 1} minutes`} value={s.minutes ?? ""} onChange={e => setSub(s.key, { minutes: e.target.value ? Number(e.target.value) : null })} />
                          minutes
                        </label>
                      </div>
                      <button type="button" className="btn btn--ghost btn--icon" onClick={() => setReview(r => (r ? { ...r, subtasks: r.subtasks.filter(x => x.key !== s.key) } : r))} aria-label={`Remove subtask ${i + 1}`}>
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
};
