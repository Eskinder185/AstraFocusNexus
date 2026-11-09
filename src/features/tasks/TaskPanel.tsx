import React, { useEffect, useState } from "react";
import { Play, Sparkles, Trash2 } from "lucide-react";
import { useUI, useUIActions } from "../../app/ui";
import { Dialog } from "../../components/ui/Dialog";
import { cx } from "../../lib/cx";
import { formatDuration } from "../../lib/dates";
import { useFocusOnTask } from "../focus/useFocusOnTask";
import { PRIORITY_META, PRIORITY_ORDER } from "../workspace/priority";
import type { Task } from "../workspace/schema";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";
import { DueChip } from "./TaskRow";
import { useNow } from "../../hooks/useNow";

export const TaskPanel: React.FC = () => {
  const { taskId } = useUI();
  const { closeTask } = useUIActions();
  const { tasks } = useWorkspace();
  const task = taskId ? tasks.find(t => t.id === taskId) : undefined;

  // The task was deleted (here, in another tab, or via undo): close the panel.
  useEffect(() => {
    if (taskId && !task) closeTask();
  }, [taskId, task, closeTask]);

  if (!task) return null;
  return <TaskPanelContent key={task.id} task={task} onClose={closeTask} />;
};

const TaskPanelContent: React.FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
  const { goals, focusSessions, prefs } = useWorkspace();
  const { updateTask, toggleTask, deleteTask, setPrefs } = useWorkspaceActions();
  const focusOnTask = useFocusOnTask();
  const now = useNow();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);

  // Keep local drafts in sync with changes made elsewhere (e.g. another tab).
  useEffect(() => setTitle(task.title), [task.title]);
  useEffect(() => setNotes(task.notes), [task.notes]);

  const commitTitle = () => {
    const t = title.trim();
    if (!t) setTitle(task.title);
    else if (t !== task.title) updateTask(task.id, { title: t });
  };
  const commitNotes = () => {
    if (notes !== task.notes) updateTask(task.id, { notes });
  };

  const focusedMs = focusSessions.reduce((s, x) => (x.taskId === task.id ? s + x.focusedMs : s), 0);
  const done = task.status === "done";
  const inFocus = prefs.activeTaskId === task.id;
  const tone = PRIORITY_META[task.priority].tone;

  return (
    <Dialog
      open
      onClose={() => {
        commitTitle();
        commitNotes();
        onClose();
      }}
      title="Task details"
      variant="sheet"
      className="task-panel"
      footer={
        <>
          <button type="button" className="btn btn--danger" onClick={() => deleteTask(task.id)}>
            <Trash2 size={15} aria-hidden /> Delete
          </button>
          <span className="spacer" />
          {!done && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                commitTitle();
                commitNotes();
                onClose();
                focusOnTask(task.id);
              }}
            >
              <Play size={15} aria-hidden /> Start focus
            </button>
          )}
        </>
      }
    >
      <div className="dialog__body task-panel__body">
        <div className="task-panel__head">
          <input
            type="checkbox"
            className={cx("check", `check--${tone}`)}
            checked={done}
            onChange={() => toggleTask(task.id)}
            aria-label={done ? "Mark as not done" : "Mark as done"}
          />
          <label htmlFor="task-title" className="visually-hidden">
            Title
          </label>
          <textarea
            id="task-title"
            className={cx("task-panel__title", done && "is-done")}
            value={title}
            rows={1}
            onChange={e => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
          />
        </div>
        <div className="row row--wrap task-panel__chips">
          <DueChip task={task} now={now} />
          {inFocus && (
            <span className="chip chip--star">
              <Sparkles size={12} aria-hidden /> Linked to focus timer
            </span>
          )}
        </div>

        <div className="field">
          <span className="label" id="tp-priority">
            Priority
          </span>
          <div className="priority-picker" role="radiogroup" aria-labelledby="tp-priority">
            {PRIORITY_ORDER.map(code => {
              const m = PRIORITY_META[code];
              const selected = task.priority === code;
              return (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cx("priority-option", selected && "is-selected", `priority-option--${m.tone}`)}
                  onClick={() => updateTask(task.id, { priority: code })}
                >
                  <span className="priority-option__label">
                    <span className={cx("pdot", `pdot--${m.tone}`)} aria-hidden /> {m.label}
                  </span>
                  <span className="priority-option__long">{m.long}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="task-panel__grid">
          <div className="field">
            <label className="label" htmlFor="tp-date">
              Due date
            </label>
            <input
              id="tp-date"
              type="date"
              className="input"
              value={task.dueDate ?? ""}
              onChange={e => updateTask(task.id, { dueDate: e.target.value || null })}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="tp-time">
              Time
            </label>
            <input
              id="tp-time"
              type="time"
              className="input"
              value={task.dueTime ?? ""}
              disabled={!task.dueDate}
              onChange={e => updateTask(task.id, { dueTime: e.target.value || null })}
            />
          </div>
          <div className="field task-panel__span">
            <label className="label" htmlFor="tp-goal">
              Goal
            </label>
            <select
              id="tp-goal"
              className="select"
              value={task.goalId ?? ""}
              onChange={e => updateTask(task.id, { goalId: e.target.value || null })}
            >
              <option value="">No goal</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field task-panel__span">
            <label className="label" htmlFor="tp-scheduled">Planned work start</label>
            <input id="tp-scheduled" type="datetime-local" className="input"
              value={task.scheduledAt ? new Date(task.scheduledAt - new Date(task.scheduledAt).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ""}
              onChange={e => updateTask(task.id, { scheduledAt: e.target.value ? new Date(e.target.value).getTime() : null })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="tp-estimate">Estimated minutes</label>
            <input id="tp-estimate" type="number" min={5} max={720} step={5} className="input"
              value={task.estimateMin ?? ""}
              onChange={e => updateTask(task.id, { estimateMin: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="field task-panel__span">
            <label className="switch">
              <input
                type="checkbox"
                checked={task.remind}
                disabled={!task.dueTime}
                onChange={e => {
                  updateTask(task.id, { remind: e.target.checked });
                  if (e.target.checked && "Notification" in window && Notification.permission === "default") {
                    void Notification.requestPermission();
                  }
                }}
              />
              Remind me at the due time
            </label>
            <span className="hint">
              {task.dueTime
                ? task.reminderSentAt && task.remind
                  ? "Reminder already sent. Change the time to schedule it again."
                  : "Reminders appear while AstraFocus is open in a tab."
                : "Set a time to enable reminders."}
            </span>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="tp-notes">
            Notes
          </label>
          <textarea
            id="tp-notes"
            className="textarea"
            placeholder="Context, links, the first small step…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={commitNotes}
          />
        </div>

        <dl className="task-panel__facts">
          <div>
            <dt>Focus sessions</dt>
            <dd className="tabular">{task.pomodoros}</dd>
          </div>
          <div>
            <dt>Time focused</dt>
            <dd className="tabular">{focusedMs > 0 ? formatDuration(focusedMs) : "None yet"}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{new Date(task.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</dd>
          </div>
          {task.completedAt && (
            <div>
              <dt>Completed</dt>
              <dd>{new Date(task.completedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</dd>
            </div>
          )}
        </dl>

        {inFocus && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPrefs({ activeTaskId: null })}>
            Unlink from focus timer
          </button>
        )}
      </div>
    </Dialog>
  );
};
