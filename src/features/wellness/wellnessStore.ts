import { addDays, toDateKey } from "../../lib/dates";
import { readJSON, writeJSON } from "../../lib/storage";

/** Same per-day keys as v0.2 (`wellness.entry.YYYY-MM-DD`), so earlier check-ins carry over. */
export const WELLNESS_PREFIX = "wellness.entry.";

export interface WellnessEntry {
  date: string;
  /** 1 (rough) … 5 (great). v0.2 only recorded 1, 3 or 5. */
  mood: number;
  /** 0 (calm) … 10 (very high). */
  stress: number;
  /** 1 … 5. Added in 0.3; absent in older entries. */
  energy?: number;
  updatedAt?: number;
}

const clamp = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : null;

export function readEntry(date: string): WellnessEntry | null {
  const raw = readJSON<Record<string, unknown>>(WELLNESS_PREFIX + date);
  if (!raw || typeof raw !== "object") return null;
  const mood = clamp(raw.mood, 1, 5);
  const stress = clamp(raw.stress, 0, 10);
  if (mood == null || stress == null) return null;
  const energy = clamp(raw.energy, 1, 5);
  return {
    date,
    mood,
    stress,
    ...(energy != null ? { energy } : {}),
    ...(typeof raw.updatedAt === "number" ? { updatedAt: raw.updatedAt } : {}),
  };
}

export function writeEntry(entry: WellnessEntry): boolean {
  return writeJSON(WELLNESS_PREFIX + entry.date, { ...entry, updatedAt: Date.now() });
}

export function readHistory(now: Date, days: number): Array<{ date: string; entry: WellnessEntry | null }> {
  const out: Array<{ date: string; entry: WellnessEntry | null }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = toDateKey(addDays(now, -i));
    out.push({ date, entry: readEntry(date) });
  }
  return out;
}

/** All stored wellness entries (for export). */
export function readAllEntries(): WellnessEntry[] {
  const out: WellnessEntry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(WELLNESS_PREFIX)) {
        const e = readEntry(k.slice(WELLNESS_PREFIX.length));
        if (e) out.push(e);
      }
    }
  } catch {
    /* storage unavailable */
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Supportive, non-clinical suggestions. Never diagnostic. */
export function suggestionFor(e: Pick<WellnessEntry, "mood" | "stress" | "energy">): string {
  if (e.stress >= 8) return "You’re carrying a lot today. Pick one task, shrink it to a first step you can finish in ten minutes, and take a real break before anything else.";
  if (e.stress >= 6) return "Stress is up. Protect one block of focused time, keep the rest of the day light, and let “Later” tasks wait.";
  if (e.mood <= 2) return "Low days happen. Choose one small, meaningful task, finish it, and count it as a win. Progress doesn’t have to be loud.";
  if (e.energy != null && e.energy <= 2) return "Energy is low. Favour shorter focus sessions, and do the easiest important task first to build momentum.";
  if (e.mood >= 4 && e.stress <= 3) return "Good headspace. Spend it on something important but not urgent, the work that’s easy to postpone.";
  return "Steady is enough. Do one clear next step, then check in with yourself again later.";
}
