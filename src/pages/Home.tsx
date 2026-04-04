import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import {
  formatPomodoroMs,
  modeLabel,
  usePomodoro,
} from "../context/PomodoroContext";

type Priority = "UI" | "UN" | "NI" | "NN";
type Filter = "all" | "active" | "completed";

interface Task {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
  dueAt?: string;
  remind?: boolean;
  notified?: boolean;
  pomos?: number;
  priority?: Priority;
  goalId?: number | null;
}

interface Props {
  input: string;
  setInput: (v: string) => void;
  dueAt: string;
  setDueAt: (v: string) => void;
  remind: boolean;
  setRemind: (v: boolean) => void;
  addTask: () => void;
  requestPermission: () => void;
  activeTaskId: number | null;
  setActiveTaskId: (id: number | null) => void;
  tasks: Task[];
  filteredTasks: Task[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  toggleTask: (id: number) => void;
  removeTask: (id: number) => void;
  clearCompleted: () => void;
  remaining: number;
  priorityPref: Priority;
  setPriorityPref: (p: Priority) => void;
  setTaskPriority: (id: number, p: Priority) => void;
}

const PRIORITIES: Priority[] = ["UI", "UN", "NI", "NN"];

const PRIORITY_META: Record<
  Priority,
  { short: string; long: string; detail: string; hint: string }
> = {
  UI: {
    short: "Do first",
    long: "Urgent & important",
    detail: "True priorities and real deadlines—handle these before anything else.",
    hint: "Crises, overdue work, health or safety.",
  },
  UN: {
    short: "Delegate / quick",
    long: "Urgent, not important",
    detail: "Feels loud but doesn’t move your big goals—delegate, batch, or keep very short.",
    hint: "Some meetings, interruptions, shallow email.",
  },
  NI: {
    short: "Schedule",
    long: "Important, not urgent",
    detail: "Where long-term progress lives—put real time on the calendar.",
    hint: "Learning, relationships, strategy, deep work.",
  },
  NN: {
    short: "Later or drop",
    long: "Neither urgent nor important",
    detail: "Optional noise—do only if you have spare energy; otherwise trim.",
    hint: "Random scrolling, low-value busywork.",
  },
};

function priorityTitle(pr: Priority): string {
  const m = PRIORITY_META[pr];
  return `${m.long} (${pr}). ${m.detail}`;
}

const HomeFocusEntry: React.FC = () => {
  const {
    running,
    phase,
    mode,
    remainingMs,
    quickStartFocus,
    linkedTaskTitle,
    showMiniTimer,
  } = usePomodoro();

  const statusLabel =
    running
      ? `${modeLabel(mode)} · ${formatPomodoroMs(remainingMs)}`
      : phase === "paused"
        ? `Paused · ${modeLabel(mode)} · ${formatPomodoroMs(remainingMs)}`
        : "Ready — start from Focus or use quick start below";

  return (
    <section className="card focus-entry" aria-labelledby="focus-entry-heading">
      <h2 id="focus-entry-heading" className="focus-entry__title">
        Focus &amp; Pomodoro
      </h2>
      <p className="focus-entry__lede">
        Deep work lives on the Focus page. Sessions keep running when you browse Home, Matrix, or Goals.
      </p>
      <p className="focus-entry__status" aria-live="polite">
        <strong>Status:</strong> {statusLabel}
      </p>
      {linkedTaskTitle ? (
        <p className="focus-entry__linked">
          <strong>Linked task:</strong> {linkedTaskTitle}
        </p>
      ) : null}
      <div className="focus-entry__actions">
        <Link to="/focus" className="btn btn--primary">
          Open Focus
        </Link>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => quickStartFocus(25)}
          disabled={showMiniTimer}
          title={showMiniTimer ? "Pause or finish the current session first" : "Start a 25-minute focus session"}
        >
          Quick 25 min
        </button>
      </div>
    </section>
  );
};

const Home: React.FC<Props> = p => {
  const { running: pomoRunning } = usePomodoro();
  const canAdd = p.input.trim().length > 0;
  const completedCount = useMemo(() => p.tasks.filter(t => t.completed).length, [p.tasks]);
  const total = p.tasks.length;
  const hasNoTasks = total === 0;
  const showFilterEmpty = !hasNoTasks && p.filteredTasks.length === 0;

  const emptyFilterContent = () => {
    if (p.filter === "active") {
      return {
        title: "No active tasks here",
        body:
          completedCount === total
            ? "Everything on your list is checked off. Switch to Completed to review, or add something new."
            : "Nothing left to do in this view. Try All to see every task, or adjust priorities on items below.",
        actionLabel: "Show all tasks",
        onAction: () => p.setFilter("all"),
      };
    }
    if (p.filter === "completed") {
      return {
        title: "No completed tasks yet",
        body: "When you finish something, tick the checkbox—it will appear here so you can see progress at a glance.",
        actionLabel: "Show all tasks",
        onAction: () => p.setFilter("all"),
      };
    }
    return {
      title: "Nothing to show",
      body: "Try another filter or add a new task.",
      actionLabel: "Show all tasks",
      onAction: () => p.setFilter("all"),
    };
  };

  const filterEmpty = showFilterEmpty ? emptyFilterContent() : null;

  return (
    <>
      <PageHeader
        icon="🏠"
        title="Home"
        subtitle="Capture tasks, set priorities, and pick what to focus on next—all on your device."
      />

      <HomeFocusEntry />

      <section className="card task-form" aria-labelledby="task-form-heading">
        <div className="task-form__header">
          <h2 id="task-form-heading" className="task-form__title">
            New task
          </h2>
          <p className="task-form__lede">Describe what you need to do, optionally add a due time, then add it to your list.</p>
        </div>

        <div className="task-form__field">
          <label className="task-form__label" htmlFor="task-input">
            What needs to be done?
          </label>
          <input
            id="task-input"
            className="input task-form__input"
            value={p.input}
            placeholder="e.g. Draft project outline, call dentist, buy groceries…"
            onChange={e => p.setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && canAdd && p.addTask()}
            autoComplete="off"
          />
        </div>

        <div className="task-form__field task-form__field--split">
          <div className="task-form__field-grow">
            <label className="task-form__label" htmlFor="task-due">
              Due date &amp; time <span className="task-form__optional">(optional)</span>
            </label>
            <input
              id="task-due"
              className="input task-form__input"
              type="datetime-local"
              value={p.dueAt}
              onChange={e => p.setDueAt(e.target.value)}
            />
          </div>
        </div>

        <div className="task-form__options">
          <label className="task-form__check">
            <input type="checkbox" checked={p.remind} onChange={e => p.setRemind(e.target.checked)} />
            <span className="task-form__check-text">
              <span className="task-form__check-title">Remind me at due time</span>
              <span className="task-form__check-hint">Requires notifications (bell in the top bar).</span>
            </span>
          </label>
        </div>

        <div className="task-form__fieldset">
          <div className="task-form__legend" id="priority-legend">
            Priority for new tasks
          </div>
          <p className="task-form__legend-hint" id="priority-hint">
            Based on the Eisenhower matrix. Codes on each tile match how tasks are stored (UI / UN / NI / NN).
          </p>
          <div
            className="priority-tiles"
            role="group"
            aria-labelledby="priority-legend"
            aria-describedby="priority-hint"
          >
            {PRIORITIES.map(pr => {
              const meta = PRIORITY_META[pr];
              const active = p.priorityPref === pr;
              return (
                <button
                  key={pr}
                  type="button"
                  className={`priority-tile ${active ? "priority-tile--active" : ""}`}
                  aria-pressed={active}
                  title={priorityTitle(pr)}
                  onClick={() => p.setPriorityPref(pr)}
                >
                  <span className="priority-tile__short">{meta.short}</span>
                  <span className="priority-tile__long">{meta.long}</span>
                  <span className="priority-tile__code" aria-hidden>
                    {pr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="task-form__actions">
          <button type="button" className="btn btn--primary" onClick={p.addTask} disabled={!canAdd} title={canAdd ? undefined : "Type a task first"}>
            Add to list
          </button>
          <button type="button" className="btn btn--secondary" onClick={p.requestPermission}>
            Enable notifications
          </button>
        </div>
      </section>

      <div className="task-toolbar">
        <div className="task-toolbar__main">
          <span className="task-toolbar__eyebrow" id="task-filter-label">
            Your tasks
          </span>
          <div className="task-toolbar__row">
            <div className="filter-segment" role="group" aria-labelledby="task-filter-label">
              <button
                type="button"
                className={`chip filter-chip ${p.filter === "all" ? "active" : ""}`}
                onClick={() => p.setFilter("all")}
                aria-pressed={p.filter === "all"}
              >
                All
                {total > 0 && <span className="filter-chip__count">{total}</span>}
              </button>
              <button
                type="button"
                className={`chip filter-chip ${p.filter === "active" ? "active" : ""}`}
                onClick={() => p.setFilter("active")}
                aria-pressed={p.filter === "active"}
              >
                Active
                {total > 0 && <span className="filter-chip__count">{p.remaining}</span>}
              </button>
              <button
                type="button"
                className={`chip filter-chip ${p.filter === "completed" ? "active" : ""}`}
                onClick={() => p.setFilter("completed")}
                aria-pressed={p.filter === "completed"}
              >
                Done
                {total > 0 && <span className="filter-chip__count">{completedCount}</span>}
              </button>
            </div>
            <div className="task-toolbar__stats" aria-live="polite">
              <span className="task-stat">
                <strong>{p.remaining}</strong> active
              </span>
              <span className="task-stat task-stat--muted">
                <strong>{completedCount}</strong> completed
              </span>
              <button
                type="button"
                className="link task-toolbar__clear"
                onClick={p.clearCompleted}
                disabled={completedCount === 0}
                title={completedCount === 0 ? "No completed tasks to remove" : "Remove finished tasks from the list"}
              >
                Clear completed
              </button>
            </div>
          </div>
        </div>
      </div>

      {hasNoTasks && (
        <div className="empty-state empty-state--onboard" role="status">
          <div className="empty-state__visual" aria-hidden>
            ✨
          </div>
          <h3 className="empty-state__title">Your list is ready</h3>
          <p className="empty-state__body">
            Add one clear task above. You can always edit priority, set a due time, or turn on reminders after it’s on the list.
          </p>
          <ol className="empty-state__steps">
            <li>
              <strong>Type</strong> the outcome you want in plain language.
            </li>
            <li>
              <strong>Optional:</strong> pick a due time and toggle a reminder.
            </li>
            <li>
              <strong>Choose</strong> a priority so you know what to tackle first.
            </li>
            <li>
              <strong>Press</strong> “Add to list” (or Enter when the field isn’t empty).
            </li>
          </ol>
        </div>
      )}

      {filterEmpty && (
        <div className="empty-state empty-state--filter" role="status">
          <div className="empty-state__visual" aria-hidden>
            🔍
          </div>
          <h3 className="empty-state__title">{filterEmpty.title}</h3>
          <p className="empty-state__body">{filterEmpty.body}</p>
          <button type="button" className="btn btn--secondary empty-state__action" onClick={filterEmpty.onAction}>
            {filterEmpty.actionLabel}
          </button>
        </div>
      )}

      {!hasNoTasks && p.filteredTasks.length > 0 && (
        <ul className="list">
          {p.filteredTasks.map(task => (
            <li className={`item ${p.activeTaskId === task.id && pomoRunning ? "pomo-active" : ""}`} key={task.id}>
              <div className="item__main">
                <input type="checkbox" checked={task.completed} onChange={() => p.toggleTask(task.id)} title="Mark complete" />
                <span className={`text ${task.completed ? "done" : ""}`}>
                  {task.text}
                  {task.dueAt && (
                    <small className="item__meta">Due {new Date(task.dueAt).toLocaleString()}</small>
                  )}
                  {task.remind && !task.notified && <small className="item__meta item__meta--accent">Will remind at due time</small>}
                  {task.remind && task.notified && <small className="item__meta">Reminder sent</small>}
                  {typeof task.pomos === "number" && task.pomos > 0 && (
                    <small className="item__meta">⏱️ {task.pomos} Pomodoro{task.pomos === 1 ? "" : "s"}</small>
                  )}
                </span>
              </div>

              <div className="item__footer">
                <div className="priority-row" role="group" aria-label="Priority for this task">
                  {PRIORITIES.map(pr => {
                    const active = (task.priority ?? "NN") === pr;
                    const meta = PRIORITY_META[pr];
                    return (
                      <button
                        key={pr}
                        type="button"
                        className={`pill small priority-row__btn ${active ? "active" : ""}`}
                        title={priorityTitle(pr)}
                        aria-label={`${meta.short} (${pr})`}
                        aria-pressed={active}
                        onClick={() => p.setTaskPriority(task.id, pr)}
                      >
                        <span className="priority-row__short">{meta.short}</span>
                        <span className="priority-row__code" aria-hidden>
                          {pr}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="item__actions">
                  <button
                    type="button"
                    className={`pill ${p.activeTaskId === task.id ? "active" : ""}`}
                    onClick={() => p.setActiveTaskId(p.activeTaskId === task.id ? null : task.id)}
                    title="Link this task for Pomodoro on the Focus page"
                  >
                    🎯 Focus
                  </button>
                  <button type="button" className="icon" onClick={() => p.removeTask(task.id)} aria-label={`Delete task: ${task.text}`}>
                    🗑️
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default Home;
