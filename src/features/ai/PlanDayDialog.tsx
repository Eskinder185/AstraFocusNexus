import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarCheck, Check, X } from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";
import { useAppToast } from "../../context/AppToast";
import { cx } from "../../lib/cx";
import { formatTime, isDateKey, toDateKey } from "../../lib/dates";
import { formatSchedule } from "../workspace/schedule";
import type { Task } from "../workspace/schema";
import { compareByPriority, isOpen } from "../workspace/selectors";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";
import { ActionStatus, ActiveModelLine, NotConnectedNotice, SendPreview, useAIAction } from "./aiActions";
import {
  BLOCK_MAX,
  BLOCK_MIN,
  MAX_PLAN_TASKS,
  PLAN_FORMAT,
  blockConflicts,
  blockTimestamp,
  buildPlanMessages,
  busyBlocks,
  parsePlan,
  validWorkingHours,
  type EditableBlock,
  type PlanContext,
  type PlanResult,
} from "./planDay";

interface ReviewBlock extends EditableBlock {
  selected: boolean;
  reason: string;
  setEstimate: boolean;
}

/** Plan my day with AI. Only planned work blocks change, and only after "Apply". */
export const PlanDayDialog: React.FC<{ onClose: () => void; initialDate?: string }> = ({ onClose, initialDate }) => {
  const { tasks } = useWorkspace();
  const { updateTask } = useWorkspaceActions();
  const { showToast } = useAppToast();
  const { phase, run, cancel, reset, connected } = useAIAction<PlanResult>();
  const ids = { date: useId(), from: useId(), to: useId() };
  const [date, setDate] = useState(initialDate ?? toDateKey(new Date()));
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [picked, setPicked] = useState<string[]>([]);
  const [review, setReview] = useState<{ blocks: ReviewBlock[]; unscheduled: PlanResult["unscheduled"]; dropped: number; ctx: PlanContext } | null>(null);
  const appliedRef = useRef(false);
  const [applying, setApplying] = useState(false);
  const now = useMemo(() => new Date(), [review, phase]); // refreshed when results change

  const open = useMemo(() => tasks.filter(isOpen).sort(compareByPriority), [tasks]);
  const chosen = open.filter(t => picked.includes(t.id));
  const hoursError = validWorkingHours(workStart, workEnd);
  const ctx: PlanContext = useMemo(
    () => ({
      date,
      workStart,
      workEnd,
      tasks: chosen.map((task, i) => ({ ref: `T${i + 1}`, task })),
      busy: isDateKey(date) ? busyBlocks(tasks, date, new Set(picked)) : [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date, workStart, workEnd, picked.join(","), tasks]
  );
  const messages = useMemo(() => buildPlanMessages(ctx), [ctx]);
  const canSend = connected && chosen.length > 0 && !hoursError && isDateKey(date);

  const toggle = (id: string, on: boolean) =>
    setPicked(p => (on ? (p.length >= MAX_PLAN_TASKS || p.includes(id) ? p : [...p, id]) : p.filter(x => x !== id)));
  const pickDueOrStarting = () => {
    const ids = open.filter(t => t.dueDate === date || t.startDate === date || (t.dueDate != null && t.dueDate < date)).slice(0, MAX_PLAN_TASKS).map(t => t.id);
    setPicked(ids);
  };

  useEffect(() => {
    if (phase.kind !== "done") return;
    const frozen = ctx; // check against exactly what was sent
    const blocks = phase.value.blocks.map(b => ({ ref: b.ref, start: b.start, minutes: b.minutes, reason: b.reason, selected: false, setEstimate: false }));
    const withChecks = blocks.map(b => ({ ...b, selected: blockConflicts(b, blocks, frozen, new Date()).length === 0 }));
    appliedRef.current = false;
    setReview({ blocks: withChecks, unscheduled: phase.value.unscheduled, dropped: phase.value.dropped, ctx: frozen });
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const close = () => {
    cancel();
    onClose();
  };

  const taskFor = (ref: string, c: PlanContext): Task | undefined => c.tasks.find(t => t.ref === ref)?.task;
  const conflictsOf = (b: ReviewBlock) => (review ? blockConflicts(b, review.blocks, review.ctx, now) : []);
  const applicable = review ? review.blocks.filter(b => b.selected && conflictsOf(b).length === 0) : [];

  const setBlock = (ref: string, patch: Partial<ReviewBlock>) =>
    setReview(r => (r ? { ...r, blocks: r.blocks.map(b => (b.ref === ref ? { ...b, ...patch } : b)) } : r));

  const apply = () => {
    if (!review || appliedRef.current || applying || !applicable.length) return;
    appliedRef.current = true;
    setApplying(true);
    for (const b of applicable) {
      const task = taskFor(b.ref, review.ctx);
      if (!task) continue;
      // Only the planned work block changes; deadlines never do.
      updateTask(task.id, { scheduledAt: blockTimestamp(review.ctx.date, b.start), ...(b.setEstimate ? { estimateMin: b.minutes } : {}) });
    }
    showToast(`Planned ${applicable.length} ${applicable.length === 1 ? "work block" : "work blocks"}. See them on the Calendar.`, { tone: "success" });
    onClose();
  };

  const footer = review ? (
    <>
      <button type="button" className="btn btn--ghost" onClick={() => setReview(null)} disabled={applying}>Back</button>
      <button type="button" className="btn btn--primary" onClick={apply} disabled={applying || applicable.length === 0}>
        <Check size={16} aria-hidden /> Apply selected ({applicable.length})
      </button>
    </>
  ) : phase.kind === "loading" ? (
    <button type="button" className="btn" onClick={cancel}><X size={15} aria-hidden /> Cancel</button>
  ) : (
    <>
      <button type="button" className="btn btn--ghost" onClick={close}>Close</button>
      <button type="button" className="btn btn--primary" onClick={() => void run(messages, PLAN_FORMAT, reply => parsePlan(reply, ctx))} disabled={!canSend}>
        <CalendarCheck size={16} aria-hidden /> Suggest a plan
      </button>
    </>
  );

  return (
    <Dialog open onClose={close} title="Plan my day" className="ai-planner" footer={footer}>
      <div className="dialog__body">
        {connected ? <ActiveModelLine /> : <NotConnectedNotice onNavigate={close} />}
        {!review && (
          <>
            <div className="ai-plan__when">
              <div className="field">
                <label className="label" htmlFor={ids.date}>Day</label>
                <input id={ids.date} type="date" className="input" value={date} onChange={e => setDate(e.target.value)} disabled={phase.kind === "loading"} />
              </div>
              <div className="field">
                <label className="label" htmlFor={ids.from}>Work from</label>
                <input id={ids.from} type="time" className={cx("input", hoursError && "is-invalid")} value={workStart} onChange={e => setWorkStart(e.target.value)} disabled={phase.kind === "loading"} />
              </div>
              <div className="field">
                <label className="label" htmlFor={ids.to}>Until</label>
                <input id={ids.to} type="time" className={cx("input", hoursError && "is-invalid")} value={workEnd} onChange={e => setWorkEnd(e.target.value)} aria-describedby={hoursError ? `${ids.to}-err` : undefined} disabled={phase.kind === "loading"} />
              </div>
            </div>
            {hoursError && <p id={`${ids.to}-err`} className="field-error" role="alert">{hoursError}</p>}

            <fieldset className="ai-plan__tasks">
              <legend className="label">Tasks to plan ({chosen.length}/{MAX_PLAN_TASKS})</legend>
              {open.length ? (
                <>
                  <button type="button" className="btn btn--sm btn--ghost" onClick={pickDueOrStarting} disabled={phase.kind === "loading"}>Select tasks due or starting that day</button>
                  <ul className="ai-plan__list">
                    {open.slice(0, 60).map(t => {
                      const sched = formatSchedule(t, new Date())?.short ?? (t.dueDate ? `Due ${t.dueDate}${t.dueTime ? ` ${formatTime(t.dueTime)}` : ""}` : null);
                      const checked = picked.includes(t.id);
                      return (
                        <li key={t.id}>
                          <label className={cx("ai-plan__task", checked && "is-selected")}>
                            <input type="checkbox" className="check check--accent" checked={checked} disabled={phase.kind === "loading" || (!checked && picked.length >= MAX_PLAN_TASKS)} onChange={e => toggle(t.id, e.target.checked)} />
                            <span className="ai-plan__task-text">
                              <span className="ai-wrap">{t.title}</span>
                              <span className="hint">{[t.estimateMin ? `${t.estimateMin} min` : "no estimate", sched].filter(Boolean).join(" · ")}</span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p className="muted">You have no open tasks to plan.</p>
              )}
            </fieldset>

            {connected && chosen.length > 0 && (
              <SendPreview
                items={[{ label: "Day and tasks", value: messages[1].content }]}
                instructions={messages[0].content}
                extra={<p className="hint">Busy times are sent as times only, without titles.</p>}
              />
            )}
            <ActionStatus phase={phase} />
          </>
        )}

        {review && (
          <>
            <p className="muted">
              Suggested plan for {new Date(`${review.ctx.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}. Only planned work blocks change when you
              apply; deadlines never do. Edit times or lengths; AstraFocus re-checks each one.
              {review.dropped > 0 && ` ${review.dropped} unusable ${review.dropped === 1 ? "block was" : "blocks were"} skipped.`}
            </p>
            {review.blocks.length > 0 ? (
              <ol className="ai-suggestions" aria-label="Suggested work blocks">
                {review.blocks.map(b => {
                  const task = taskFor(b.ref, review.ctx);
                  const conflicts = conflictsOf(b);
                  const ok = conflicts.length === 0;
                  return (
                    <li key={b.ref} className={cx("ai-suggestion", (!b.selected || !ok) && "is-off")}>
                      <div className="ai-suggestion__order">
                        <input type="checkbox" className="check check--accent" checked={b.selected && ok} disabled={!ok} onChange={e => setBlock(b.ref, { selected: e.target.checked })} aria-label={`Include ${task?.title ?? b.ref}`} />
                      </div>
                      <div className="ai-suggestion__fields">
                        <p className="ai-plan__title ai-wrap">{task?.title}</p>
                        <div className="ai-plan__block">
                          <label className="ai-suggestion__minutes">
                            Start
                            <input className="input" type="time" value={b.start} aria-label={`${task?.title} start time`} onChange={e => setBlock(b.ref, { start: e.target.value })} />
                          </label>
                          <label className="ai-suggestion__minutes">
                            <input className="input" type="number" min={BLOCK_MIN} max={BLOCK_MAX} step={5} value={b.minutes} aria-label={`${task?.title} minutes`} onChange={e => setBlock(b.ref, { minutes: Number(e.target.value) })} />
                            min
                          </label>
                        </div>
                        {b.reason && <p className="hint ai-wrap">{b.reason}</p>}
                        {!ok && (
                          <ul className="ai-plan__conflicts" aria-label={`Conflicts for ${task?.title}`}>
                            {conflicts.map(c => <li key={c}><AlertTriangle size={13} aria-hidden /> <span>{c}</span></li>)}
                          </ul>
                        )}
                        {task && b.minutes !== task.estimateMin && (
                          <label className="ai-plan__estimate">
                            <input type="checkbox" className="check check--accent" checked={b.setEstimate} onChange={e => setBlock(b.ref, { setEstimate: e.target.checked })} />
                            <span>Also set the effort estimate to {b.minutes} min <span className="hint">({task.estimateMin ? `now ${task.estimateMin} min` : "none yet"}; the Calendar sizes blocks by estimate)</span></span>
                          </label>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="muted">No work blocks could be suggested.</p>
            )}
            {review.unscheduled.length > 0 && (
              <section className="ai-plan__unscheduled" aria-label="Not scheduled">
                <p className="label">Not scheduled</p>
                <ul>
                  {review.unscheduled.map(u => (
                    <li key={u.ref}><strong className="ai-wrap">{taskFor(u.ref, review.ctx)?.title}</strong> <span className="hint ai-wrap">{u.reason}</span></li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
};
