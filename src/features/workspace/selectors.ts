import { addDays, formatDuration, fromDateKey, startOfDay, toDateKey } from "../../lib/dates";
import { PRIORITY_META } from "./priority";
import type { FocusSession, Goal, Task, WorkspaceData } from "./schema";
import { listDayKey } from "./schedule";

/** Moment a task becomes overdue: its due time, or the end of its due day when no time is set. */
export function dueTimestamp(t: Pick<Task, "dueDate" | "dueTime">): number | null {
  if (!t.dueDate) return null;
  if (t.dueTime) return fromDateKey(t.dueDate, t.dueTime).getTime();
  return addDays(fromDateKey(t.dueDate), 1).getTime() - 1;
}

export const isOpen = (t: Task) => t.status === "todo";

export function isOverdue(t: Task, now: Date): boolean {
  const ts = dueTimestamp(t);
  return isOpen(t) && ts != null && ts < now.getTime();
}

export function isDueToday(t: Task, now: Date): boolean {
  return t.dueDate === toDateKey(now);
}

/** Priority first, then soonest due, then newest. */
export function compareByPriority(a: Task, b: Task): number {
  const r = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
  if (r) return r;
  const da = dueTimestamp(a) ?? Infinity;
  const db = dueTimestamp(b) ?? Infinity;
  if (da !== db) return da - db;
  return b.createdAt - a.createdAt;
}

export function compareByDue(a: Task, b: Task): number {
  const da = dueTimestamp(a) ?? Infinity;
  const db = dueTimestamp(b) ?? Infinity;
  if (da !== db) return da - db;
  return compareByPriority(a, b);
}

export function topPriorities(tasks: Task[], n = 3): Task[] {
  return tasks.filter(isOpen).sort(compareByPriority).slice(0, n);
}

export interface TaskGroups {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  someday: Task[];
}

export function groupOpenTasks(tasks: Task[], now: Date): TaskGroups {
  const g: TaskGroups = { overdue: [], today: [], upcoming: [], someday: [] };
  const todayKey = toDateKey(now);
  for (const t of tasks) {
    if (!isOpen(t)) continue;
    // Overdue is decided by the due value only; a start date never makes a task overdue.
    const day = listDayKey(t, now);
    if (isOverdue(t, now)) g.overdue.push(t);
    else if (day === todayKey) g.today.push(t);
    else if (day) g.upcoming.push(t);
    else g.someday.push(t);
  }
  g.overdue.sort(compareByDue);
  g.today.sort(compareByDue);
  g.upcoming.sort(compareByDue);
  g.someday.sort(compareByPriority);
  return g;
}

export interface GoalProgress {
  total: number;
  done: number;
  pct: number;
  next: Task | null;
  focusedMs: number;
}

export function goalProgress(goal: Goal, tasks: Task[], sessions: FocusSession[]): GoalProgress {
  const linked = tasks.filter(t => t.goalId === goal.id);
  const done = linked.filter(t => t.status === "done").length;
  const ids = new Set(linked.map(t => t.id));
  const focusedMs = sessions.reduce((sum, s) => (s.taskId && ids.has(s.taskId) ? sum + s.focusedMs : sum), 0);
  return {
    total: linked.length,
    done,
    pct: linked.length ? Math.round((done / linked.length) * 100) : 0,
    next: linked.filter(isOpen).sort(compareByPriority)[0] ?? null,
    focusedMs,
  };
}

const sameDay = (ts: number, day: Date) => toDateKey(new Date(ts)) === toDateKey(day);

export function focusOnDay(sessions: FocusSession[], day: Date): { ms: number; sessions: number } {
  let ms = 0;
  let count = 0;
  for (const s of sessions) {
    if (!sameDay(s.endedAt, day)) continue;
    ms += s.focusedMs;
    if (s.completed) count++;
  }
  return { ms, sessions: count };
}

export function focusInRange(sessions: FocusSession[], from: Date, toExclusive: Date): number {
  const a = from.getTime();
  const b = toExclusive.getTime();
  return sessions.reduce((sum, s) => (s.endedAt >= a && s.endedAt < b ? sum + s.focusedMs : sum), 0);
}

/** Focus time for each of the last `days` days, oldest first. */
export function focusByDay(sessions: FocusSession[], now: Date, days = 7): Array<{ date: Date; ms: number }> {
  const out: Array<{ date: Date; ms: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfDay(addDays(now, -i));
    out.push({ date, ms: focusOnDay(sessions, date).ms });
  }
  return out;
}

export function completedOnDay(tasks: Task[], day: Date): number {
  return tasks.filter(t => t.completedAt != null && sameDay(t.completedAt, day)).length;
}

export interface Insight {
  id: string;
  text: string;
  tone: "positive" | "neutral" | "attention";
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Short observations, each backed by stored data. Returns nothing rather than guessing. */
export function buildInsights(data: WorkspaceData, now: Date, limit = 3): Insight[] {
  const out: Insight[] = [];
  const yesterday = addDays(now, -1);
  const yKey = toDateKey(yesterday);

  const overdue = data.tasks.filter(t => isOverdue(t, now)).length;
  if (overdue > 0) {
    out.push({
      id: "overdue",
      tone: "attention",
      text: `${overdue} ${plural(overdue, "task is", "tasks are")} overdue. Finish or reschedule ${plural(overdue, "it", "them")} before adding more.`,
    });
  }

  const dueYesterday = data.tasks.filter(t => t.dueDate === yKey);
  if (dueYesterday.length > 0) {
    const done = dueYesterday.filter(t => t.status === "done").length;
    out.push({
      id: "yesterday",
      tone: done === dueYesterday.length ? "positive" : "neutral",
      text: `You finished ${done} of ${dueYesterday.length} ${plural(dueYesterday.length, "task", "tasks")} that were due yesterday.`,
    });
  } else {
    const completedY = completedOnDay(data.tasks, yesterday);
    if (completedY > 0) {
      out.push({ id: "yesterday", tone: "positive", text: `You completed ${completedY} ${plural(completedY, "task", "tasks")} yesterday.` });
    }
  }

  const unscheduled = data.tasks.filter(t => isOpen(t) && !t.dueDate && !t.scheduledAt && (t.priority === "UI" || t.priority === "NI")).length;
  if (unscheduled > 0) {
    out.push({
      id: "unscheduled",
      tone: "neutral",
      text: `${unscheduled} important ${plural(unscheduled, "task has", "tasks have")} no date yet. Pick a day so ${plural(unscheduled, "it stays", "they stay")} on your radar.`,
    });
  }

  const weekStart = startOfDay(addDays(now, -6));
  const thisWeek = focusInRange(data.focusSessions, weekStart, addDays(startOfDay(now), 1));
  const lastWeek = focusInRange(data.focusSessions, addDays(weekStart, -7), weekStart);
  if (thisWeek > 0 && lastWeek > 0) {
    const up = thisWeek >= lastWeek;
    out.push({
      id: "focus-trend",
      tone: up ? "positive" : "neutral",
      text: `${formatDuration(thisWeek)} of focus in the last 7 days, ${up ? "up" : "down"} from ${formatDuration(lastWeek)} the week before.`,
    });
  }

  const stalled = data.goals.find(g => !data.tasks.some(t => t.goalId === g.id && isOpen(t)) && !data.tasks.some(t => t.goalId === g.id));
  if (stalled) {
    out.push({ id: `goal-${stalled.id}`, tone: "neutral", text: `“${stalled.title}” has no tasks yet. Add one small next step to get it moving.` });
  }

  return out.slice(0, limit);
}
