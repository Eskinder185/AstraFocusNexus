import React, { useState } from "react";
import { CalendarClock, Check, ChevronDown, Pencil, Plus, Target, Timer, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { ProgressRing } from "../../components/ui/Progress";
import { useNow } from "../../hooks/useNow";
import { cx } from "../../lib/cx";
import { diffInDays, formatDuration, fromDateKey, relativeDayLabel } from "../../lib/dates";
import { InlineQuickAdd } from "../tasks/TaskComposer";
import { TaskRow } from "../tasks/TaskRow";
import type { Goal } from "../workspace/schema";
import { compareByPriority, goalProgress } from "../workspace/selectors";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";

const EMOJIS = ["🎯", "🎓", "💼", "📚", "💻", "🏋️", "🏃", "🧘", "💡", "💵", "🎨", "🎵", "🌱", "❤️", "✈️", "🧠"];

export const GoalsPage: React.FC = () => {
  const { goals } = useWorkspace();
  const [creating, setCreating] = useState(false);

  return (
    <div className="goals-page">
      <PageHeader
        title="Goals"
        description="Name the outcomes that matter, then link tasks to them. Progress comes from the work you actually finish."
        actions={
          !creating && (
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden /> New goal
            </button>
          )
        }
      />

      {creating && <GoalForm onDone={() => setCreating(false)} />}

      {goals.length === 0 && !creating ? (
        <section className="card">
          <EmptyState
            icon={<Target size={20} />}
            title="What are you working toward?"
            actions={
              <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
                <Plus size={16} aria-hidden /> Create a goal
              </button>
            }
          >
            A goal turns scattered tasks into visible progress. Try “Pass the networking exam” or “Ship my portfolio”.
          </EmptyState>
        </section>
      ) : (
        <div className="goal-grid">
          {goals.map(g => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}
    </div>
  );
};

const GoalForm: React.FC<{ goal?: Goal; onDone: () => void }> = ({ goal, onDone }) => {
  const { addGoal, updateGoal } = useWorkspaceActions();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [emoji, setEmoji] = useState(goal?.emoji ?? "🎯");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const canSave = title.trim().length > 0;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    if (goal) updateGoal(goal.id, { title: title.trim(), emoji, targetDate: targetDate || null });
    else addGoal({ title, emoji, targetDate: targetDate || null });
    onDone();
  };

  return (
    <form className={cx("card goal-form", goal && "goal-form--inline")} onSubmit={save} aria-label={goal ? "Edit goal" : "New goal"}>
      <div className="card__body stack">
        <div className="field">
          <span className="label" id={`emoji-${goal?.id ?? "new"}`}>
            Icon
          </span>
          <div className="emoji-grid" role="radiogroup" aria-labelledby={`emoji-${goal?.id ?? "new"}`}>
            {EMOJIS.map(e => (
              <button key={e} type="button" role="radio" aria-checked={emoji === e} className="emoji-grid__item" onClick={() => setEmoji(e)} aria-label={e}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="goal-form__row">
          <div className="field goal-form__title">
            <label className="label" htmlFor={`gt-${goal?.id ?? "new"}`}>
              Goal
            </label>
            <input
              id={`gt-${goal?.id ?? "new"}`}
              className="input"
              placeholder="e.g. Pass the CCNA exam"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              maxLength={200}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor={`gd-${goal?.id ?? "new"}`}>
              Target date <span className="subtle">(optional)</span>
            </label>
            <input id={`gd-${goal?.id ?? "new"}`} type="date" className="input" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <span className="spacer" />
          <button type="button" className="btn btn--ghost" onClick={onDone}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!canSave}>
            {goal ? "Save" : "Create goal"}
          </button>
        </div>
      </div>
    </form>
  );
};

const GoalCard: React.FC<{ goal: Goal }> = ({ goal }) => {
  const { tasks, focusSessions, prefs } = useWorkspace();
  const { deleteGoal, setPrefs } = useWorkspaceActions();
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const p = goalProgress(goal, tasks, focusSessions);
  const linked = tasks.filter(t => t.goalId === goal.id).sort((a, b) => (a.status === b.status ? compareByPriority(a, b) : a.status === "todo" ? -1 : 1));
  const isDefault = prefs.defaultGoalId === goal.id;
  const daysLeft = goal.targetDate ? diffInDays(fromDateKey(goal.targetDate), now) : null;
  const complete = p.total > 0 && p.done === p.total;

  if (editing) return <GoalForm goal={goal} onDone={() => setEditing(false)} />;

  return (
    <article className={cx("card goal-card", complete && "is-complete")} aria-labelledby={`goal-${goal.id}`}>
      <div className="goal-card__head">
        <span className="goal-card__emoji" aria-hidden>
          {goal.emoji}
        </span>
        <div className="goal-card__titles">
          <h2 id={`goal-${goal.id}`} className="goal-card__title">
            {goal.title}
          </h2>
          <div className="row row--wrap">
            {goal.targetDate && (
              <span className={cx("chip", daysLeft != null && daysLeft < 0 && !complete ? "chip--danger" : undefined)}>
                <CalendarClock size={12} aria-hidden />
                {relativeDayLabel(goal.targetDate, now)}
                {daysLeft != null && daysLeft > 1 && ` · ${daysLeft} days`}
              </span>
            )}
            {p.focusedMs > 0 && (
              <span className="chip">
                <Timer size={12} aria-hidden /> {formatDuration(p.focusedMs)} invested
              </span>
            )}
            {complete && (
              <span className="chip chip--success">
                <Check size={12} aria-hidden /> All linked tasks done
              </span>
            )}
          </div>
        </div>
        <ProgressRing value={p.pct / 100} size={52} stroke={4} className={cx("goal-card__ring", complete && "is-complete")}>
          <span className="tabular">{p.pct}%</span>
        </ProgressRing>
      </div>

      <p className="goal-card__stat subtle">
        {p.total ? `${p.done} of ${p.total} linked ${p.total === 1 ? "task" : "tasks"} done` : "No linked tasks yet"}
      </p>

      <div className="goal-card__next">
        {p.next ? (
          <>
            <p className="list-label">Next action</p>
            <ul role="list" className="task-list">
              <TaskRow task={p.next} now={now} hideGoal compact />
            </ul>
          </>
        ) : null}
        <InlineQuickAdd label={`Add a task to ${goal.title}`} placeholder="Add a next step…" defaults={{ goalId: goal.id }} />
      </div>

      {linked.length > 1 && (
        <div className="goal-card__all">
          <button type="button" className="btn btn--ghost btn--sm" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>
            <ChevronDown size={14} aria-hidden className={cx("chevron", expanded && "is-open")} />
            {expanded ? "Hide" : "Show"} all {linked.length} tasks
          </button>
          {expanded && (
            <ul role="list" className="task-list">
              {linked.map(t => (
                <TaskRow key={t.id} task={t} now={now} hideGoal compact />
              ))}
            </ul>
          )}
        </div>
      )}

      <footer className="goal-card__footer">
        <label className="switch switch--sm">
          <input type="checkbox" checked={isDefault} onChange={e => setPrefs({ defaultGoalId: e.target.checked ? goal.id : null })} />
          Default for new tasks
        </label>
        <span className="spacer" />
        <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => setEditing(true)} aria-label={`Edit ${goal.title}`} title="Edit">
          <Pencil size={14} aria-hidden />
        </button>
        <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => deleteGoal(goal.id)} aria-label={`Delete ${goal.title}`} title="Delete (tasks are kept)">
          <Trash2 size={14} aria-hidden />
        </button>
      </footer>
    </article>
  );
};

