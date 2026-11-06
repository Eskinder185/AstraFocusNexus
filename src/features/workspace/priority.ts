import type { Priority } from "./schema";

export type Tone = "danger" | "accent" | "warning" | "neutral";

export interface PriorityMeta {
  code: Priority;
  label: string;
  long: string;
  hint: string;
  rank: number;
  tone: Tone;
  /** Shortcut used by quick add, e.g. "!1". */
  shortcut: string;
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  UI: { code: "UI", label: "Do first", long: "Urgent & important", hint: "Real deadlines and true priorities. Handle these before anything else.", rank: 0, tone: "danger", shortcut: "!1" },
  NI: { code: "NI", label: "Schedule", long: "Important, not urgent", hint: "Where long-term progress lives. Give it protected time.", rank: 1, tone: "accent", shortcut: "!2" },
  UN: { code: "UN", label: "Delegate", long: "Urgent, not important", hint: "Loud but low-impact. Delegate, batch, or keep it short.", rank: 2, tone: "warning", shortcut: "!3" },
  NN: { code: "NN", label: "Later", long: "Neither urgent nor important", hint: "Optional. Do it with spare energy, or drop it.", rank: 3, tone: "neutral", shortcut: "!4" },
};

/** Display order: most important first. */
export const PRIORITY_ORDER: Priority[] = ["UI", "NI", "UN", "NN"];
