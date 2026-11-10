/**
 * "Improve a task": rewrite a vague task into a clear action, suggest subtasks and an estimate.
 * Only the task title (and its notes, if the user ticks that box) is sent.
 */
import type { ChatMessage, JsonSchemaFormat } from "./client";
import type { ParseOutcome } from "./aiActions";

export const IMPROVE_TITLE_MAX = 120;
export const IMPROVE_DESCRIPTION_MAX = 400;
export const IMPROVE_NOTES_MAX = 1500;
export const ESTIMATE_MIN = 5;
export const ESTIMATE_MAX = 720; // matches the task schema
export const SUBTASK_MAX_MINUTES = 480;
export const MAX_SUBTASKS = 8;

export interface ImproveInput {
  title: string;
  notes?: string;
}

export interface Improvement {
  title: string;
  description: string;
  estimateMin: number | null;
  subtasks: { title: string; minutes: number | null }[];
  dropped: number;
}

export const IMPROVE_SYSTEM_PROMPT =
  "You help people turn vague to-do items into clear, actionable tasks. Rewrite the task title as one concrete action starting with a verb " +
  "(under 80 characters). Write a one or two sentence description of the first step and what 'done' looks like. Estimate the total effort in " +
  `whole minutes (${ESTIMATE_MIN}-${ESTIMATE_MAX}). Suggest 0 to ${MAX_SUBTASKS} short subtasks only if the task is genuinely multi-step, each with ` +
  'minutes. Reply with JSON only: {"title":"...","description":"...","estimateMin":30,"subtasks":[{"title":"...","minutes":15}]}';

export function buildImproveMessages(input: ImproveInput): ChatMessage[] {
  const lines = [`Task: ${input.title.trim().slice(0, 300)}`];
  if (input.notes?.trim()) lines.push(`Notes: ${input.notes.trim().slice(0, IMPROVE_NOTES_MAX)}`);
  return [
    { role: "system", content: IMPROVE_SYSTEM_PROMPT },
    { role: "user", content: lines.join("\n") },
  ];
}

export const IMPROVE_FORMAT: JsonSchemaFormat = {
  name: "improved_task",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "description", "estimateMin", "subtasks"],
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      estimateMin: { type: "integer" },
      subtasks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "minutes"],
          properties: { title: { type: "string" }, minutes: { type: "integer" } },
        },
      },
    },
  },
};

const oneLine = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();

function extractObject(text: string): unknown {
  const t = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  const candidates = [t, fence?.[1] ?? "", t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)];
  for (const c of candidates) {
    if (!c) continue;
    try {
      return JSON.parse(c);
    } catch {
      /* try next */
    }
  }
  return undefined;
}

function minutes(v: unknown, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(max, Math.max(ESTIMATE_MIN, Math.round(n / 5) * 5));
}

export function parseImprovement(reply: string): ParseOutcome<Improvement> {
  const v = extractObject(reply);
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, error: "The model didn’t return a suggestion AstraFocus can read. Try again, or try a different model." };
  const r = v as Record<string, unknown>;
  const title = typeof r.title === "string" ? oneLine(r.title).slice(0, IMPROVE_TITLE_MAX) : "";
  if (!title) return { ok: false, error: "The suggestion had no task title." };
  const description = typeof r.description === "string" ? oneLine(r.description).slice(0, IMPROVE_DESCRIPTION_MAX) : "";
  let dropped = 0;
  const subtasks: Improvement["subtasks"] = [];
  if (Array.isArray(r.subtasks)) {
    for (const s of r.subtasks.slice(0, 30)) {
      const st = s && typeof s === "object" ? (s as Record<string, unknown>) : null;
      const t = st && typeof st.title === "string" ? oneLine(st.title).slice(0, IMPROVE_TITLE_MAX) : "";
      if (!t) {
        dropped++;
        continue;
      }
      if (subtasks.length >= MAX_SUBTASKS) {
        dropped++;
        continue;
      }
      subtasks.push({ title: t, minutes: minutes(st!.minutes, SUBTASK_MAX_MINUTES) });
    }
  }
  return { ok: true, value: { title, description, estimateMin: minutes(r.estimateMin, ESTIMATE_MAX), subtasks, dropped } };
}
