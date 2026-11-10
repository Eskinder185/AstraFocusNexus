import React, { useMemo, useState } from "react";
import { CheckCircle2, Inbox, ListChecks, Plus, Search, X } from "lucide-react";
import { useUIActions } from "../../app/ui";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { useNow } from "../../hooks/useNow";
import { toDateKey } from "../../lib/dates";
import type { Task } from "../workspace/schema";
import { listDayKey } from "../workspace/schedule";
import { compareByDue, compareByPriority, groupOpenTasks, isOpen, isOverdue } from "../workspace/selectors";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";
import { InlineQuickAdd } from "./TaskComposer";
import { TaskRow } from "./TaskRow";

type View = "open" | "today" | "upcoming" | "done" | "all";
type Sort = "smart" | "priority" | "due" | "newest";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "open", label: "Open" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "done", label: "Completed" },
  { id: "all", label: "All" },
];

const VIEW_KEY = "astra.ui.tasksView";

export const TasksPage: React.FC = () => {
  const { tasks, goals } = useWorkspace();
  const { clearCompleted } = useWorkspaceActions();
  const { openComposer } = useUIActions();
  const now = useNow();
  const todayKey = toDateKey(now);

  const [view, setView] = useState<View>(() => {
    const v = sessionStorage.getItem(VIEW_KEY) as View | null;
    return v && VIEWS.some(x => x.id === v) ? v : "open";
  });
  const [sort, setSort] = useState<Sort>("smart");
  const [query, setQuery] = useState("");
  const [goalFilter, setGoalFilter] = useState<string>("any");

  const changeView = (v: View) => {
    setView(v);
    sessionStorage.setItem(VIEW_KEY, v);
  };

  const counts = useMemo(
    () => ({
      open: tasks.filter(isOpen).length,
      today: tasks.filter(t => isOpen(t) && (listDayKey(t, now) === todayKey || isOverdue(t, now))).length,
      upcoming: tasks.filter(t => isOpen(t) && !isOverdue(t, now) && (listDayKey(t, now) ?? "") > todayKey).length,
      done: tasks.filter(t => t.status === "done").length,
      all: tasks.length,
    }),
    [tasks, todayKey, now]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter(t => {
      if (view === "open" && !isOpen(t)) return false;
      if (view === "today" && !(isOpen(t) && (listDayKey(t, now) === todayKey || isOverdue(t, now)))) return false;
      if (view === "upcoming" && !(isOpen(t) && !isOverdue(t, now) && (listDayKey(t, now) ?? "") > todayKey)) return false;
      if (view === "done" && t.status !== "done") return false;
      if (goalFilter === "none" && t.goalId) return false;
      if (goalFilter !== "any" && goalFilter !== "none" && t.goalId !== goalFilter) return false;
      if (q && !`${t.title} ${t.notes}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, view, goalFilter, query, todayKey, now]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (view === "done") return list.sort((a, b) => (b.completedAt ?? b.updatedAt) - (a.completedAt ?? a.updatedAt));
    if (sort === "priority") return list.sort(compareByPriority);
    if (sort === "due" || view === "upcoming" || view === "today") return list.sort(compareByDue);
    if (sort === "newest") return list.sort((a, b) => b.createdAt - a.createdAt);
    // "smart" for mixed views: open first (by due then priority), completed last.
    return list.sort((a, b) => (a.status === b.status ? compareByDue(a, b) : a.status === "todo" ? -1 : 1));
  }, [filtered, sort, view]);

  const grouped = view === "open" && sort === "smart";
  const groups = grouped ? groupOpenTasks(filtered, now) : null;
  const filtersActive = query.trim() !== "" || goalFilter !== "any";

  return (
    <div className="tasks-page">
      <PageHeader
        title="Tasks"
        description={`${counts.open} open${counts.today ? ` · ${counts.today} due today or overdue` : ""}`}
        actions={
          <button type="button" className="btn btn--primary" onClick={() => openComposer()}>
            <Plus size={16} aria-hidden /> New task
          </button>
        }
      />

      <section className="card tasks-card">
        <div className="tasks-card__capture">
          <InlineQuickAdd />
        </div>

        <div className="toolbar">
          <div className="segmented toolbar__views" role="tablist" aria-label="Task views">
            {VIEWS.map(v => (
              <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => changeView(v.id)}>
                {v.label}
                <span className="count">{counts[v.id]}</span>
              </button>
            ))}
          </div>
          <div className="toolbar__filters">
            <div className="search-field">
              <Search size={15} aria-hidden className="search-field__icon" />
              <label htmlFor="task-search" className="visually-hidden">
                Filter tasks
              </label>
              <input
                id="task-search"
                className="input search-field__input"
                placeholder="Filter"
                value={query}
                onChange={e => setQuery(e.target.value)}
                type="search"
              />
            </div>
            <label className="visually-hidden" htmlFor="task-goal-filter">
              Goal
            </label>
            <select id="task-goal-filter" className="select toolbar__select" value={goalFilter} onChange={e => setGoalFilter(e.target.value)}>
              <option value="any">Any goal</option>
              <option value="none">No goal</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.title}
                </option>
              ))}
            </select>
            {view !== "done" && (
              <>
                <label className="visually-hidden" htmlFor="task-sort">
                  Sort
                </label>
                <select id="task-sort" className="select toolbar__select" value={sort} onChange={e => setSort(e.target.value as Sort)}>
                  <option value="smart">Smart</option>
                  <option value="priority">Priority</option>
                  <option value="due">Due date</option>
                  <option value="newest">Newest</option>
                </select>
              </>
            )}
          </div>
        </div>

        <div className="tasks-card__list" role="tabpanel" aria-label={VIEWS.find(v => v.id === view)?.label}>
          {sorted.length === 0 ? (
            <TasksEmpty view={view} filtersActive={filtersActive} hasTasks={tasks.length > 0} onClear={() => (setQuery(""), setGoalFilter("any"))} />
          ) : groups ? (
            <>
              <Group label="Overdue" tone="danger" tasks={groups.overdue} now={now} />
              <Group label="Today" tasks={groups.today} now={now} />
              <Group label="Upcoming" tasks={groups.upcoming} now={now} />
              <Group label="No date" tasks={groups.someday} now={now} />
            </>
          ) : (
            <ul role="list" className="task-list">
              {sorted.map(t => (
                <TaskRow key={t.id} task={t} now={now} />
              ))}
            </ul>
          )}
        </div>

        {view === "done" && counts.done > 0 && (
          <div className="card__footer row">
            <span className="subtle">{counts.done} completed</span>
            <span className="spacer" />
            <button type="button" className="btn btn--sm btn--ghost" onClick={clearCompleted}>
              Clear completed
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

const Group: React.FC<{ label: string; tasks: Task[]; now: Date; tone?: "danger" }> = ({ label, tasks, now, tone }) =>
  tasks.length ? (
    <section className="task-group" aria-label={`${label}, ${tasks.length}`}>
      <h2 className={`list-label ${tone ? `list-label--${tone}` : ""}`}>
        {label} <span className="tabular">· {tasks.length}</span>
      </h2>
      <ul role="list" className="task-list">
        {tasks.map(t => (
          <TaskRow key={t.id} task={t} now={now} />
        ))}
      </ul>
    </section>
  ) : null;

const TasksEmpty: React.FC<{ view: View; filtersActive: boolean; hasTasks: boolean; onClear: () => void }> = ({ view, filtersActive, hasTasks, onClear }) => {
  if (filtersActive) {
    return (
      <EmptyState
        compact
        icon={<Search size={18} />}
        title="No matching tasks"
        actions={
          <button type="button" className="btn btn--sm" onClick={onClear}>
            <X size={14} aria-hidden /> Clear filters
          </button>
        }
      >
        Try a different word or goal.
      </EmptyState>
    );
  }
  if (!hasTasks) {
    return (
      <EmptyState icon={<Inbox size={20} />} title="A clear mind starts with a clear list">
        Capture everything above, one task per line. Add a day or priority as you type, e.g. <em>“Lab report thu 9am !1”</em>.
      </EmptyState>
    );
  }
  const copy: Record<View, [string, string]> = {
    open: ["All done", "Every task is complete. Enjoy it, or capture what’s next."],
    today: ["Nothing due today", "Nothing is scheduled or overdue for today."],
    upcoming: ["Nothing upcoming", "Tasks with a future date will appear here."],
    done: ["No completed tasks yet", "Finished tasks collect here, so progress stays visible."],
    all: ["No tasks", ""],
  };
  const [title, body] = copy[view];
  return (
    <EmptyState compact icon={view === "done" ? <CheckCircle2 size={18} /> : <ListChecks size={18} />} title={title}>
      {body}
    </EmptyState>
  );
};
