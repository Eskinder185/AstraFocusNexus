import { describe, expect, it } from "vitest";
import { formatTime } from "../../lib/dates";
import { reducer } from "./reducer";
import { formatSchedule, listDayKey, scheduleOf, scheduleSpan, shortDate, spanCoversDay, startTimestamp, validateSchedule, type ScheduleValue } from "./schedule";
import { emptyWorkspace, normalizeTask, normalizeWorkspace, type Task } from "./schema";
import { groupOpenTasks, isOverdue } from "./selectors";

const NOW = new Date(2026, 10, 10, 14, 0); // Tue Nov 10 2026, 2:00 PM local
const S = (p: Partial<ScheduleValue>): ScheduleValue => ({ startDate: null, startTime: null, dueDate: null, dueTime: null, ...p });
const task = (p: Partial<Task>): Task => ({
  id: "t1", title: "Task", notes: "", status: "todo", priority: "NI", dueDate: null, dueTime: null, remind: false, reminderSentAt: null,
  goalId: null, pomodoros: 0, createdAt: 1, updatedAt: 1, completedAt: null, ...p,
});

describe("validateSchedule", () => {
  it("allows empty, start-only, due-only and date-only schedules", () => {
    expect(validateSchedule(S({}))).toEqual({});
    expect(validateSchedule(S({ startDate: "2026-11-12", startTime: "09:00" }))).toEqual({});
    expect(validateSchedule(S({ dueDate: "2026-11-12" }))).toEqual({});
    expect(validateSchedule(S({ startDate: "2026-11-12", dueDate: "2026-11-12" }))).toEqual({});
    expect(validateSchedule(S({ startDate: "2026-11-12", startTime: "15:00", dueDate: "2026-11-12" }))).toEqual({}); // due = end of day
    expect(validateSchedule(S({ startDate: "2026-11-12", dueDate: "2026-11-12", dueTime: "08:00" }))).toEqual({}); // start = some time that day
  });
  it("allows same-day and cross-day schedules, including a later day with an earlier clock time", () => {
    expect(validateSchedule(S({ startDate: "2026-11-12", startTime: "09:00", dueDate: "2026-11-12", dueTime: "10:30" }))).toEqual({});
    expect(validateSchedule(S({ startDate: "2026-11-12", startTime: "09:00", dueDate: "2026-11-12", dueTime: "09:00" }))).toEqual({});
    expect(validateSchedule(S({ startDate: "2026-11-12", startTime: "17:00", dueDate: "2026-11-14", dueTime: "08:00" }))).toEqual({});
  });
  it("rejects a due date before the start date, on the due date field", () => {
    const e = validateSchedule(S({ startDate: "2026-11-12", dueDate: "2026-11-11" }));
    expect(Object.keys(e)).toEqual(["dueDate"]);
    expect(e.dueDate).toContain(shortDate("2026-11-12"));
  });
  it("rejects an earlier due time on the same day, on the due time field", () => {
    const e = validateSchedule(S({ startDate: "2026-11-12", startTime: "10:30", dueDate: "2026-11-12", dueTime: "09:15" }));
    expect(Object.keys(e)).toEqual(["dueTime"]);
    expect(e.dueTime).toContain(formatTime("10:30"));
  });
  it("rejects times without dates and malformed values", () => {
    expect(validateSchedule(S({ startTime: "09:00" })).startTime).toMatch(/start date/);
    expect(validateSchedule(S({ dueTime: "09:00" })).dueTime).toMatch(/due date/);
    expect(validateSchedule(S({ startDate: "2026-02-30" })).startDate).toBeTruthy();
    expect(validateSchedule(S({ dueDate: "2026-11-12", dueTime: "25:00" })).dueTime).toBeTruthy();
  });
});

describe("timestamps and spans", () => {
  it("treats date-only values as local days, never shifted by time zone", () => {
    expect(startTimestamp({ startDate: "2026-11-12" })).toBe(new Date(2026, 10, 12).getTime());
    const span = scheduleSpan({ startDate: "2026-11-12", dueDate: "2026-11-12" })!;
    expect(span.start).toBe(new Date(2026, 10, 12).getTime());
    expect(span.end).toBe(new Date(2026, 10, 13).getTime() - 1);
    expect(span.timed).toBe(false);
  });
  it("only creates a span when both a start and a due date exist", () => {
    expect(scheduleSpan({ startDate: "2026-11-12", startTime: "09:00" })).toBeNull();
    expect(scheduleSpan({ dueDate: "2026-11-12", dueTime: "09:00" })).toBeNull();
    expect(scheduleSpan({ startDate: "2026-11-12", dueDate: "2026-11-11" })).toBeNull();
  });
  it("timed same-day and multi-day spans", () => {
    const same = scheduleSpan({ startDate: "2026-11-12", startTime: "09:00", dueDate: "2026-11-12", dueTime: "10:30" })!;
    expect(same).toMatchObject({ timed: true, multiDay: false });
    expect(same.end - same.start).toBe(90 * 60_000);
    const multi = scheduleSpan({ startDate: "2026-11-12", startTime: "17:00", dueDate: "2026-11-14", dueTime: "08:00" })!;
    expect(multi.multiDay).toBe(true);
    expect(["2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"].map(k => spanCoversDay(multi, k))).toEqual([false, true, true, true, false]);
  });
});

describe("formatSchedule", () => {
  it("uses explicit dates in the full text and Today/Tomorrow in the short text", () => {
    const f = formatSchedule({ startDate: "2026-11-12", startTime: "09:00", dueDate: "2026-11-12", dueTime: "10:30" }, NOW)!;
    expect(f.full).toBe(`Starts ${shortDate("2026-11-12", NOW)}, ${formatTime("09:00")} · Due ${shortDate("2026-11-12", NOW)}, ${formatTime("10:30")}`);
    expect(f.short).toBe(`Thursday, ${formatTime("09:00")} – ${formatTime("10:30")}`);
    expect(formatSchedule({ startDate: "2026-11-10", startTime: "09:00", dueDate: "2026-11-10", dueTime: "10:30" }, NOW)!.short).toMatch(/^Today, /);
  });
  it("shows both dates for multi-day schedules", () => {
    const f = formatSchedule({ startDate: "2026-11-11", dueDate: "2026-11-14", dueTime: "17:00" }, NOW)!;
    expect(f.short).toBe(`Tomorrow → Saturday, ${formatTime("17:00")}`);
    expect(f.full).toBe(`Starts ${shortDate("2026-11-11", NOW)} · Due ${shortDate("2026-11-14", NOW)}, ${formatTime("17:00")}`);
  });
  it("handles start-only, date-only and due-only", () => {
    expect(formatSchedule({ startDate: "2026-11-11", startTime: "08:00" }, NOW)!.short).toBe(`Starts Tomorrow, ${formatTime("08:00")}`);
    expect(formatSchedule({ startDate: "2026-11-11", dueDate: "2026-11-11" }, NOW)!.short).toBe("Tomorrow");
    expect(formatSchedule({ dueDate: "2026-11-11", dueTime: "08:00" }, NOW)).toBeNull(); // the existing due chip handles it
  });
});

describe("lists and overdue", () => {
  it("overdue depends only on the due value", () => {
    expect(isOverdue(task({ startDate: "2026-11-01", dueDate: "2026-11-20" }), NOW)).toBe(false);
    expect(isOverdue(task({ startDate: "2026-11-01" }), NOW)).toBe(false);
    expect(isOverdue(task({ startDate: "2026-11-01", dueDate: "2026-11-09" }), NOW)).toBe(true);
    expect(isOverdue(task({ dueDate: "2026-11-10", dueTime: "13:00" }), NOW)).toBe(true);
    expect(isOverdue(task({ dueDate: "2026-11-10" }), NOW)).toBe(false); // date-only: due by end of day
  });
  it("start-only tasks appear on their start day, or today once started", () => {
    expect(listDayKey(task({ startDate: "2026-11-01" }), NOW)).toBe("2026-11-10");
    expect(listDayKey(task({ startDate: "2026-11-15" }), NOW)).toBe("2026-11-15");
    expect(listDayKey(task({ startDate: "2026-11-01", dueDate: "2026-11-20" }), NOW)).toBe("2026-11-20");
    const g = groupOpenTasks([task({ id: "a", startDate: "2026-11-01" }), task({ id: "b", startDate: "2026-11-15" }), task({ id: "c" })], NOW);
    expect([g.today.map(t => t.id), g.upcoming.map(t => t.id), g.someday.map(t => t.id)]).toEqual([["a"], ["b"], ["c"]]);
  });
});

describe("persistence and compatibility", () => {
  it("loads older tasks without inventing a start, keeping their due date and time", () => {
    const legacy = { id: "old", title: "Old task", status: "todo", priority: "UI", dueDate: "2026-11-12", dueTime: "18:00", createdAt: 5 };
    const t = normalizeTask(legacy, 10)!;
    expect(t).toMatchObject({ dueDate: "2026-11-12", dueTime: "18:00", startDate: null, startTime: null });
  });
  it("drops a start time without a start date and rejects malformed values", () => {
    expect(normalizeTask({ id: "x", title: "X", startTime: "09:00" }, 1)).toMatchObject({ startDate: null, startTime: null });
    expect(normalizeTask({ id: "x", title: "X", startDate: "11/12/2026", startTime: "09:00" }, 1)).toMatchObject({ startDate: null, startTime: null });
  });
  it("round-trips start and due through export JSON and import", () => {
    const ws = { ...emptyWorkspace(), tasks: [task({ startDate: "2026-11-12", startTime: "09:00", dueDate: "2026-11-13", dueTime: "10:30" })] };
    const exported = JSON.stringify({ app: "AstraFocus", workspace: ws });
    const imported = normalizeWorkspace(JSON.parse(exported).workspace, 1)!;
    expect(imported.dropped).toBe(0);
    expect(scheduleOf(imported.data.tasks[0])).toEqual({ startDate: "2026-11-12", startTime: "09:00", dueDate: "2026-11-13", dueTime: "10:30" });
  });
  it("editing keeps start and due; clearing the start date clears its time", () => {
    let ws = { ...emptyWorkspace(), tasks: [task({ startDate: "2026-11-12", startTime: "09:00", dueDate: "2026-11-12", dueTime: "10:30" })] };
    ws = reducer(ws, { type: "task/update", id: "t1", patch: { title: "Renamed" }, now: 2 });
    expect(scheduleOf(ws.tasks[0])).toEqual({ startDate: "2026-11-12", startTime: "09:00", dueDate: "2026-11-12", dueTime: "10:30" });
    ws = reducer(ws, { type: "task/update", id: "t1", patch: { startDate: null }, now: 3 });
    expect(ws.tasks[0]).toMatchObject({ startDate: null, startTime: null, dueDate: "2026-11-12", dueTime: "10:30" });
  });
  it("keeps scheduled duration separate from the effort estimate", () => {
    const ws = reducer({ ...emptyWorkspace(), tasks: [task({ estimateMin: 45 })] }, { type: "task/update", id: "t1", patch: { startDate: "2026-11-12", startTime: "09:00", dueDate: "2026-11-12", dueTime: "12:00" }, now: 2 });
    expect(ws.tasks[0].estimateMin).toBe(45);
  });
});
