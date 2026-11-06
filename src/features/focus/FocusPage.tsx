import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Maximize2, Minimize2, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useAppToast } from "../../context/AppToast";
import { formatPomodoroMs, modeLabel, usePomodoro, type PomodoroMode } from "../../context/PomodoroContext";
import { useNow } from "../../hooks/useNow";
import { cx } from "../../lib/cx";
import { formatClock, formatDuration } from "../../lib/dates";
import { PRIORITY_META } from "../workspace/priority";
import { compareByPriority, focusByDay, focusOnDay, isOpen } from "../workspace/selectors";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";
import { playNoise, setNoiseVolume, stopNoise, useAmbient, type NoiseKind } from "./ambient";

const ATMOSPHERES = [
  { id: "nebula", label: "Nebula" },
  { id: "aurora", label: "Aurora" },
  { id: "midnight", label: "Midnight" },
  { id: "ember", label: "Ember" },
  { id: "paper", label: "Paper" },
] as const;
type Atmosphere = (typeof ATMOSPHERES)[number]["id"];
const ATMOSPHERE_KEY = "astra.focus.atmosphere";

const MODES: PomodoroMode[] = ["focus", "short", "long"];

export const FocusPage: React.FC = () => {
  const pomo = usePomodoro();
  const { tasks, prefs, focusSessions } = useWorkspace();
  const { setPrefs } = useWorkspaceActions();
  const now = useNow();
  const stageRef = useRef<HTMLElement>(null);
  const [immersive, setImmersive] = useState(false);
  const [atmosphere, setAtmosphere] = useState<Atmosphere>(() => {
    const v = localStorage.getItem(ATMOSPHERE_KEY);
    return (ATMOSPHERES.find(a => a.id === v)?.id ?? "nebula") as Atmosphere;
  });
  const taskSelectId = useId();

  const openTasks = useMemo(() => tasks.filter(isOpen).sort(compareByPriority), [tasks]);
  const linked = prefs.activeTaskId ? tasks.find(t => t.id === prefs.activeTaskId) : undefined;
  const today = focusOnDay(focusSessions, now);
  const week = focusByDay(focusSessions, now, 7);
  const weekMax = Math.max(...week.map(d => d.ms), 25 * 60_000);
  const todaySessions = focusSessions.filter(s => new Date(s.endedAt).toDateString() === now.toDateString()).slice(-6).reverse();

  const frac = 1 - pomo.remainingMs / Math.max(1, pomo.segmentDurationMs);
  const isBreak = pomo.mode !== "focus";
  const cyclePos = pomo.cycle % pomo.settings.cyclesBeforeLong;

  // Immersive mode: fullscreen where supported, otherwise a fixed overlay. Esc always exits.
  const enterImmersive = async () => {
    setImmersive(true);
    try {
      await stageRef.current?.requestFullscreen?.({ navigationUI: "hide" });
    } catch {
      /* overlay fallback is fine */
    }
  };
  const exitImmersive = () => {
    setImmersive(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };
  useEffect(() => {
    if (!immersive) return;
    const onFs = () => !document.fullscreenElement && setImmersive(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setImmersive(false);
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("keydown", onKey);
    };
  }, [immersive]);

  // Space toggles the timer on this page (when not typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, button, a, [contenteditable]") || document.querySelector("dialog[open]")) return;
      e.preventDefault();
      if (pomo.running) pomo.pause();
      else if (pomo.phase === "paused") pomo.resume();
      else pomo.start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pomo]);

  const primary = () => (pomo.running ? pomo.pause() : pomo.phase === "paused" ? pomo.resume() : pomo.start());
  const primaryLabel = pomo.running ? "Pause" : pomo.phase === "paused" ? "Resume" : `Start ${modeLabel(pomo.mode).toLowerCase()}`;

  const size = 300;
  const stroke = 6;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="focus-page">
      <section
        ref={stageRef}
        className={cx("focus-stage", `atmo-${atmosphere}`, isBreak && "is-break", pomo.running && "is-running", immersive && "is-immersive")}
        aria-label="Focus timer"
      >
        <div className="focus-stage__top">
          <div className="segmented segmented--glass" role="radiogroup" aria-label="Timer mode">
            {MODES.map(m => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={pomo.mode === m}
                disabled={pomo.running || pomo.phase === "paused"}
                onClick={() => pomo.setMode(m)}
                title={pomo.running || pomo.phase === "paused" ? "Reset the timer to switch modes" : undefined}
              >
                {modeLabel(m)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--icon focus-stage__immersive"
            onClick={immersive ? exitImmersive : enterImmersive}
            aria-label={immersive ? "Exit distraction-free mode" : "Distraction-free mode"}
            title={immersive ? "Exit (Esc)" : "Distraction-free mode"}
          >
            {immersive ? <Minimize2 size={18} aria-hidden /> : <Maximize2 size={18} aria-hidden />}
          </button>
        </div>

        <div className="focus-orbit" style={{ "--orbit-size": `${size}px` } as React.CSSProperties}>
          <svg className="focus-orbit__svg" viewBox={`0 0 ${size} ${size}`} aria-hidden focusable="false">
            <defs>
              <linearGradient id="orbit-grad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="var(--orbit-a)" />
                <stop offset="1" stopColor="var(--orbit-b)" />
              </linearGradient>
            </defs>
            <circle className="focus-orbit__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
            <circle
              className="focus-orbit__value"
              cx={size / 2}
              cy={size / 2}
              r={r}
              strokeWidth={stroke}
              fill="none"
              stroke="url(#orbit-grad)"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - frac)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
            <g transform={`rotate(${frac * 360 - 90} ${size / 2} ${size / 2})`}>
              <circle className="focus-orbit__star" cx={size / 2 + r} cy={size / 2} r={stroke * 0.9} />
            </g>
          </svg>
          <div className="focus-orbit__center">
            <p className="focus-orbit__mode">{modeLabel(pomo.mode)}</p>
            <p className="focus-orbit__time tabular" role="timer" aria-live="off">
              {formatPomodoroMs(pomo.remainingMs)}
            </p>
            <div className="cycle-dots" aria-label={`Session ${cyclePos + (isBreak ? 0 : 1)} of ${pomo.settings.cyclesBeforeLong} before a long break`}>
              {Array.from({ length: pomo.settings.cyclesBeforeLong }, (_, i) => (
                <span key={i} className={cx("cycle-dots__dot", i < cyclePos && "is-done")} />
              ))}
            </div>
          </div>
        </div>
        {/* Announce state changes, not every second. */}
        <p className="visually-hidden" aria-live="polite">
          {pomo.running ? `${modeLabel(pomo.mode)} running` : pomo.phase === "paused" ? "Paused" : "Timer ready"}
        </p>

        <div className="focus-stage__task">
          {linked ? (
            <p>
              <span className="focus-stage__task-label">Focusing on</span>
              <span className="focus-stage__task-title">{linked.title}</span>
            </p>
          ) : (
            <p className="focus-stage__task-label">{isBreak ? "Rest your eyes. Step away from the screen." : "Pick a task below, or just begin."}</p>
          )}
        </div>

        <div className="focus-controls">
          <button type="button" className="focus-controls__secondary" onClick={pomo.reset} aria-label="Reset timer" title="Reset">
            <RotateCcw size={18} aria-hidden />
          </button>
          <button type="button" className="focus-controls__primary" onClick={primary} aria-label={primaryLabel}>
            {pomo.running ? <Pause size={26} aria-hidden /> : <Play size={26} aria-hidden className="play-nudge" />}
          </button>
          <button type="button" className="focus-controls__secondary" onClick={pomo.skip} aria-label={isBreak ? "Skip break" : "Skip to break"} title={isBreak ? "Skip break" : "Skip to break"}>
            <SkipForward size={18} aria-hidden />
          </button>
        </div>
        <p className="focus-stage__hint">
          <kbd>Space</kbd> start / pause
        </p>
      </section>

      <div className="focus-side">
        <section className="card">
          <div className="card__header">
            <h2 className="card__title">What are you focusing on?</h2>
          </div>
          <div className="card__body stack">
            <div className="field">
              <label className="label" htmlFor={taskSelectId}>
                Linked task
              </label>
              <select id={taskSelectId} className="select" value={linked?.id ?? ""} onChange={e => setPrefs({ activeTaskId: e.target.value || null })}>
                <option value="">No task. Just focus.</option>
                {openTasks.map(t => (
                  <option key={t.id} value={t.id}>
                    {PRIORITY_META[t.priority].label} · {t.title}
                  </option>
                ))}
              </select>
              <span className="hint">Completed sessions count toward this task and its goal.</span>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <h2 className="card__title">Today</h2>
            <span className="subtle tabular">
              {formatDuration(today.ms)} · {today.sessions} {today.sessions === 1 ? "session" : "sessions"}
            </span>
          </div>
          <div className="card__body">
            <div className="week-bars" role="img" aria-label={`Focus time for the last 7 days: ${week.map(d => `${d.date.toLocaleDateString(undefined, { weekday: "short" })} ${formatDuration(d.ms)}`).join(", ")}`}>
              {week.map((d, i) => (
                <div key={i} className={cx("week-bars__col", i === week.length - 1 && "is-today")}>
                  <div className="week-bars__track">
                    <div className="week-bars__bar" style={{ height: `${Math.max(d.ms ? 6 : 0, (d.ms / weekMax) * 100)}%` }} />
                  </div>
                  <span className="week-bars__label">{d.date.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
                </div>
              ))}
            </div>
            {todaySessions.length > 0 && (
              <ul role="list" className="session-list">
                {todaySessions.map(s => {
                  const task = s.taskId ? tasks.find(t => t.id === s.taskId) : undefined;
                  return (
                    <li key={s.id}>
                      <span className="tabular subtle">{formatClock(s.endedAt)}</span>
                      <span className="session-list__title">{task?.title ?? "Unlinked focus"}</span>
                      <span className="tabular">{formatDuration(s.focusedMs)}</span>
                      {!s.completed && <span className="chip">Ended early</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <AmbientCard />
        <TimerSettingsCard atmosphere={atmosphere} setAtmosphere={a => (setAtmosphere(a), localStorage.setItem(ATMOSPHERE_KEY, a))} />
      </div>
    </div>
  );
};

const NOISES: Array<{ id: NoiseKind; label: string }> = [
  { id: "brown", label: "Brown" },
  { id: "pink", label: "Pink" },
  { id: "white", label: "White" },
];

const AmbientCard: React.FC = () => {
  const { kind, volume } = useAmbient();
  const volId = useId();
  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">{kind ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />} Ambient sound</h2>
      </div>
      <div className="card__body stack">
        <div className="segmented" role="radiogroup" aria-label="Ambient sound">
          <button type="button" role="radio" aria-checked={!kind} onClick={stopNoise}>
            Off
          </button>
          {NOISES.map(n => (
            <button key={n.id} type="button" role="radio" aria-checked={kind === n.id} onClick={() => playNoise(n.id)}>
              {n.label}
            </button>
          ))}
        </div>
        <div className="field">
          <label className="label" htmlFor={volId}>
            Volume
          </label>
          <input id={volId} type="range" min={1} max={100} value={Math.round(volume * 100)} onChange={e => setNoiseVolume(Number(e.target.value) / 100)} className="range" />
        </div>
        <p className="hint">Generated on your device. Brown is deep and soft; white is bright and masks chatter best.</p>
      </div>
    </section>
  );
};

const TimerSettingsCard: React.FC<{ atmosphere: Atmosphere; setAtmosphere: (a: Atmosphere) => void }> = ({ atmosphere, setAtmosphere }) => {
  const { settings, setSettings } = usePomodoro();
  const { showToast } = useAppToast();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() => ("Notification" in window ? Notification.permission : "unsupported"));

  const num = (key: "focusMin" | "shortMin" | "longMin" | "cyclesBeforeLong", label: string, max: number) => (
    <div className="field">
      <label className="label" htmlFor={`set-${key}`}>
        {label}
      </label>
      <input
        id={`set-${key}`}
        type="number"
        inputMode="numeric"
        className="input tabular"
        min={1}
        max={max}
        value={settings[key]}
        onChange={e => {
          const v = Math.max(1, Math.min(max, Math.round(Number(e.target.value)) || 1));
          setSettings(s => ({ ...s, [key]: v }));
        }}
      />
    </div>
  );

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") {
      showToast("Notifications are blocked for this site. Allow them in your browser’s site settings.", { tone: "warning", durationMs: 10_000 });
      return;
    }
    const res = await Notification.requestPermission();
    setPerm(res);
    if (res === "granted") showToast("Notifications on. You’ll hear from AstraFocus when sessions end.", { tone: "success" });
  };

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Session settings</h2>
      </div>
      <div className="card__body stack">
        <div className="settings-grid">
          {num("focusMin", "Focus (min)", 180)}
          {num("shortMin", "Short break (min)", 60)}
          {num("longMin", "Long break (min)", 90)}
          {num("cyclesBeforeLong", "Sessions before long break", 12)}
        </div>
        <label className="switch">
          <input type="checkbox" checked={settings.autoStartNext} onChange={e => setSettings(s => ({ ...s, autoStartNext: e.target.checked }))} />
          Start the next focus session automatically after a break
        </label>
        <div className="row row--wrap">
          {perm === "granted" ? (
            <span className="chip chip--success">
              <Bell size={12} aria-hidden /> Notifications on
            </span>
          ) : (
            <button type="button" className="btn btn--sm" onClick={enableNotifications} disabled={perm === "unsupported"}>
              <BellOff size={14} aria-hidden /> {perm === "unsupported" ? "Notifications unsupported" : "Enable notifications"}
            </button>
          )}
        </div>
        <div className="field">
          <span className="label" id="atmo-label">
            Atmosphere
          </span>
          <div className="atmo-picker" role="radiogroup" aria-labelledby="atmo-label">
            {ATMOSPHERES.map(a => (
              <button key={a.id} type="button" role="radio" aria-checked={atmosphere === a.id} className={cx("atmo-swatch", `atmo-${a.id}`)} onClick={() => setAtmosphere(a.id)}>
                <span className="atmo-swatch__preview" aria-hidden />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
