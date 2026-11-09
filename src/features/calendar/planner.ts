import { addDays, toDateKey } from "../../lib/dates";
import type { Task } from "../workspace/schema";

export interface SlotSuggestion { at: number; durationMin: number; reason: string }

/** Finds a half-hour slot in local working hours without changing any task. */
export function suggestSlot(task: Task, tasks: Task[], now: Date): SlotSuggestion | null {
  const durationMin = task.estimateMin ?? 30;
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = task.dueDate;
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const day = addDays(startDay, dayOffset);
    if (due && toDateKey(day) > due) break;
    for (let minute = 9 * 60; minute + durationMin <= 17 * 60; minute += 30) {
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minute).getTime();
      if (at < now.getTime() + 15 * 60_000) continue;
      const end = at + durationMin * 60_000;
      const overlaps = tasks.some(other => other.id !== task.id && other.status === "todo" && other.scheduledAt != null &&
        at < other.scheduledAt + (other.estimateMin ?? 30) * 60_000 && end > other.scheduledAt);
      if (!overlaps) return { at, durationMin, reason: "First open half-hour slot between 9 AM and 5 PM before the deadline" };
    }
  }
  return null;
}
