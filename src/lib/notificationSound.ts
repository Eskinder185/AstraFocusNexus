/**
 * Original two-note Web Audio cue. No downloaded audio or third-party assets.
 * AudioContext is created only in a user gesture; background playback is best effort.
 */
export const SOUND_KEY = "astra.notificationSound.v1";
const PLAYED_KEY = "astra.notificationSound.played.v1";

export interface SoundPreferences {
  enabled: boolean;
  volume: number;
  taskCompletion: boolean;
}

export const DEFAULT_SOUND: SoundPreferences = { enabled: true, volume: 0.3, taskCompletion: false };

const getStore = (): Storage | null => {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
};

export function readSoundPreferences(): SoundPreferences {
  try {
    const raw = getStore()?.getItem(SOUND_KEY);
    if (!raw) return { ...DEFAULT_SOUND };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return { ...DEFAULT_SOUND };
    const p = value as Partial<SoundPreferences>;
    return {
      enabled: typeof p.enabled === "boolean" ? p.enabled : DEFAULT_SOUND.enabled,
      volume: typeof p.volume === "number" && Number.isFinite(p.volume) ? Math.max(0, Math.min(1, p.volume)) : DEFAULT_SOUND.volume,
      taskCompletion: typeof p.taskCompletion === "boolean" ? p.taskCompletion : DEFAULT_SOUND.taskCompletion,
    };
  } catch { return { ...DEFAULT_SOUND }; }
}

export function saveSoundPreferences(prefs: SoundPreferences): boolean {
  try {
    const store = getStore();
    if (!store) return false;
    store.setItem(SOUND_KEY, JSON.stringify({
      enabled: prefs.enabled,
      volume: Math.max(0, Math.min(1, prefs.volume)),
      taskCompletion: prefs.taskCompletion,
    }));
    return true;
  } catch { return false; }
}

let context: AudioContext | null = null;
const played = new Set<string>();
const pending = new Set<string>();

function contextConstructor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & { webkitAudioContext?: typeof AudioContext };
  return (typeof AudioContext !== "undefined" ? AudioContext : undefined) ?? w.webkitAudioContext;
}

/** Call from a pointer or keyboard gesture (including Start and Test Sound). */
export function unlockNotificationAudio(): void {
  try {
    const Ctor = contextConstructor();
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch { /* unsupported or blocked */ }
}

function hasPlayed(id: string): boolean {
  if (played.has(id)) return true;
  try {
    return (JSON.parse(getStore()?.getItem(PLAYED_KEY) ?? "[]") as unknown[]).includes(id);
  } catch { return false; }
}

function remember(id: string): void {
  played.add(id);
  try {
    const prior = JSON.parse(getStore()?.getItem(PLAYED_KEY) ?? "[]") as string[];
    getStore()?.setItem(PLAYED_KEY, JSON.stringify([...prior.filter(x => x !== id), id].slice(-40)));
  } catch { /* in-memory dedup still applies */ }
}

function note(ctx: AudioContext, frequency: number, start: number, duration: number, level: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/**
 * Returns false when muted, unavailable, or blocked. An id prevents the same
 * timer/reminder event from ringing twice across renders and reloads.
 */
export async function playNotificationSound(id?: string, kind: "notification" | "task" = "notification"): Promise<boolean> {
  const prefs = readSoundPreferences();
  if (!prefs.enabled || prefs.volume <= 0 || (kind === "task" && !prefs.taskCompletion) || (id && (pending.has(id) || hasPlayed(id)))) return false;
  if (id) pending.add(id);
  try {
    if (!context) return false; // no prior user gesture
    if (context.state === "suspended") await context.resume();
    if (context.state !== "running") return false;
    const start = context.currentTime + 0.01;
    const level = 0.16 * prefs.volume * (kind === "task" ? 0.55 : 1);
    note(context, 523.25, start, 0.38, level);
    note(context, 659.25, start + 0.16, 0.5, level * 0.8);
    if (id) remember(id);
    return true;
  } catch { return false; }
  finally { if (id) pending.delete(id); }
}

/** Called directly by the Settings button; this gesture can unlock audio. */
export async function previewNotificationSound(): Promise<boolean> {
  unlockNotificationAudio();
  return playNotificationSound();
}
