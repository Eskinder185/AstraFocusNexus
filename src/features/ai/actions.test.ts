import { describe, expect, it } from "vitest";
import type { Task } from "../workspace/schema";
import { buildImproveMessages, parseImprovement, MAX_SUBTASKS } from "./improveTask";
import { blockConflicts, buildPlanMessages, busyBlocks, normaliseTime, parsePlan, resolveRef, validWorkingHours, type PlanContext } from "./planDay";

/** SIMULATED: pure functions only; no model involved. */

const task = (p: Partial<Task>): Task => ({
  id: "t", title: "Task", notes: "", status: "todo", priority: "NI", dueDate: null, dueTime: null, remind: false, reminderSentAt: null,
  goalId: null, pomodoros: 0, createdAt: 1, updatedAt: 1, completedAt: null, ...p,
});

describe("improve a task", () => {
  it("sends the title, and notes only when asked", () => {
    expect(buildImproveMessages({ title: "Do the thing" })[1].content).toBe("Task: Do the thing");
    expect(buildImproveMessages({ title: "Do the thing", notes: "private detail" })[1].content).toContain("Notes: private detail");
  });
  it("validates and clamps the suggestion", () => {
    const r = parseImprovement(JSON.stringify({ title: "  Draft the intro\n", description: "Write 200 words.", estimateMin: 47, subtasks: [{ title: "Outline", minutes: 9999 }, { title: "", minutes: 5 }, null] }));
    expect(r).toEqual({ ok: true, value: { title: "Draft the intro", description: "Write 200 words.", estimateMin: 45, subtasks: [{ title: "Outline", minutes: 480 }], dropped: 2 } });
  });
  it("caps subtasks and tolerates a fenced reply", () => {
    const subs = Array.from({ length: 12 }, (_, i) => ({ title: `S${i}`, minutes: 10 }));
    const r = parseImprovement("```json\n" + JSON.stringify({ title: "T", description: "", estimateMin: "x", subtasks: subs }) + "\n```");
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.subtasks).toHaveLength(MAX_SUBTASKS);
    expect(r.value.estimateMin).toBeNull();
    expect(r.value.dropped).toBe(12 - MAX_SUBTASKS);
  });
  it("rejects malformed replies", () => {
    expect(parseImprovement("not json").ok).toBe(false);
    expect(parseImprovement('{"description":"no title"}').ok).toBe(false);
    expect(parseImprovement("[1,2]").ok).toBe(false);
  });
});

describe("plan my day", () => {
  const DATE = "2030-01-15";
  const report = task({ id: "a", title: "Write report", estimateMin: 60, dueDate: DATE, dueTime: "12:00", priority: "UI" });
  const review = task({ id: "b", title: "Review notes", estimateMin: 30, startDate: DATE, startTime: "13:00" });
  const ctx: PlanContext = { date: DATE, workStart: "09:00", workEnd: "17:00", tasks: [{ ref: "T1", task: report }, { ref: "T2", task: review }], busy: [{ start: 600, end: 660 }] };
  const NOW = new Date(2030, 0, 14, 12);

  it("sends only the selected tasks and busy times without titles", () => {
    const busyTask = task({ id: "gym", title: "Gym session", scheduledAt: new Date(2030, 0, 15, 10).getTime(), estimateMin: 60 });
    const busy = busyBlocks([report, review, busyTask], DATE, new Set(["a", "b"]));
    expect(busy).toEqual([{ start: 600, end: 660 }]);
    const msg = buildPlanMessages({ ...ctx, busy })[1].content;
    expect(msg).toContain("Working hours: 09:00-17:00");
    expect(msg).toContain("Busy (already planned): 10:00-11:00");
    expect(msg).toContain('T1: "Write report" | priority: Do first | estimate: 60 min | due: 2030-01-15 12:00');
    expect(msg).toContain("starts: 2030-01-15 13:00");
    expect(msg).not.toContain("Gym");
  });

  it("normalises times and validates hours", () => {
    expect(["9:00", "09:00", "9am", "2:30 PM", "12am", "25:00", "13pm", "noon"].map(normaliseTime)).toEqual(["09:00", "09:00", "09:00", "14:30", "00:00", null, null, null]);
    expect(validWorkingHours("09:00", "17:00")).toBeNull();
    expect(validWorkingHours("17:00", "09:00")).toBeTruthy();
  });

  it("parses blocks, drops unknown/duplicate/invalid ones, and reports ignored tasks", () => {
    const reply = JSON.stringify({
      blocks: [
        { task: "T1", start: "9:00", minutes: 60, reason: "Due at noon" },
        { task: "T1", start: "14:00", minutes: 30, reason: "dup" },
        { task: "T9", start: "10:00", minutes: 30, reason: "unknown" },
        { task: "T2", start: "nope", minutes: 30, reason: "bad time" },
      ],
      unscheduled: [],
    });
    const r = parsePlan(reply, ctx);
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.blocks).toEqual([{ ref: "T1", start: "09:00", minutes: 60, reason: "Due at noon" }]);
    expect(r.value.dropped).toBe(3);
    expect(r.value.unscheduled).toEqual([{ ref: "T2", reason: "The model didn’t schedule this task." }]);
    expect(parsePlan("nonsense", ctx).ok).toBe(false);
  });

  it("accepts the reference styles real models use, but only for selected tasks", () => {
    // Shape of a real qwen3.5:9b reply, plus variants seen in practice.
    const reply = JSON.stringify({
      blocks: [
        { task: "T1: Write report", start: "09:00", minutes: 60, reason: "" },
        { task: "review notes", start: "13:00", minutes: 30, reason: "" },
      ],
      unscheduled: [],
    });
    const r = parsePlan(reply, ctx);
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.blocks.map(b => b.ref)).toEqual(["T1", "T2"]);
    expect(resolveRef("t2", ctx)).toBe("T2");
    expect(resolveRef("T12", ctx)).toBeNull();
    expect(resolveRef("ST1", ctx)).toBeNull();
    expect(resolveRef("Something else", ctx)).toBeNull();
  });

  it("checks every block against the app's own rules", () => {
    const ok = { ref: "T1", start: "09:00", minutes: 60 };
    expect(blockConflicts(ok, [ok], ctx, NOW)).toEqual([]);
    const c = (b: { ref: string; start: string; minutes: number }, others = [b]) => blockConflicts(b, others, ctx, NOW).join(" | ");
    expect(c({ ref: "T1", start: "08:00", minutes: 60 })).toMatch(/Outside your working hours/);
    expect(c({ ref: "T1", start: "10:30", minutes: 30 })).toMatch(/Overlaps something already planned/);
    expect(c({ ref: "T1", start: "11:30", minutes: 60 })).toMatch(/Ends after the task is due/);
    expect(c({ ref: "T2", start: "12:00", minutes: 30 })).toMatch(/Starts before the task does/);
    expect(c({ ref: "T2", start: "13:00", minutes: 30 }, [{ ref: "T2", start: "13:00", minutes: 30 }, { ref: "T1", start: "13:15", minutes: 30 }])).toMatch(/Overlaps “Write report”/);
    expect(blockConflicts(ok, [ok], ctx, new Date(2030, 0, 15, 10)).join()).toMatch(/already passed/);
    expect(c({ ref: "T1", start: "09:00", minutes: 1 })).toMatch(/Length must be/);
  });
});
