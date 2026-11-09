import type { FocusSession, Goal, Prefs, Project, Task, WorkspaceData } from "./schema";

export type TaskPatch = Partial<Omit<Task, "id" | "createdAt" | "legacyId">>;
export type GoalPatch = Partial<Pick<Goal, "title" | "emoji" | "targetDate">>;
export type ProjectPatch = Partial<Pick<Project, "title" | "notes" | "targetDate" | "goalId">>;

export type Action =
  | { type: "task/add"; task: Task }
  | { type: "task/update"; id: string; patch: TaskPatch; now: number }
  | { type: "task/toggle"; id: string; now: number }
  | { type: "task/delete"; id: string }
  | { type: "task/restore"; task: Task; index: number }
  | { type: "task/clearCompleted" }
  | { type: "task/restoreMany"; tasks: Task[] }
  | { type: "goal/add"; goal: Goal }
  | { type: "goal/update"; id: string; patch: GoalPatch; now: number }
  | { type: "goal/delete"; id: string }
  | { type: "goal/restore"; goal: Goal; index: number; taskIds: string[] }
  | { type: "project/add"; project: Project }
  | { type: "project/update"; id: string; patch: ProjectPatch; now: number }
  | { type: "project/delete"; id: string }
  | { type: "prefs/set"; patch: Partial<Prefs> }
  | { type: "focus/log"; session: FocusSession }
  | { type: "reminders/sent"; ids: string[]; at: number }
  | { type: "replace"; data: WorkspaceData };

const MAX_SESSIONS = 5000;

/** Enforces cross-field invariants after any edit. */
function sanitizeTask(t: Task): Task {
  const dueDate = t.dueDate || null;
  const dueTime = dueDate ? t.dueTime || null : null;
  const remind = t.remind && !!dueTime;
  const scheduledAt = typeof t.scheduledAt === "number" && Number.isFinite(t.scheduledAt) ? t.scheduledAt : null;
  const estimateMin = typeof t.estimateMin === "number" && Number.isInteger(t.estimateMin) && t.estimateMin >= 5 && t.estimateMin <= 720 ? t.estimateMin : null;
  return { ...t, dueDate, dueTime, scheduledAt, estimateMin, remind, completedAt: t.status === "done" ? t.completedAt : null };
}

export function reducer(state: WorkspaceData, action: Action): WorkspaceData {
  switch (action.type) {
    case "task/add":
      return { ...state, tasks: [sanitizeTask(action.task), ...state.tasks] };

    case "task/update": {
      let changed = false;
      const tasks = state.tasks.map(t => {
        if (t.id !== action.id) return t;
        changed = true;
        const next: Task = { ...t, ...action.patch, updatedAt: action.now };
        const scheduleChanged =
          next.dueDate !== t.dueDate || next.dueTime !== t.dueTime || (next.remind && !t.remind);
        if (scheduleChanged && !("reminderSentAt" in action.patch)) next.reminderSentAt = null;
        if (next.status === "done" && t.status !== "done") next.completedAt = action.now;
        return sanitizeTask(next);
      });
      return changed ? { ...state, tasks } : state;
    }

    case "task/toggle":
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.id
            ? t.status === "done"
              ? { ...t, status: "todo", completedAt: null, updatedAt: action.now }
              : { ...t, status: "done", completedAt: action.now, updatedAt: action.now }
            : t
        ),
      };

    case "task/delete":
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.id),
        prefs: state.prefs.activeTaskId === action.id ? { ...state.prefs, activeTaskId: null } : state.prefs,
      };

    case "task/restore": {
      if (state.tasks.some(t => t.id === action.task.id)) return state;
      const tasks = [...state.tasks];
      tasks.splice(Math.max(0, Math.min(action.index, tasks.length)), 0, action.task);
      return { ...state, tasks };
    }

    case "task/clearCompleted": {
      const removed = new Set(state.tasks.filter(t => t.status === "done").map(t => t.id));
      return {
        ...state,
        tasks: state.tasks.filter(t => !removed.has(t.id)),
        prefs:
          state.prefs.activeTaskId && removed.has(state.prefs.activeTaskId)
            ? { ...state.prefs, activeTaskId: null }
            : state.prefs,
      };
    }

    case "task/restoreMany": {
      const existing = new Set(state.tasks.map(t => t.id));
      return { ...state, tasks: [...state.tasks, ...action.tasks.filter(t => !existing.has(t.id))] };
    }

    case "goal/add":
      return { ...state, goals: [...state.goals, action.goal] };

    case "goal/update":
      return {
        ...state,
        goals: state.goals.map(g => (g.id === action.id ? { ...g, ...action.patch, updatedAt: action.now } : g)),
      };

    case "goal/delete":
      return {
        ...state,
        goals: state.goals.filter(g => g.id !== action.id),
        tasks: state.tasks.map(t => (t.goalId === action.id ? { ...t, goalId: null } : t)),
        prefs: state.prefs.defaultGoalId === action.id ? { ...state.prefs, defaultGoalId: null } : state.prefs,
      };

    case "goal/restore": {
      if (state.goals.some(g => g.id === action.goal.id)) return state;
      const goals = [...state.goals];
      goals.splice(Math.max(0, Math.min(action.index, goals.length)), 0, action.goal);
      const relink = new Set(action.taskIds);
      return {
        ...state,
        goals,
        tasks: state.tasks.map(t => (relink.has(t.id) && t.goalId == null ? { ...t, goalId: action.goal.id } : t)),
      };
    }

    case "prefs/set":
      return { ...state, prefs: { ...state.prefs, ...action.patch } };

    case "project/add":
      return { ...state, projects: [...state.projects, action.project] };
    case "project/update":
      return { ...state, projects: state.projects.map(p => p.id === action.id ? { ...p, ...action.patch, updatedAt: action.now } : p) };
    case "project/delete":
      return { ...state, projects: state.projects.filter(p => p.id !== action.id), tasks: state.tasks.map(t => t.projectId === action.id ? { ...t, projectId: null } : t) };

    case "focus/log": {
      const s = action.session;
      // The timer can report the same segment twice (StrictMode, multiple tabs, refresh races).
      if (state.focusSessions.some(x => x.id === s.id)) return state;
      const focusSessions = [...state.focusSessions, s].slice(-MAX_SESSIONS);
      const tasks =
        s.completed && s.taskId
          ? state.tasks.map(t => (t.id === s.taskId ? { ...t, pomodoros: t.pomodoros + 1 } : t))
          : state.tasks;
      return { ...state, focusSessions, tasks };
    }

    case "reminders/sent": {
      const ids = new Set(action.ids);
      return { ...state, tasks: state.tasks.map(t => (ids.has(t.id) ? { ...t, reminderSentAt: action.at } : t)) };
    }

    case "replace":
      return action.data;
  }
}
