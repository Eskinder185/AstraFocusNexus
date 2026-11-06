import { describe, expect, it } from "vitest";
import { memoryStore } from "../../lib/storage";
import { LEGACY_BACKUP_KEY, LEGACY_KEYS, WORKSPACE_KEY, loadWorkspace } from "./migrate";
import { parseQuickAdd } from "./quickAdd";
import { reducer } from "./reducer";
import { emptyWorkspace, type Task } from "./schema";
import { buildInsights, goalProgress, groupOpenTasks, isOverdue, topPriorities } from "./selectors";

// Friday 6 Nov 2026, 10:00 local time.
const NOW = new Date(2026, 10, 6, 10, 0);

function task(partial: Partial<Task> & { id: string }): Task {
  return {
    title: partial.id,
    notes: "",
    status: "todo",
    priority: "NN",
    dueDate: null,
    dueTime: null,
    remind: false,
    reminderSentAt: null,
    goalId: null,
    pomodoros: 0,
    createdAt: 1,
    updatedAt: 1,
    completedAt: null,
    ...partial,
  };
}

const legacyTasks = [
  { id: 1001, text: "Write report", completed: false, createdAt: 1001, dueAt: "2026-11-07T18:00", remind: true, notified: false, pomos: 2, priority: "UI", goalId: 7 },
  { id: 1002, text: "Done thing", completed: true, createdAt: 1002, priority: "NI", goalId: null },
  { id: 1003, text: "   ", completed: false }, // invalid: blank title
  "garbage", // invalid: not an object
  { id: 1001, text: "Duplicate id", completed: false }, // duplicate id
  { id: 1004, text: "Fired reminder", completed: false, dueAt: "2026-11-01T09:30", remind: true, notified: true },
  { id: 1005, text: "Orphan goal link", completed: false, goalId: 999 },
];
const legacyGoals = [{ id: 7, title: "Graduate", emoji: "🎓" }, { id: 8, title: "" }];

function legacyStore() {
  return memoryStore({
    [LEGACY_KEYS.tasks]: JSON.stringify(legacyTasks),
    [LEGACY_KEYS.goals]: JSON.stringify(legacyGoals),
    [LEGACY_KEYS.goalPref]: "7",
  });
}

describe("loadWorkspace / legacy migration", () => {
  it("starts empty when nothing is stored", () => {
    const r = loadWorkspace(memoryStore(), NOW.getTime());
    expect(r.status).toBe("fresh");
    expect(r.data.tasks).toEqual([]);
  });

  it("imports legacy tasks and goals, preserving relationships", () => {
    const r = loadWorkspace(legacyStore(), NOW.getTime());
    expect(r.status).toBe("migrated");
    expect(r.data.goals).toHaveLength(1);
    expect(r.data.goals[0]).toMatchObject({ id: "legacy-g-7", title: "Graduate", emoji: "🎓", legacyId: 7 });
    expect(r.data.tasks.map(t => t.title)).toEqual(["Write report", "Done thing", "Fired reminder", "Orphan goal link"]);

    const report = r.data.tasks[0];
    expect(report).toMatchObject({
      id: "legacy-t-1001",
      dueDate: "2026-11-07",
      dueTime: "18:00",
      remind: true,
      reminderSentAt: null,
      pomodoros: 2,
      priority: "UI",
      goalId: "legacy-g-7",
      status: "todo",
    });
    expect(r.data.tasks[1]).toMatchObject({ status: "done", priority: "NI" });
    expect(r.data.tasks[2].reminderSentAt).not.toBeNull(); // already notified → never fires again
    expect(r.data.tasks[3].goalId).toBeNull(); // link to a goal that doesn't exist is dropped
    expect(r.data.prefs.defaultGoalId).toBe("legacy-g-7");
    expect(r.dropped).toBe(3); // blank task, garbage, blank goal
    expect(r.data.migrations[0]).toMatchObject({ importedTasks: 4, importedGoals: 1, skippedRecords: 3 });
  });

  it("backs up legacy data once and never modifies legacy keys", () => {
    const store = legacyStore();
    const before = store.dump();
    loadWorkspace(store, NOW.getTime());
    const after = store.dump();
    for (const k of Object.values(LEGACY_KEYS)) expect(after[k]).toBe(before[k]);
    const backup = JSON.parse(after[LEGACY_BACKUP_KEY]);
    expect(backup.keys[LEGACY_KEYS.tasks]).toBe(before[LEGACY_KEYS.tasks]);

    // A later import must not overwrite the original backup.
    store.setItem(LEGACY_KEYS.tasks, "[]");
    loadWorkspace(store, NOW.getTime() + 1000);
    expect(store.dump()[LEGACY_BACKUP_KEY]).toBe(after[LEGACY_BACKUP_KEY]);
  });

  it("is idempotent: re-running produces the same ids (no duplicates)", () => {
    const a = loadWorkspace(legacyStore(), NOW.getTime()).data.tasks.map(t => t.id);
    const b = loadWorkspace(legacyStore(), NOW.getTime() + 5000).data.tasks.map(t => t.id);
    expect(a).toEqual(b);
  });

  it("loads an existing v1 workspace without touching legacy keys", () => {
    const store = legacyStore();
    const ws = emptyWorkspace();
    ws.tasks.push(task({ id: "t_1", title: "New format" }));
    store.setItem(WORKSPACE_KEY, JSON.stringify(ws));
    const r = loadWorkspace(store, NOW.getTime());
    expect(r.status).toBe("loaded");
    expect(r.data.tasks.map(t => t.title)).toEqual(["New format"]);
    expect(r.needsWrite).toBe(false);
  });

  it("preserves unreadable v1 data and recovers from legacy keys", () => {
    const store = legacyStore();
    store.setItem(WORKSPACE_KEY, "{not json");
    const r = loadWorkspace(store, NOW.getTime());
    expect(r.status).toBe("recovered");
    expect(r.data.tasks.length).toBe(4);
    expect(store.dump()[`${WORKSPACE_KEY}.unreadable.${NOW.getTime()}`]).toBe("{not json");
  });

  it("drops invalid records inside a v1 workspace but keeps valid ones", () => {
    const store = memoryStore({
      [WORKSPACE_KEY]: JSON.stringify({
        version: 1,
        tasks: [task({ id: "ok" }), { id: "", title: "no id" }, task({ id: "bad-goal", goalId: "missing" })],
        goals: [],
        focusSessions: [{ id: "s", endedAt: 1, focusedMs: -5 }],
        prefs: { activeTaskId: "gone", defaultPriority: "XX" },
      }),
    });
    const r = loadWorkspace(store, NOW.getTime());
    expect(r.data.tasks.map(t => t.id)).toEqual(["ok", "bad-goal"]);
    expect(r.data.tasks[1].goalId).toBeNull();
    expect(r.data.prefs.activeTaskId).toBeNull();
    expect(r.data.prefs.defaultPriority).toBe("NI");
    expect(r.dropped).toBe(2);
    expect(r.needsWrite).toBe(true);
  });
});

describe("reducer", () => {
  const base = () => ({ ...emptyWorkspace(), tasks: [task({ id: "a" }), task({ id: "b", goalId: "g" })], goals: [{ id: "g", title: "G", emoji: "🎯", targetDate: null, createdAt: 1, updatedAt: 1 }] });

  it("toggles completion and records completedAt", () => {
    let s = reducer(base(), { type: "task/toggle", id: "a", now: 50 });
    expect(s.tasks[0]).toMatchObject({ status: "done", completedAt: 50 });
    s = reducer(s, { type: "task/toggle", id: "a", now: 60 });
    expect(s.tasks[0]).toMatchObject({ status: "todo", completedAt: null });
  });

  it("restores a deleted task at its original position (undo)", () => {
    const s0 = base();
    const s1 = reducer(s0, { type: "task/delete", id: "a" });
    expect(s1.tasks.map(t => t.id)).toEqual(["b"]);
    const s2 = reducer(s1, { type: "task/restore", task: s0.tasks[0], index: 0 });
    expect(s2.tasks.map(t => t.id)).toEqual(["a", "b"]);
    expect(reducer(s2, { type: "task/restore", task: s0.tasks[0], index: 0 }).tasks).toHaveLength(2);
  });

  it("clears the reminder flag when the due time changes and drops remind without a time", () => {
    const s0 = { ...base(), tasks: [task({ id: "a", dueDate: "2026-11-06", dueTime: "09:00", remind: true, reminderSentAt: 5 })] };
    const s1 = reducer(s0, { type: "task/update", id: "a", patch: { dueTime: "11:00" }, now: 9 });
    expect(s1.tasks[0].reminderSentAt).toBeNull();
    const s2 = reducer(s1, { type: "task/update", id: "a", patch: { dueTime: null }, now: 10 });
    expect(s2.tasks[0].remind).toBe(false);
    const s3 = reducer(s2, { type: "task/update", id: "a", patch: { dueDate: null }, now: 11 });
    expect(s3.tasks[0].dueTime).toBeNull();
  });

  it("deleting a goal unlinks its tasks; restoring relinks them", () => {
    const s0 = base();
    const s1 = reducer(s0, { type: "goal/delete", id: "g" });
    expect(s1.tasks[1].goalId).toBeNull();
    const s2 = reducer(s1, { type: "goal/restore", goal: s0.goals[0], index: 0, taskIds: ["b"] });
    expect(s2.tasks[1].goalId).toBe("g");
  });

  it("logs a focus session once and credits the linked task only when completed", () => {
    const session = { id: "f-1", taskId: "a", endedAt: 100, focusedMs: 1_500_000, completed: true };
    let s = reducer(base(), { type: "focus/log", session });
    s = reducer(s, { type: "focus/log", session }); // duplicate completion event
    expect(s.focusSessions).toHaveLength(1);
    expect(s.tasks[0].pomodoros).toBe(1);
    s = reducer(s, { type: "focus/log", session: { ...session, id: "f-2", completed: false } });
    expect(s.focusSessions).toHaveLength(2);
    expect(s.tasks[0].pomodoros).toBe(1);
  });

  it("deleting the focused task clears the focus link", () => {
    const s0 = { ...base(), prefs: { ...base().prefs, activeTaskId: "a" } };
    expect(reducer(s0, { type: "task/delete", id: "a" }).prefs.activeTaskId).toBeNull();
  });
});

describe("selectors", () => {
  it("treats date-only tasks as overdue only after the day ends", () => {
    expect(isOverdue(task({ id: "x", dueDate: "2026-11-06" }), NOW)).toBe(false);
    expect(isOverdue(task({ id: "x", dueDate: "2026-11-06", dueTime: "09:00" }), NOW)).toBe(true);
    expect(isOverdue(task({ id: "x", dueDate: "2026-11-05" }), NOW)).toBe(true);
    expect(isOverdue(task({ id: "x", dueDate: "2026-11-05", status: "done" }), NOW)).toBe(false);
  });

  it("groups open tasks by when they are due", () => {
    const g = groupOpenTasks(
      [
        task({ id: "late", dueDate: "2026-11-01" }),
        task({ id: "today", dueDate: "2026-11-06", dueTime: "15:00" }),
        task({ id: "later", dueDate: "2026-11-10" }),
        task({ id: "none" }),
        task({ id: "done", status: "done", dueDate: "2026-11-06" }),
      ],
      NOW
    );
    expect([g.overdue, g.today, g.upcoming, g.someday].map(l => l.map(t => t.id))).toEqual([["late"], ["today"], ["later"], ["none"]]);
  });

  it("orders top priorities by quadrant, then due date", () => {
    const top = topPriorities([
      task({ id: "later", priority: "NN" }),
      task({ id: "sched-soon", priority: "NI", dueDate: "2026-11-07" }),
      task({ id: "sched", priority: "NI" }),
      task({ id: "first", priority: "UI" }),
    ]);
    expect(top.map(t => t.id)).toEqual(["first", "sched-soon", "sched"]);
  });

  it("computes goal progress from linked tasks and focus sessions", () => {
    const goal = { id: "g", title: "G", emoji: "🎯", targetDate: null, createdAt: 1, updatedAt: 1 };
    const p = goalProgress(
      goal,
      [task({ id: "a", goalId: "g", status: "done" }), task({ id: "b", goalId: "g", priority: "UI" }), task({ id: "c" })],
      [{ id: "s", taskId: "a", endedAt: 1, focusedMs: 600_000, completed: true }]
    );
    expect(p).toMatchObject({ total: 2, done: 1, pct: 50, focusedMs: 600_000 });
    expect(p.next?.id).toBe("b");
  });

  it("only produces insights that the data supports", () => {
    expect(buildInsights(emptyWorkspace(), NOW)).toEqual([]);
    const ws = { ...emptyWorkspace(), tasks: [task({ id: "a", dueDate: "2026-11-05", status: "done" }), task({ id: "b", dueDate: "2026-11-05" })] };
    const ids = buildInsights(ws, NOW).map(i => i.id);
    expect(ids).toContain("overdue");
    expect(buildInsights(ws, NOW).find(i => i.id === "yesterday")?.text).toBe("You finished 1 of 2 tasks that were due yesterday.");
  });
});

describe("parseQuickAdd", () => {
  const p = (s: string, ignore = {}) => parseQuickAdd(s, NOW, ignore);

  it("parses date, time, and priority, removing them from the title", () => {
    expect(p("Finish cybersecurity assignment tomorrow at 6pm !1")).toMatchObject({
      title: "Finish cybersecurity assignment",
      dueDate: "2026-11-07",
      dueTime: "18:00",
      priority: "UI",
    });
  });

  it("resolves weekdays to the next occurrence, including today", () => {
    expect(p("Prepare presentation friday").dueDate).toBe("2026-11-06");
    expect(p("Call mom on monday").dueDate).toBe("2026-11-09");
    expect(p("Call mom on monday").title).toBe("Call mom");
  });

  it("parses month-day dates and rolls past dates into next year", () => {
    expect(p("Exam Dec 3").dueDate).toBe("2026-12-03");
    expect(p("Taxes 15 April").dueDate).toBe("2027-04-15");
  });

  it("handles 24h times, 12am/12pm, and a time without a date", () => {
    expect(p("Standup 09:30")).toMatchObject({ dueTime: "09:30", dueDate: "2026-11-06" });
    expect(p("Lunch 12pm").dueTime).toBe("12:00");
    expect(p("Backup 12am").dueTime).toBe("00:00");
  });

  it("ignores ambiguous or ordinary words", () => {
    expect(p("Read 10 pages at 6")).toMatchObject({ title: "Read 10 pages at 6", dueTime: null, dueDate: null });
    expect(p("Enjoy the sun and wed plans")).toMatchObject({ dueDate: null });
    expect(p("Fix 13pm bug").dueTime).toBeNull();
  });

  it("respects dismissed matches", () => {
    expect(p("Review Monday report", { date: true })).toMatchObject({ title: "Review Monday report", dueDate: null });
  });

  it("never returns an empty title", () => {
    expect(p("tomorrow")).toMatchObject({ title: "tomorrow", dueDate: null });
  });
});
