import { isDateKey, isTimeString } from "../../lib/dates";

/**
 * Eisenhower quadrant codes. Kept identical to the legacy storage values so
 * existing tasks keep their priority after migration.
 *   UI = urgent + important       → Do first
 *   NI = not urgent + important   → Schedule
 *   UN = urgent + not important   → Delegate / keep short
 *   NN = neither                  → Later or drop
 */
export type Priority = "UI" | "NI" | "UN" | "NN";
export const PRIORITIES: Priority[] = ["UI", "NI", "UN", "NN"];

export type TaskStatus = "todo" | "done";

export interface Task {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: Priority;
  /** Local calendar date, "YYYY-MM-DD". */
  dueDate: string | null;
  /** Local time, "HH:mm". Only meaningful when dueDate is set. */
  dueTime: string | null;
  /** Send a reminder at the due date + time. Requires dueTime. */
  remind: boolean;
  reminderSentAt: number | null;
  goalId: string | null;
  /** Completed Pomodoro focus segments linked to this task. */
  pomodoros: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  /** Numeric id from the pre-0.3 storage format, kept for traceability. */
  legacyId?: number;
}

export interface Goal {
  id: string;
  title: string;
  emoji: string;
  targetDate: string | null;
  createdAt: number;
  updatedAt: number;
  legacyId?: number;
}

export interface FocusSession {
  /** Stable id derived from the timer segment, used to drop duplicate completion events. */
  id: string;
  taskId: string | null;
  endedAt: number;
  focusedMs: number;
  /** false when the segment was skipped before the timer ran out. */
  completed: boolean;
}

export interface Prefs {
  defaultGoalId: string | null;
  defaultPriority: Priority;
  /** Task linked to the focus timer. */
  activeTaskId: string | null;
  wellnessEnabled: boolean;
}

export interface MigrationRecord {
  from: string;
  at: number;
  importedTasks: number;
  importedGoals: number;
  skippedRecords: number;
}

export interface WorkspaceData {
  version: 1;
  tasks: Task[];
  goals: Goal[];
  focusSessions: FocusSession[];
  prefs: Prefs;
  migrations: MigrationRecord[];
}

export const DEFAULT_PREFS: Prefs = {
  defaultGoalId: null,
  defaultPriority: "NI",
  activeTaskId: null,
  wellnessEnabled: true,
};

export function emptyWorkspace(): WorkspaceData {
  return { version: 1, tasks: [], goals: [], focusSessions: [], prefs: { ...DEFAULT_PREFS }, migrations: [] };
}

// ---------------------------------------------------------------------------
// Validation / normalisation. Anything read from storage is untrusted: it may
// be from an older version, hand-edited, or partially corrupted.
// ---------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function isPriority(v: unknown): v is Priority {
  return v === "UI" || v === "UN" || v === "NI" || v === "NN";
}

export function normalizeTask(raw: unknown, now: number): Task | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id).trim();
  const title = str(raw.title).trim();
  if (!id || !title) return null;
  const dueDate = isDateKey(raw.dueDate) ? raw.dueDate : null;
  const dueTime = dueDate && isTimeString(raw.dueTime) ? raw.dueTime : null;
  const status: TaskStatus = raw.status === "done" ? "done" : "todo";
  const createdAt = num(raw.createdAt, now);
  return {
    id,
    title: title.slice(0, 500),
    notes: str(raw.notes).slice(0, 20_000),
    status,
    priority: isPriority(raw.priority) ? raw.priority : "NN",
    dueDate,
    dueTime,
    remind: raw.remind === true && !!dueTime,
    reminderSentAt: numOrNull(raw.reminderSentAt),
    goalId: typeof raw.goalId === "string" && raw.goalId ? raw.goalId : null,
    pomodoros: Math.max(0, Math.floor(num(raw.pomodoros, 0))),
    createdAt,
    updatedAt: num(raw.updatedAt, createdAt),
    completedAt: status === "done" ? numOrNull(raw.completedAt) : null,
    ...(typeof raw.legacyId === "number" ? { legacyId: raw.legacyId } : {}),
  };
}

export function normalizeGoal(raw: unknown, now: number): Goal | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id).trim();
  const title = str(raw.title).trim();
  if (!id || !title) return null;
  const createdAt = num(raw.createdAt, now);
  return {
    id,
    title: title.slice(0, 200),
    emoji: str(raw.emoji, "🎯").slice(0, 16) || "🎯",
    targetDate: isDateKey(raw.targetDate) ? raw.targetDate : null,
    createdAt,
    updatedAt: num(raw.updatedAt, createdAt),
    ...(typeof raw.legacyId === "number" ? { legacyId: raw.legacyId } : {}),
  };
}

export function normalizeSession(raw: unknown): FocusSession | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const endedAt = numOrNull(raw.endedAt);
  const focusedMs = numOrNull(raw.focusedMs);
  if (!id || endedAt == null || focusedMs == null || focusedMs < 0) return null;
  return {
    id,
    taskId: typeof raw.taskId === "string" && raw.taskId ? raw.taskId : null,
    endedAt,
    focusedMs,
    completed: raw.completed !== false,
  };
}

function uniqueBy<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(i => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

/** Returns a fully valid workspace, or null when `raw` is not a v1 workspace at all. */
export function normalizeWorkspace(raw: unknown, now: number): { data: WorkspaceData; dropped: number } | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  let dropped = 0;
  const collect = <T,>(list: unknown, fn: (x: unknown) => T | null): T[] => {
    if (!Array.isArray(list)) return [];
    const out: T[] = [];
    for (const item of list) {
      const v = fn(item);
      if (v) out.push(v);
      else dropped++;
    }
    return out;
  };
  const goals = uniqueBy(collect(raw.goals, g => normalizeGoal(g, now)));
  const goalIds = new Set(goals.map(g => g.id));
  const tasks = uniqueBy(collect(raw.tasks, t => normalizeTask(t, now))).map(t =>
    t.goalId && !goalIds.has(t.goalId) ? { ...t, goalId: null } : t
  );
  const focusSessions = uniqueBy(collect(raw.focusSessions, normalizeSession));
  const p = isObj(raw.prefs) ? raw.prefs : {};
  const taskIds = new Set(tasks.map(t => t.id));
  const prefs: Prefs = {
    defaultGoalId: typeof p.defaultGoalId === "string" && goalIds.has(p.defaultGoalId) ? p.defaultGoalId : null,
    defaultPriority: isPriority(p.defaultPriority) ? p.defaultPriority : DEFAULT_PREFS.defaultPriority,
    activeTaskId: typeof p.activeTaskId === "string" && taskIds.has(p.activeTaskId) ? p.activeTaskId : null,
    wellnessEnabled: p.wellnessEnabled !== false,
  };
  const migrations = Array.isArray(raw.migrations) ? (raw.migrations.filter(isObj) as unknown as MigrationRecord[]) : [];
  return { data: { version: 1, tasks, goals, focusSessions, prefs, migrations }, dropped };
}
