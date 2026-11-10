import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { useAppToast } from "../../context/AppToast";
import { createId } from "../../lib/id";
import { browserStore } from "../../lib/storage";
import { playNotificationSound } from "../../lib/notificationSound";
import { WORKSPACE_KEY, loadWorkspace, type LoadResult } from "./migrate";
import { reducer, type GoalPatch, type ProjectPatch, type TaskPatch } from "./reducer";
import { emptyWorkspace, normalizeWorkspace, type FocusSession, type Goal, type Prefs, type Project, type Task, type WorkspaceData } from "./schema";
import { dueTimestamp } from "./selectors";

export type NewTask = Partial<Omit<Task, "id" | "createdAt" | "updatedAt">> & { title: string };

export interface WorkspaceActions {
  addTask(input: NewTask): Task;
  updateTask(id: string, patch: TaskPatch): void;
  /** Returns true when the task is now done. */
  toggleTask(id: string): boolean;
  deleteTask(id: string): void;
  clearCompleted(): void;
  addGoal(input: { title: string; emoji?: string; targetDate?: string | null }): Goal;
  updateGoal(id: string, patch: GoalPatch): void;
  deleteGoal(id: string): void;
  addProject(input: { title: string; notes?: string; targetDate?: string | null; goalId?: string | null }): Project;
  updateProject(id: string, patch: ProjectPatch): void;
  deleteProject(id: string): void;
  replaceData(data: WorkspaceData): void;
  setPrefs(patch: Partial<Prefs>): void;
  logFocusSession(session: FocusSession): void;
}

const StateCtx = createContext<WorkspaceData | null>(null);
const ActionsCtx = createContext<WorkspaceActions | null>(null);
const LoadCtx = createContext<LoadResult["status"]>("fresh");

const REMINDER_CHECK_MS = 30_000;

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useAppToast();
  const store = useMemo(browserStore, []);
  const initial = useMemo<LoadResult>(() => {
    if (!store) return { data: emptyWorkspace(), status: "fresh", dropped: 0, needsWrite: false };
    return loadWorkspace(store);
  }, [store]);

  const [state, dispatch] = useReducer(reducer, initial.data);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ---- Persistence -------------------------------------------------------
  const lastWritten = useRef<string | null>(initial.needsWrite ? null : store?.getItem(WORKSPACE_KEY) ?? null);
  const saveFailedRef = useRef(false);
  useEffect(() => {
    if (!store) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastWritten.current) return;
    try {
      store.setItem(WORKSPACE_KEY, serialized);
      lastWritten.current = serialized;
      saveFailedRef.current = false;
    } catch {
      if (!saveFailedRef.current) {
        saveFailedRef.current = true;
        showToast("Couldn’t save your changes: browser storage is full or disabled. Export your data from Settings.", {
          tone: "danger",
          durationMs: 15_000,
        });
      }
    }
  }, [state, store, showToast]);

  // Keep multiple open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== WORKSPACE_KEY || e.newValue == null || e.newValue === lastWritten.current) return;
      try {
        const n = normalizeWorkspace(JSON.parse(e.newValue), Date.now());
        if (n) {
          lastWritten.current = e.newValue;
          dispatch({ type: "replace", data: n.data });
        }
      } catch {
        /* ignore partial writes */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // One-time notice after importing data from the previous version.
  const announced = useRef(false);
  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    if (initial.status === "migrated" || initial.status === "recovered") {
      const m = initial.data.migrations[initial.data.migrations.length - 1];
      if (m) {
        showToast(
          `Welcome to the new AstraFocus. Imported ${m.importedTasks} ${m.importedTasks === 1 ? "task" : "tasks"} and ${m.importedGoals} ${m.importedGoals === 1 ? "goal" : "goals"}. Your original data is kept as a backup.`,
          { tone: "success", durationMs: 12_000 }
        );
      }
    }
  }, [initial, showToast]);

  // ---- Due-time reminders (works while a tab is open) ----------------------
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const due = stateRef.current.tasks.filter(t => {
        if (t.status !== "todo" || !t.remind || t.reminderSentAt) return false;
        const ts = dueTimestamp(t);
        return ts != null && ts <= now;
      });
      if (!due.length) return;
      for (const t of due) {
        void playNotificationSound(`reminder-${t.id}-${dueTimestamp(t)}`);
        let delivered = false;
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("Task reminder", { body: t.title, tag: `task-${t.id}` });
            delivered = true;
          } catch {
            /* some mobile browsers only allow notifications from a service worker */
          }
        }
        if (!delivered || document.visibilityState === "visible") {
          showToast(`Reminder: ${t.title}`, { tone: "warning", durationMs: 12_000 });
        }
      }
      dispatch({ type: "reminders/sent", ids: due.map(t => t.id), at: now });
    };
    check();
    const id = window.setInterval(check, REMINDER_CHECK_MS);
    return () => window.clearInterval(id);
  }, [showToast]);

  // ---- Actions ------------------------------------------------------------
  const actions = useMemo<WorkspaceActions>(() => {
    const now = () => Date.now();
    return {
      addTask(input) {
        const ts = now();
        const prefs = stateRef.current.prefs;
        // Ignore keys passed as `undefined` so they don't override defaults.
        const defined = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as NewTask;
        const task: Task = {
          notes: "",
          status: "todo",
          priority: prefs.defaultPriority,
          dueDate: null,
          dueTime: null,
          scheduledAt: null,
          estimateMin: null,
          remind: false,
          reminderSentAt: null,
          goalId: prefs.defaultGoalId,
          projectId: null,
          pomodoros: 0,
          completedAt: null,
          ...defined,
          title: input.title.trim(),
          id: createId("t"),
          createdAt: ts,
          updatedAt: ts,
        };
        dispatch({ type: "task/add", task });
        return task;
      },
      updateTask(id, patch) {
        dispatch({ type: "task/update", id, patch, now: now() });
      },
      toggleTask(id) {
        const t = stateRef.current.tasks.find(x => x.id === id);
        dispatch({ type: "task/toggle", id, now: now() });
        return !!t && t.status === "todo";
      },
      deleteTask(id) {
        const tasks = stateRef.current.tasks;
        const index = tasks.findIndex(t => t.id === id);
        if (index < 0) return;
        const task = tasks[index];
        const wasActive = stateRef.current.prefs.activeTaskId === id;
        dispatch({ type: "task/delete", id });
        showToast(`Deleted “${task.title}”`, {
          action: {
            label: "Undo",
            onClick: () => {
              dispatch({ type: "task/restore", task, index });
              if (wasActive) dispatch({ type: "prefs/set", patch: { activeTaskId: id } });
            },
          },
        });
      },
      clearCompleted() {
        const done = stateRef.current.tasks.filter(t => t.status === "done");
        if (!done.length) return;
        dispatch({ type: "task/clearCompleted" });
        showToast(`Cleared ${done.length} completed ${done.length === 1 ? "task" : "tasks"}`, {
          action: { label: "Undo", onClick: () => dispatch({ type: "task/restoreMany", tasks: done }) },
        });
      },
      addGoal({ title, emoji = "🎯", targetDate = null }) {
        const ts = now();
        const goal: Goal = { id: createId("g"), title: title.trim(), emoji, targetDate, createdAt: ts, updatedAt: ts };
        dispatch({ type: "goal/add", goal });
        return goal;
      },
      updateGoal(id, patch) {
        dispatch({ type: "goal/update", id, patch, now: now() });
      },
      deleteGoal(id) {
        const goals = stateRef.current.goals;
        const index = goals.findIndex(g => g.id === id);
        if (index < 0) return;
        const goal = goals[index];
        const taskIds = stateRef.current.tasks.filter(t => t.goalId === id).map(t => t.id);
        const wasDefault = stateRef.current.prefs.defaultGoalId === id;
        dispatch({ type: "goal/delete", id });
        showToast(`Deleted goal “${goal.title}”. Its tasks were kept.`, {
          action: {
            label: "Undo",
            onClick: () => {
              dispatch({ type: "goal/restore", goal, index, taskIds });
              if (wasDefault) dispatch({ type: "prefs/set", patch: { defaultGoalId: id } });
            },
          },
        });
      },
      addProject({ title, notes = "", targetDate = null, goalId = null }) {
        const ts = now();
        const project: Project = { id: createId("p"), title: title.trim(), notes, targetDate, goalId, createdAt: ts, updatedAt: ts };
        dispatch({ type: "project/add", project });
        return project;
      },
      updateProject(id, patch) {
        dispatch({ type: "project/update", id, patch, now: now() });
      },
      deleteProject(id) {
        dispatch({ type: "project/delete", id });
      },
      replaceData(data) {
        dispatch({ type: "replace", data });
      },
      setPrefs(patch) {
        dispatch({ type: "prefs/set", patch });
      },
      logFocusSession(session) {
        dispatch({ type: "focus/log", session });
      },
    };
  }, [showToast]);

  return (
    <LoadCtx.Provider value={initial.status}>
      <ActionsCtx.Provider value={actions}>
        <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
      </ActionsCtx.Provider>
    </LoadCtx.Provider>
  );
};

export function useWorkspace(): WorkspaceData {
  const v = useContext(StateCtx);
  if (!v) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return v;
}

export function useWorkspaceActions(): WorkspaceActions {
  const v = useContext(ActionsCtx);
  if (!v) throw new Error("useWorkspaceActions must be used within WorkspaceProvider");
  return v;
}

export function useWorkspaceLoadStatus() {
  return useContext(LoadCtx);
}
