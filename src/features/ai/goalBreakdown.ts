/**
 * "Break a goal into tasks": prompt construction and strict validation of the reply.
 * Only the goal text is sent. Nothing else from the workspace leaves the device.
 */
import type { ChatMessage, JsonSchemaFormat } from "./client";

export const GOAL_MAX_CHARS = 500;
export const MAX_SUGGESTIONS = 12;
export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 400;
export const MIN_MINUTES = 5;
export const MAX_MINUTES = 480;

export interface TaskSuggestion {
  title: string;
  description: string;
  minutes: number;
  order: number;
}

export const SYSTEM_PROMPT =
  "You help a student or professional plan their work. Break the user's goal into 3 to 8 concrete, " +
  "actionable tasks in a sensible order. Each task needs a short title (under 80 characters), a one or two " +
  `sentence description, and an estimated duration in whole minutes between ${MIN_MINUTES} and ${MAX_MINUTES}. ` +
  'Reply with JSON only, no prose, in exactly this shape: {"tasks":[{"title":"...","description":"...","minutes":30,"order":1}]}';

export function buildGoalMessages(goal: string): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Goal: ${goal.trim().slice(0, GOAL_MAX_CHARS)}` },
  ];
}

export const GOAL_TASKS_FORMAT: JsonSchemaFormat = {
  name: "goal_tasks",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["tasks"],
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "description", "minutes", "order"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            minutes: { type: "integer" },
            order: { type: "integer" },
          },
        },
      },
    },
  },
};

/** Pull a JSON value out of a reply that may be wrapped in prose or ``` fences. */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fence) candidates.push(fence[1].trim());
  const firstObj = trimmed.indexOf("{");
  const lastObj = trimmed.lastIndexOf("}");
  if (firstObj !== -1 && lastObj > firstObj) candidates.push(trimmed.slice(firstObj, lastObj + 1));
  const firstArr = trimmed.indexOf("[");
  const lastArr = trimmed.lastIndexOf("]");
  if (firstArr !== -1 && lastArr > firstArr) candidates.push(trimmed.slice(firstArr, lastArr + 1));
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* try next */
    }
  }
  return undefined;
}

const oneLine = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();

export type ParseResult = { ok: true; tasks: TaskSuggestion[]; dropped: number } | { ok: false; error: string };

export function parseSuggestions(reply: string): ParseResult {
  const value = extractJson(reply);
  if (value === undefined) {
    return { ok: false, error: "The model didn’t return the task list in a format AstraFocus can read. Try again, or try a different model." };
  }
  const list = Array.isArray(value) ? value : value && typeof value === "object" ? (value as { tasks?: unknown }).tasks : undefined;
  if (!Array.isArray(list)) return { ok: false, error: "The reply didn’t contain a task list." };

  let dropped = 0;
  const tasks: TaskSuggestion[] = [];
  list.slice(0, 50).forEach((item, i) => {
    if (!item || typeof item !== "object") return void dropped++;
    const r = item as Record<string, unknown>;
    const title = typeof r.title === "string" ? oneLine(r.title).slice(0, TITLE_MAX) : "";
    if (!title) return void dropped++;
    const description = typeof r.description === "string" ? oneLine(r.description).slice(0, DESCRIPTION_MAX) : "";
    const rawMin = typeof r.minutes === "number" ? r.minutes : typeof r.minutes === "string" ? Number.parseFloat(r.minutes) : NaN;
    const minutes = Number.isFinite(rawMin) ? Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(rawMin))) : 30;
    const rawOrder = typeof r.order === "number" && Number.isFinite(r.order) ? r.order : i + 1;
    tasks.push({ title, description, minutes, order: rawOrder });
  });
  if (!tasks.length) return { ok: false, error: "The reply had no usable tasks." };
  tasks.sort((a, b) => a.order - b.order);
  const capped = tasks.slice(0, MAX_SUGGESTIONS).map((t, i) => ({ ...t, order: i + 1 }));
  return { ok: true, tasks: capped, dropped: dropped + Math.max(0, tasks.length - MAX_SUGGESTIONS) };
}
