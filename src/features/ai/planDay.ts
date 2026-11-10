/**
 * "Plan my day": the user picks a date, working hours and specific tasks; the model proposes
 * one work block per task. AstraFocus then re-checks every block itself (working hours,
 * already-planned blocks, overlaps, each task's start and due, times in the past) and only
 * lets the user apply blocks without conflicts. Applying sets the planned work block
 * (`scheduledAt`) only: deadlines never change, and the effort estimate only changes if the
 * user ticks that option for a block.
 */
import { addDays, formatTime, fromDateKey, isDateKey, isTimeString } from "../../lib/dates";
import { PRIORITY_META } from "../workspace/priority";
import { shortDate, startTimestamp } from "../workspace/schedule";
import type { Task } from "../workspace/schema";
import { dueTimestamp } from "../workspace/selectors";
import type { ParseOutcome } from "./aiActions";
import type { ChatMessage, JsonSchemaFormat } from "./client";

export const MAX_PLAN_TASKS = 12;
export const BLOCK_MIN = 5;
export const BLOCK_MAX = 720;
export const DEFAULT_BLOCK = 30;

export interface PlanContext {
  date: string; // YYYY-MM-DD
  workStart: string; // HH:mm
  workEnd: string; // HH:mm
  /** Selected tasks with short references used in the prompt (T1, T2, …). */
  tasks: { ref: string; task: Task }[];
  /** Already-planned blocks on that day for other tasks (minutes since midnight). */
  busy: { start: number; end: number }[];
}

export interface PlanBlock {
  ref: string;
  start: string; // HH:mm
  minutes: number;
  reason: string;
}

export interface PlanResult {
  blocks: PlanBlock[];
  unscheduled: { ref: string; reason: string }[];
  dropped: number;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const fromMin = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const range = (a: number, b: number) => `${formatTime(fromMin(a))}–${formatTime(fromMin(Math.min(b, 1439)))}`;

/** Busy time on `date` from other tasks' planned blocks (their estimate, or 30 min). */
export function busyBlocks(all: Task[], date: string, exclude: Set<string>): PlanContext["busy"] {
  const dayStart = fromDateKey(date).getTime();
  const dayEnd = addDays(fromDateKey(date), 1).getTime();
  return all
    .filter(t => !exclude.has(t.id) && t.status === "todo" && typeof t.scheduledAt === "number" && t.scheduledAt >= dayStart && t.scheduledAt < dayEnd)
    .map(t => {
      const start = Math.round((t.scheduledAt! - dayStart) / 60_000);
      return { start, end: start + (t.estimateMin ?? DEFAULT_BLOCK) };
    })
    .sort((a, b) => a.start - b.start);
}

function describe(t: Task): string {
  const parts = [`priority: ${PRIORITY_META[t.priority].label}`, t.estimateMin ? `estimate: ${t.estimateMin} min` : "estimate: none"];
  if (t.startDate) parts.push(`starts: ${t.startDate}${t.startTime ? ` ${t.startTime}` : ""}`);
  if (t.dueDate) parts.push(`due: ${t.dueDate}${t.dueTime ? ` ${t.dueTime}` : " (end of day)"}`);
  return parts.join(" | ");
}

export const PLAN_SYSTEM_PROMPT =
  "You plan someone's working day. Schedule exactly one work block for each listed task that can fit. Rules: blocks must be inside the " +
  "working hours, must not overlap each other or the busy times, must not start before a task's start, and must end before a task is due " +
  "when it is due that day. Use the task's estimate as the block length when it has one; otherwise choose a sensible length in minutes. " +
  "Put higher-priority and sooner-due tasks first. If a task cannot fit, list it under unscheduled with a short reason. Never change dates. " +
  'Reply with JSON only: {"blocks":[{"task":"T1","start":"09:00","minutes":60,"reason":"..."}],"unscheduled":[{"task":"T2","reason":"..."}]}';

export function buildPlanMessages(ctx: PlanContext): ChatMessage[] {
  const day = fromDateKey(ctx.date).toLocaleDateString("en-US", { weekday: "long" });
  const lines = [
    `Date: ${ctx.date} (${day})`,
    `Working hours: ${ctx.workStart}-${ctx.workEnd}`,
    `Busy (already planned): ${ctx.busy.length ? ctx.busy.map(b => `${fromMin(b.start)}-${fromMin(Math.min(b.end, 1439))}`).join(", ") : "none"}`,
    "Tasks:",
    ...ctx.tasks.map(({ ref, task }) => `${ref}: "${task.title.replace(/"/g, "'").slice(0, 200)}" | ${describe(task)}`),
  ];
  return [
    { role: "system", content: PLAN_SYSTEM_PROMPT },
    { role: "user", content: lines.join("\n") },
  ];
}

export const PLAN_FORMAT: JsonSchemaFormat = {
  name: "day_plan",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["blocks", "unscheduled"],
    properties: {
      blocks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["task", "start", "minutes", "reason"],
          properties: { task: { type: "string" }, start: { type: "string" }, minutes: { type: "integer" }, reason: { type: "string" } },
        },
      },
      unscheduled: {
        type: "array",
        items: { type: "object", additionalProperties: false, required: ["task", "reason"], properties: { task: { type: "string" }, reason: { type: "string" } } },
      },
    },
  },
};

const oneLine = (s: unknown, max = 200) => (typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

function extractObject(text: string): unknown {
  const t = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  for (const c of [t, fence?.[1] ?? "", t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)]) {
    if (!c) continue;
    try {
      return JSON.parse(c);
    } catch {
      /* next */
    }
  }
  return undefined;
}

/** Normalise "9:00", "09:00", "9am" and "2:30 PM" to HH:mm, or null. */
export function normaliseTime(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?\s*$/i.exec(v);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3]?.toLowerCase().replace(/\./g, "");
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (ap === "pm" && h !== 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
  }
  const t = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  return isTimeString(t) ? t : null;
}

/**
 * Map the model's task reference to one we sent. Models sometimes answer "T1", "t1",
 * "T1: Write report" or just the title, so accept those, but only if they match exactly
 * one selected task.
 */
export function resolveRef(raw: unknown, ctx: PlanContext): string | null {
  if (typeof raw !== "string") return null;
  const refs = new Set(ctx.tasks.map(t => t.ref));
  // An exact title match wins (a title could itself contain something like "T2").
  const title = raw.trim().replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, "").toLowerCase();
  const hits = ctx.tasks.filter(t => t.task.title.trim().toLowerCase() === title);
  if (hits.length === 1) return hits[0].ref;
  const m = /\bT(\d{1,2})\b/i.exec(raw);
  return m && refs.has(`T${Number(m[1])}`) ? `T${Number(m[1])}` : null;
}

/** Structural validation only: known task references, real times, sane lengths, one block per task. */
export function parsePlan(reply: string, ctx: PlanContext): ParseOutcome<PlanResult> {
  const v = extractObject(reply);
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, error: "The model didn’t return a plan AstraFocus can read. Try again, or try a different model." };
  const r = v as Record<string, unknown>;
  if (!Array.isArray(r.blocks)) return { ok: false, error: "The reply didn’t contain a list of work blocks." };
  const refs = new Set(ctx.tasks.map(t => t.ref));
  const seen = new Set<string>();
  let dropped = 0;
  const blocks: PlanBlock[] = [];
  for (const b of r.blocks.slice(0, 50)) {
    const o = b && typeof b === "object" ? (b as Record<string, unknown>) : {};
    const ref = resolveRef(o.task, ctx) ?? "";
    const start = normaliseTime(o.start);
    const minutes = typeof o.minutes === "number" ? Math.round(o.minutes) : typeof o.minutes === "string" ? Math.round(Number.parseFloat(o.minutes)) : NaN;
    if (!refs.has(ref) || seen.has(ref) || !start || !Number.isFinite(minutes) || minutes < BLOCK_MIN || minutes > BLOCK_MAX) {
      dropped++;
      continue;
    }
    seen.add(ref);
    blocks.push({ ref, start, minutes, reason: oneLine(o.reason) });
  }
  const unscheduled = Array.isArray(r.unscheduled)
    ? r.unscheduled.flatMap(u => {
        const o = u && typeof u === "object" ? (u as Record<string, unknown>) : {};
        const ref = resolveRef(o.task, ctx) ?? "";
        return refs.has(ref) && !seen.has(ref) ? [{ ref, reason: oneLine(o.reason) || "No reason given." }] : [];
      })
    : [];
  // Selected tasks the model ignored entirely are reported too.
  for (const { ref } of ctx.tasks) if (!seen.has(ref) && !unscheduled.some(u => u.ref === ref)) unscheduled.push({ ref, reason: "The model didn’t schedule this task." });
  if (!blocks.length && !unscheduled.length) return { ok: false, error: "The reply had no usable work blocks." };
  blocks.sort((a, b) => toMin(a.start) - toMin(b.start));
  return { ok: true, value: { blocks, unscheduled, dropped } };
}

export interface EditableBlock {
  ref: string;
  start: string;
  minutes: number;
}

/**
 * AstraFocus's own check of a proposed block. Returns human-readable conflicts; an empty
 * list means the block can be applied. Never trusts the model's claims.
 */
export function blockConflicts(block: EditableBlock, others: EditableBlock[], ctx: PlanContext, now: Date): string[] {
  const out: string[] = [];
  const entry = ctx.tasks.find(t => t.ref === block.ref);
  if (!entry || !isDateKey(ctx.date)) return ["Unknown task."];
  if (!isTimeString(block.start)) return ["Enter a valid start time."];
  if (!Number.isFinite(block.minutes) || block.minutes < BLOCK_MIN || block.minutes > BLOCK_MAX) return [`Length must be ${BLOCK_MIN}–${BLOCK_MAX} minutes.`];
  const s = toMin(block.start);
  const e = s + block.minutes;
  const ws = toMin(ctx.workStart);
  const we = toMin(ctx.workEnd);
  if (s < ws || e > we) out.push(`Outside your working hours (${range(ws, we)}).`);
  for (const b of ctx.busy) if (s < b.end && b.start < e) out.push(`Overlaps something already planned (${range(b.start, b.end)}).`);
  for (const o of others) {
    if (o.ref === block.ref || !isTimeString(o.start)) continue;
    const os = toMin(o.start);
    const oe = os + o.minutes;
    if (s < oe && os < e) out.push(`Overlaps “${ctx.tasks.find(t => t.ref === o.ref)?.task.title ?? o.ref}”.`);
  }
  const startTs = fromDateKey(ctx.date, block.start).getTime();
  const endTs = startTs + block.minutes * 60_000;
  const t = entry.task;
  const taskStart = startTimestamp(t);
  if (taskStart != null && startTs < taskStart) out.push(`Starts before the task does (${shortDate(t.startDate!, now)}${t.startTime ? `, ${formatTime(t.startTime)}` : ""}).`);
  const due = dueTimestamp(t);
  if (due != null && endTs > due) out.push(`Ends after the task is due (${shortDate(t.dueDate!, now)}${t.dueTime ? `, ${formatTime(t.dueTime)}` : ""}).`);
  if (startTs < now.getTime()) out.push("This time has already passed.");
  return out;
}

export function validWorkingHours(start: string, end: string): string | null {
  if (!isTimeString(start) || !isTimeString(end)) return "Enter valid working hours.";
  if (toMin(end) - toMin(start) < BLOCK_MIN) return "Working hours must end after they start.";
  return null;
}

export const blockTimestamp = (date: string, start: string) => fromDateKey(date, start).getTime();
