import React, { useState } from "react";
import { Bell, CalendarClock, FileText, Play, Sparkles, Timer } from "lucide-react";
import { useUIActions } from "../../app/ui";
import { useAppToast } from "../../context/AppToast";
import { cx } from "../../lib/cx";
import { formatTime, relativeDayLabel } from "../../lib/dates";
import { useFocusOnTask } from "../focus/useFocusOnTask";
import { PRIORITY_META } from "../workspace/priority";
import type { Goal, Task } from "../workspace/schema";
import { isOverdue } from "../workspace/selectors";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";

interface Props {
  task: Task;
  now: Date;
  /** Hide the priority chip (e.g. inside a matrix quadrant). */
  hidePriority?: boolean;
  /** Hide the goal chip (e.g. inside a goal card). */
  hideGoal?: boolean;
  compact?: boolean;
  /** Extra controls rendered at the end of the row. */
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
  draggable?: boolean;
}

export function DueChip({ task, now }: { task: Task; now: Date }) {
  if (!task.dueDate) return null;
  const overdue = isOverdue(task, now);
  const label = relativeDayLabel(task.dueDate, now) + (task.dueTime ? ` · ${formatTime(task.dueTime)}` : "");
  return (
    <span className={cx("chip", overdue ? "chip--danger" : task.dueDate && label.startsWith("Today") ? "chip--accent" : undefined)}>
      <CalendarClock size={12} aria-hidden />
      <span>
        {overdue && <span className="visually-hidden">Overdue: </span>}
        {label}
      </span>
    </span>
  );
}

export const TaskRow: React.FC<Props> = ({ task, now, hidePriority, hideGoal, compact, trailing, leading, draggable }) => {
  const { goals, prefs } = useWorkspace();
  const { toggleTask } = useWorkspaceActions();
  const { openTask } = useUIActions();
  const { showToast } = useAppToast();
  const focusOnTask = useFocusOnTask();
  const [completing, setCompleting] = useState(false);

  const meta = PRIORITY_META[task.priority];
  const goal: Goal | undefined = task.goalId ? goals.find(g => g.id === task.goalId) : undefined;
  const done = task.status === "done";
  const inFocus = prefs.activeTaskId === task.id;

  const onCheck = () => {
    if (done) {
      toggleTask(task.id);
      return;
    }
    // Let the check animation play before the row moves or disappears.
    setCompleting(true);
    window.setTimeout(() => {
      toggleTask(task.id);
      setCompleting(false);
      showToast(`Completed “${task.title}”`, {
        tone: "success",
        action: { label: "Undo", onClick: () => toggleTask(task.id) },
      });
    }, 260);
  };

  return (
    <li
      className={cx("task-row", compact && "task-row--compact", (done || completing) && "is-done", completing && "is-completing", inFocus && "is-focus")}
      draggable={draggable}
      onDragStart={
        draggable
          ? e => {
              e.dataTransfer.setData("text/x-astra-task", task.id);
              e.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
    >
      {leading}
      <input
        type="checkbox"
        className={cx("check", `check--${meta.tone}`)}
        checked={done || completing}
        onChange={onCheck}
        aria-label={done ? `Mark “${task.title}” as not done` : `Complete “${task.title}”`}
      />
      <button type="button" className="task-row__main" onClick={() => openTask(task.id)}>
        <span className="task-row__title">{task.title}</span>
        <span className="task-row__meta">
          {inFocus && (
            <span className="chip chip--star">
              <Sparkles size={12} aria-hidden /> In focus
            </span>
          )}
          <DueChip task={task} now={now} />
          {!hidePriority && (
            <span className="chip" title={meta.long}>
              <span className={cx("pdot", `pdot--${meta.tone}`)} aria-hidden />
              {meta.label}
            </span>
          )}
          {!hideGoal && goal && (
            <span className="chip chip--outline">
              <span aria-hidden>{goal.emoji}</span> {goal.title}
            </span>
          )}
          {task.pomodoros > 0 && (
            <span className="chip" title={`${task.pomodoros} completed focus sessions`}>
              <Timer size={12} aria-hidden /> {task.pomodoros}
              <span className="visually-hidden"> focus sessions</span>
            </span>
          )}
          {task.remind && !task.reminderSentAt && !done && (
            <span className="chip" title="Reminder set">
              <Bell size={12} aria-hidden />
              <span className="visually-hidden">Reminder set</span>
            </span>
          )}
          {task.notes && (
            <span className="chip" title="Has notes">
              <FileText size={12} aria-hidden />
              <span className="visually-hidden">Has notes</span>
            </span>
          )}
        </span>
      </button>
      <div className="task-row__actions">
        {!done && (
          <button
            type="button"
            className="btn btn--ghost btn--icon btn--sm task-row__focus"
            onClick={() => focusOnTask(task.id)}
            aria-label={`Focus on “${task.title}”`}
            title="Start a focus session"
          >
            <Play size={14} aria-hidden />
          </button>
        )}
        {trailing}
      </div>
    </li>
  );
};
