/**
 * Task schedule helpers: start and due, each an optional local date with an optional time.
 *
 * Rules
 * - Dates are "YYYY-MM-DD" and times "HH:mm" in the user's local time zone. Date-only
 *   values are never converted to midnight: a date-only start means "some time that day"
 *   (compared as the start of the day) and a date-only due means "by the end of that day".
 * - The due moment may not be earlier than the start moment. Equal is allowed.
 * - Overdue status comes from the due value only (see selectors.dueTimestamp).
 */
import { addDays, formatTime, fromDateKey, isDateKey, isTimeString, relativeDayLabel, toDateKey } from "../../lib/dates";
import type { Task } from "./schema";

export interface ScheduleValue {
  startDate: string | null;
  startTime: string | null;
  dueDate: string | null;
  dueTime: string | null;
}

export type ScheduleField = keyof ScheduleValue;
export type ScheduleErrors = Partial<Record<ScheduleField, string>>;

export const scheduleOf = (t: Pick<Task, "dueDate" | "dueTime"> & Partial<Pick<Task, "startDate" | "startTime">>): ScheduleValue => ({
  startDate: t.startDate ?? null,
  startTime: t.startDate ? t.startTime ?? null : null,
  dueDate: t.dueDate ?? null,
  dueTime: t.dueDate ? t.dueTime ?? null : null,
});

/** Short date for messages, e.g. "Nov 12" (adds the year when it isn't this year). */
export function shortDate(key: string, now = new Date()): string {
  const d = fromDateKey(key);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }) });
}

/** Field-level problems. An empty object means the schedule is valid. */
export function validateSchedule(v: ScheduleValue): ScheduleErrors {
  const e: ScheduleErrors = {};
  if (v.startDate && !isDateKey(v.startDate)) e.startDate = "Enter a valid start date.";
  if (v.dueDate && !isDateKey(v.dueDate)) e.dueDate = "Enter a valid due date.";
  if (v.startTime && !isTimeString(v.startTime)) e.startTime = "Enter a valid start time.";
  if (v.dueTime && !isTimeString(v.dueTime)) e.dueTime = "Enter a valid due time.";
  if (v.startTime && !v.startDate) e.startTime = "Add a start date to use a start time.";
  if (v.dueTime && !v.dueDate) e.dueTime = "Add a due date to use a due time.";
  if (Object.keys(e).length || !v.startDate || !v.dueDate) return e;

  if (v.dueDate < v.startDate) {
    e.dueDate = `The due date can’t be before the start date (${shortDate(v.startDate)}).`;
  } else if (v.dueDate === v.startDate && v.startTime && v.dueTime && v.dueTime < v.startTime) {
    e.dueTime = `On the same day, the due time can’t be earlier than the start time (${formatTime(v.startTime)}).`;
  }
  return e;
}

export const isScheduleValid = (v: ScheduleValue) => Object.keys(validateSchedule(v)).length === 0;

/** Moment the task starts: its start time, or the start of its start day. */
export function startTimestamp(t: Partial<Pick<Task, "startDate" | "startTime">>): number | null {
  if (!t.startDate) return null;
  return fromDateKey(t.startDate, t.startTime ?? null).getTime();
}

export interface ScheduleSpan {
  start: number;
  end: number;
  /** Both ends have a time of day. */
  timed: boolean;
  startKey: string;
  endKey: string;
  multiDay: boolean;
}

/**
 * The scheduled span from start to due. Only exists when the task has BOTH a start and a
 * due date; a single date never produces a made-up duration.
 */
export function scheduleSpan(t: Partial<Pick<Task, "startDate" | "startTime" | "dueDate" | "dueTime">>): ScheduleSpan | null {
  if (!t.startDate || !t.dueDate || !isDateKey(t.startDate) || !isDateKey(t.dueDate)) return null;
  const start = fromDateKey(t.startDate, t.startTime ?? null).getTime();
  const end = t.dueTime ? fromDateKey(t.dueDate, t.dueTime).getTime() : addDays(fromDateKey(t.dueDate), 1).getTime() - 1;
  if (end < start) return null;
  return { start, end, timed: !!t.startTime && !!t.dueTime, startKey: t.startDate, endKey: t.dueDate, multiDay: t.startDate !== t.dueDate };
}

/** Does the span cover the local calendar day `key`? */
export function spanCoversDay(span: ScheduleSpan, key: string): boolean {
  return key >= span.startKey && key <= span.endKey;
}

const part = (key: string, time: string | null, now: Date, explicit = false) => {
  const day = explicit ? shortDate(key, now) : relativeDayLabel(key, now);
  return time ? `${day}, ${formatTime(time)}` : day;
};

/**
 * Text for a task's schedule.
 * - `full`: explicit dates, e.g. "Starts Nov 12, 9:00 AM · Due Nov 12, 10:30 AM" (labels, titles, screen readers).
 * - `short`: compact chip text using Today/Tomorrow, e.g. "Today, 9:00 AM – 10:30 AM".
 * Returns null when the task has no start (due-only tasks keep their existing due chip).
 */
export function formatSchedule(t: Partial<Pick<Task, "startDate" | "startTime" | "dueDate" | "dueTime">>, now: Date): { short: string; full: string } | null {
  const v = scheduleOf({ dueDate: t.dueDate ?? null, dueTime: t.dueTime ?? null, startDate: t.startDate, startTime: t.startTime });
  if (!v.startDate) return null;
  const fullStart = `Starts ${part(v.startDate, v.startTime, now, true)}`;
  if (!v.dueDate) return { short: `Starts ${part(v.startDate, v.startTime, now)}`, full: fullStart };
  const full = `${fullStart} · Due ${part(v.dueDate, v.dueTime, now, true)}`;
  if (v.startDate === v.dueDate) {
    const day = relativeDayLabel(v.startDate, now);
    if (v.startTime && v.dueTime) return { short: `${day}, ${formatTime(v.startTime)} – ${formatTime(v.dueTime)}`, full };
    if (v.startTime) return { short: `${day}, from ${formatTime(v.startTime)}`, full };
    if (v.dueTime) return { short: `${day}, due ${formatTime(v.dueTime)}`, full };
    return { short: day, full };
  }
  return { short: `${part(v.startDate, v.startTime, now)} → ${part(v.dueDate, v.dueTime, now)}`, full };
}

/**
 * The day a task belongs to in Today / Upcoming lists: its due date when it has one;
 * otherwise its start date, or today once a start-only task has started.
 */
export function listDayKey(t: Pick<Task, "dueDate"> & Partial<Pick<Task, "startDate">>, now: Date): string | null {
  if (t.dueDate) return t.dueDate;
  if (!t.startDate) return null;
  const today = toDateKey(now);
  return t.startDate <= today ? today : t.startDate;
}
