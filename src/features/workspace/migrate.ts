import { isDateKey, isTimeString } from "../../lib/dates";
import type { KeyValueStore } from "../../lib/storage";
import {
  emptyWorkspace,
  isPriority,
  normalizeWorkspace,
  type Goal,
  type Task,
  type WorkspaceData,
} from "./schema";

export const WORKSPACE_KEY = "astra.workspace.v1";
export const LEGACY_BACKUP_KEY = "astra.backup.legacy-v0";

/** Keys written by AstraFocus Nexus ≤ 0.2 (Create React App build). Never deleted by this app. */
export const LEGACY_KEYS = {
  tasks: "task-tracker.tasks.v4",
  goals: "task-tracker.goals.v1",
  goalPref: "task-tracker.goalPref",
} as const;

export type LoadStatus =
  | "loaded" // existing v1 workspace
  | "fresh" // nothing stored anywhere
  | "migrated" // imported from legacy keys
  | "recovered"; // v1 data was unreadable; preserved it and rebuilt from legacy keys

export interface LoadResult {
  data: WorkspaceData;
  status: LoadStatus;
  /** Records that failed validation and were left out (they remain in the original keys / backups). */
  dropped: number;
  /** True when `data` differs from what is stored under WORKSPACE_KEY and should be written. */
  needsWrite: boolean;
}

const legacyTaskId = (id: number | string) => `legacy-t-${id}`;
const legacyGoalId = (id: number | string) => `legacy-g-${id}`;

function parse(raw: string | null): unknown {
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

const DUE_AT_RE = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/;

function convertLegacyTask(raw: unknown, now: number, goalIds: Set<string>): Task | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const rawId = r.id;
  if (typeof rawId !== "number" && typeof rawId !== "string") return null;
  // ≤0.2 used `text`; an unreleased intermediate build used `title`.
  const title = (typeof r.text === "string" ? r.text : typeof r.title === "string" ? r.title : "").trim();
  if (!title) return null;

  let dueDate: string | null = null;
  let dueTime: string | null = null;
  if (typeof r.dueAt === "string") {
    const m = DUE_AT_RE.exec(r.dueAt);
    if (m && isDateKey(m[1])) {
      dueDate = m[1];
      dueTime = m[2] && isTimeString(m[2]) ? m[2] : null;
    }
  }

  const done = r.completed === true || r.status === "completed";
  const createdAt = typeof r.createdAt === "number" ? r.createdAt : typeof rawId === "number" ? rawId : now;
  const goalId = r.goalId != null && goalIds.has(legacyGoalId(r.goalId as number)) ? legacyGoalId(r.goalId as number) : null;
  const pomos = typeof r.pomos === "number" && r.pomos > 0 ? Math.floor(r.pomos) : 0;

  return {
    id: legacyTaskId(rawId),
    title: title.slice(0, 500),
    notes: "",
    status: done ? "done" : "todo",
    priority: isPriority(r.priority) ? r.priority : "NN",
    dueDate,
    dueTime,
    remind: r.remind === true && !!dueTime,
    // Legacy `notified: true` means the reminder already fired; don't fire it again.
    reminderSentAt: r.notified === true ? createdAt : null,
    goalId,
    pomodoros: pomos,
    createdAt,
    updatedAt: createdAt,
    // Legacy builds never recorded completion time.
    completedAt: null,
    ...(typeof rawId === "number" ? { legacyId: rawId } : {}),
  };
}

function convertLegacyGoal(raw: unknown, now: number): Goal | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "number" && typeof r.id !== "string") return null;
  const title = typeof r.title === "string" ? r.title.trim() : "";
  if (!title) return null;
  const createdAt = typeof r.id === "number" ? r.id : now;
  return {
    id: legacyGoalId(r.id),
    title: title.slice(0, 200),
    emoji: typeof r.emoji === "string" && r.emoji ? r.emoji : "🎯",
    targetDate: null,
    createdAt,
    updatedAt: createdAt,
    ...(typeof r.id === "number" ? { legacyId: r.id } : {}),
  };
}

/** Builds a workspace from legacy keys. Pure apart from reading `store`. */
export function importLegacy(store: KeyValueStore, now: number): { data: WorkspaceData; dropped: number; found: boolean } {
  const rawTasks = store.getItem(LEGACY_KEYS.tasks);
  const rawGoals = store.getItem(LEGACY_KEYS.goals);
  const rawPref = store.getItem(LEGACY_KEYS.goalPref);
  const found = rawTasks != null || rawGoals != null;
  const data = emptyWorkspace();
  let dropped = 0;

  const goalsIn = parse(rawGoals);
  if (rawGoals != null && !Array.isArray(goalsIn)) dropped++;
  const seenGoals = new Set<string>();
  for (const g of Array.isArray(goalsIn) ? goalsIn : []) {
    const goal = convertLegacyGoal(g, now);
    if (!goal) dropped++;
    else if (!seenGoals.has(goal.id)) {
      seenGoals.add(goal.id);
      data.goals.push(goal);
    }
  }

  const tasksIn = parse(rawTasks);
  if (rawTasks != null && !Array.isArray(tasksIn)) dropped++;
  const seenTasks = new Set<string>();
  for (const t of Array.isArray(tasksIn) ? tasksIn : []) {
    const task = convertLegacyTask(t, now, seenGoals);
    if (!task) dropped++;
    else if (!seenTasks.has(task.id)) {
      seenTasks.add(task.id);
      data.tasks.push(task);
    }
  }

  const pref = parse(rawPref);
  if ((typeof pref === "number" || typeof pref === "string") && seenGoals.has(legacyGoalId(pref))) {
    data.prefs.defaultGoalId = legacyGoalId(pref);
  }

  if (found) {
    data.migrations.push({
      from: "astrafocus-nexus-0.2 (localStorage task-tracker.*)",
      at: now,
      importedTasks: data.tasks.length,
      importedGoals: data.goals.length,
      skippedRecords: dropped,
    });
  }
  return { data, dropped, found };
}

/**
 * Loads the workspace, migrating from legacy storage on first run.
 *
 * Guarantees:
 * - Legacy keys are never modified or removed.
 * - Before the first import, the raw legacy values are copied to LEGACY_BACKUP_KEY (once).
 * - Unreadable v1 data is copied aside (never overwritten silently) before recovery.
 * - Legacy ids map deterministically, so re-running the import cannot create duplicates.
 */
export function loadWorkspace(store: KeyValueStore, now = Date.now()): LoadResult {
  const raw = store.getItem(WORKSPACE_KEY);
  let status: LoadStatus = "migrated";

  if (raw != null) {
    const normalized = normalizeWorkspace(parse(raw), now);
    if (normalized) {
      return { data: normalized.data, status: "loaded", dropped: normalized.dropped, needsWrite: normalized.dropped > 0 };
    }
    try {
      store.setItem(`${WORKSPACE_KEY}.unreadable.${now}`, raw);
    } catch {
      /* best effort: if this fails we still must not lose legacy data */
    }
    status = "recovered";
  }

  const legacy = importLegacy(store, now);
  if (!legacy.found) {
    return { data: emptyWorkspace(), status: status === "recovered" ? "recovered" : "fresh", dropped: 0, needsWrite: true };
  }

  if (store.getItem(LEGACY_BACKUP_KEY) == null) {
    const backup = {
      createdAt: now,
      keys: Object.fromEntries(Object.values(LEGACY_KEYS).map(k => [k, store.getItem(k)])),
    };
    try {
      store.setItem(LEGACY_BACKUP_KEY, JSON.stringify(backup));
    } catch {
      /* the original keys are untouched, so a failed backup loses nothing */
    }
  }

  return { data: legacy.data, status, dropped: legacy.dropped, needsWrite: true };
}
