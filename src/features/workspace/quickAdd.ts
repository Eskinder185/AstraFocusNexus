import { addDays, toDateKey } from "../../lib/dates";
import type { Priority } from "./schema";

/**
 * Deterministic quick-add parsing. Recognises only unambiguous patterns:
 *   dates:    today, tomorrow, weekday names (next occurrence, today included), "Nov 12" / "12 November"
 *   times:    6pm, 6:30 pm, at 7am, 18:00          ("at 6" without am/pm is ignored: ambiguous)
 *   priority: !1 Do first, !2 Schedule, !3 Delegate, !4 Later
 * Every match is shown to the user as a removable chip before saving; a removed chip
 * is passed back via `ignore` so the words stay in the title.
 */

export interface QuickAddResult {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority | null;
  /** The literal text each value was parsed from. */
  matched: { date?: string; time?: string; priority?: string };
}

export interface QuickAddIgnore {
  date?: boolean;
  time?: boolean;
  priority?: boolean;
}

const PRIORITY_BY_DIGIT: Record<string, Priority> = { "1": "UI", "2": "NI", "3": "UN", "4": "NN" };

// "sun", "sat" and "wed" are ordinary English words, so only the full names count for those days.
const WEEKDAYS: Array<[RegExp, number]> = [
  [/^sunday$/i, 0],
  [/^mon(day)?$/i, 1],
  [/^tue(s|sday)?$/i, 2],
  [/^wednesday$/i, 3],
  [/^thu(r|rs|rsday)?$/i, 4],
  [/^fri(day)?$/i, 5],
  [/^saturday$/i, 6],
];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

const pad = (n: number) => String(n).padStart(2, "0");

function cut(text: string, index: number, length: number): string {
  return (text.slice(0, index) + " " + text.slice(index + length)).replace(/\s+/g, " ").trim();
}

function monthIndex(word: string): number {
  return MONTHS.indexOf(word.slice(0, 3).toLowerCase());
}

function dateFromMonthDay(month: number, day: number, now: Date): string | null {
  let d = new Date(now.getFullYear(), month, day);
  if (d.getMonth() !== month) return null; // e.g. Feb 31
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d < today) d = new Date(now.getFullYear() + 1, month, day);
  return toDateKey(d);
}

export function parseQuickAdd(input: string, now: Date, ignore: QuickAddIgnore = {}): QuickAddResult {
  let text = input.replace(/\s+/g, " ").trim();
  const result: QuickAddResult = { title: text, dueDate: null, dueTime: null, priority: null, matched: {} };

  // Priority: !1 … !4
  if (!ignore.priority) {
    const m = /(^|\s)!([1-4])(?=\s|$)/.exec(text);
    if (m) {
      result.priority = PRIORITY_BY_DIGIT[m[2]];
      result.matched.priority = `!${m[2]}`;
      text = cut(text, m.index + m[1].length, m[2].length + 1);
    }
  }

  // Time: 6pm · 6:30 pm · at 7am · 18:00 · at 18:30
  if (!ignore.time) {
    const ampm = /(^|\s)((?:at\s+)?(\d{1,2})(?::([0-5]\d))?\s?(am|pm))(?=\s|$|[.,])/i.exec(text);
    const h24 = ampm ? null : /(^|\s)((?:at\s+)?([01]?\d|2[0-3]):([0-5]\d))(?=\s|$|[.,])/i.exec(text);
    const m = ampm ?? h24;
    if (m) {
      let hour = Number(m[3]);
      const minute = m[4] ? Number(m[4]) : 0;
      let valid = true;
      if (ampm) {
        if (hour < 1 || hour > 12) valid = false;
        const pm = m[5].toLowerCase() === "pm";
        if (hour === 12) hour = pm ? 12 : 0;
        else if (pm) hour += 12;
      }
      if (valid) {
        result.dueTime = `${pad(hour)}:${pad(minute)}`;
        result.matched.time = m[2];
        text = cut(text, m.index + m[1].length, m[2].length);
      }
    }
  }

  // Date
  if (!ignore.date) {
    const words = /(^|\s)((?:on\s+|due\s+|by\s+)?(today|tomorrow|[a-z]+))(?=\s|$|[.,])/gi;
    let found: { index: number; length: number; date: string; literal: string } | null = null;
    for (let m = words.exec(text); m && !found; m = words.exec(text)) {
      const word = m[3].toLowerCase();
      let date: string | null = null;
      if (word === "today") date = toDateKey(now);
      else if (word === "tomorrow") date = toDateKey(addDays(now, 1));
      else {
        const wd = WEEKDAYS.find(([re]) => re.test(word));
        if (wd) date = toDateKey(addDays(now, (wd[1] - now.getDay() + 7) % 7));
      }
      if (date) found = { index: m.index + m[1].length, length: m[2].length, date, literal: m[2] };
    }
    if (!found) {
      const md = new RegExp(`(^|\\s)((?:on\\s+|due\\s+|by\\s+)?${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?)(?=\\s|$|[.,])`, "i").exec(text);
      const dm = md ? null : new RegExp(`(^|\\s)((?:on\\s+|due\\s+|by\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE})(?=\\s|$|[.,])`, "i").exec(text);
      if (md) {
        const date = dateFromMonthDay(monthIndex(md[3]), Number(md[4]), now);
        if (date) found = { index: md.index + md[1].length, length: md[2].length, date, literal: md[2] };
      } else if (dm) {
        const date = dateFromMonthDay(monthIndex(dm[4]), Number(dm[3]), now);
        if (date) found = { index: dm.index + dm[1].length, length: dm[2].length, date, literal: dm[2] };
      }
    }
    if (found) {
      result.dueDate = found.date;
      result.matched.date = found.literal;
      text = cut(text, found.index, found.length);
    }
  }

  // A time with no date means today.
  if (result.dueTime && !result.dueDate) result.dueDate = toDateKey(now);

  // Never produce an empty title: if everything was "parsed away", keep the literal text.
  if (!text) return { title: input.replace(/\s+/g, " ").trim(), dueDate: null, dueTime: null, priority: null, matched: {} };
  result.title = text;
  return result;
}
