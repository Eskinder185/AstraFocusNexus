import React, { useEffect, useMemo, useRef, useState } from "react";

type Mode = "focus" | "short" | "long";

export interface PomodoroSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  cyclesBeforeLong: number;
  autoStartNext: boolean;
}

const DEFAULTS: PomodoroSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  cyclesBeforeLong: 4,
  autoStartNext: true,
};

function format(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function notify(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

type Props = {
  activeTaskTitle?: string;
  onFocusComplete?: () => void; // called when a focus session completes
};

const PomodoroTimer: React.FC<Props> = ({ activeTaskTitle, onFocusComplete }) => {
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const raw = localStorage.getItem("pomodoro.settings");
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  // session state
  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(
    settings.focusMin * 60_000
  );
  const [cycle, setCycle] = useState<number>(0); // completed focus sessions in current block

  // persist settings
  useEffect(() => {
    localStorage.setItem("pomodoro.settings", JSON.stringify(settings));
  }, [settings]);

  // compute target duration for current mode
  const durationMs = useMemo(() => {
    if (mode === "focus") return settings.focusMin * 60_000;
    if (mode === "short") return settings.shortMin * 60_000;
    return settings.longMin * 60_000;
  }, [mode, settings]);

  // keep remaining in sync when mode/duration changes (if not running)
  useEffect(() => {
    if (!running) setRemaining(durationMs);
  }, [durationMs, running]);

  // main ticker
  useEffect(() => {
    if (!running) return;
    if (endAt == null) return;

    const id = window.setInterval(() => {
      const now = Date.now();
      const left = endAt - now;
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(id);
        setRunning(false);
        setRemaining(0);

        // session complete
        if (mode === "focus") {
          notify("Focus complete ✅", activeTaskTitle ? `Task: ${activeTaskTitle}` : "Take a break!");
          setCycle((c) => c + 1);
          onFocusComplete?.();
          // choose next mode
          const nextMode =
            (cycle + 1) % settings.cyclesBeforeLong === 0 ? "long" : "short";
          setMode(nextMode);
        } else {
          notify(
            mode === "short" ? "Short break over ☕" : "Long break over 🌿",
            "Time to focus again!"
          );
          setMode("focus");
        }

        // prepare next session
        const nextDur =
          mode === "focus"
            ? (( (cycle + 1) % settings.cyclesBeforeLong === 0 ) ? settings.longMin : settings.shortMin) * 60_000
            : settings.focusMin * 60_000;

        setRemaining(nextDur);
        if (settings.autoStartNext) start(nextDur);
      }
    }, 250);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, endAt, mode, settings, cycle, activeTaskTitle]);

  const start = (dur = durationMs) => {
    setEndAt(Date.now() + dur);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setEndAt(null);
    setRemaining(durationMs);
  };
  const skip = () => {
    // force-complete current mode
    setRunning(false);
    setRemaining(0);
    if (mode === "focus") {
      setCycle((c) => c + 1);
      onFocusComplete?.();
      setMode((cycle + 1) % settings.cyclesBeforeLong === 0 ? "long" : "short");
    } else {
      setMode("focus");
    }
    setTimeout(() => {
      // prepare next session time
      if (settings.autoStartNext) start();
      else reset();
    }, 0);
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) return alert("Notifications not supported.");
    const res = await Notification.requestPermission();
    if (res !== "granted") alert("Notifications denied.");
  };

  return (
    <div className="pomodoro">
      <div className="pomodoro__head">
        <div className="pomodoro__modes">
          {(["focus", "short", "long"] as Mode[]).map((m) => (
            <button
              key={m}
              className={`pill ${mode === m ? "active" : ""}`}
              onClick={() => {
                setMode(m);
                setRunning(false);
                setEndAt(null);
              }}
            >
              {m === "focus" ? "Focus" : m === "short" ? "Short" : "Long"}
            </button>
          ))}
        </div>

        <button className="pill" onClick={requestPermission}>🔔</button>
      </div>

      {activeTaskTitle && (
        <div className="pomodoro__task" title="Active task">
          🎯 {activeTaskTitle}
        </div>
      )}

      <div className="pomodoro__timer">{format(remaining)}</div>

      <div className="pomodoro__controls">
        {!running ? (
          <button className="btn" onClick={() => start()}>Start</button>
        ) : (
          <button className="btn" onClick={pause}>Pause</button>
        )}
        <button className="btn" onClick={reset}>Reset</button>
        <button className="btn" onClick={skip}>Skip</button>
      </div>

      <details className="pomodoro__settings">
        <summary>Settings</summary>
        <div className="grid2">
          <label>Focus (min)
            <input type="number" min={1}
              value={settings.focusMin}
              onChange={(e) => setSettings(s => ({...s, focusMin: +e.target.value || 1}))}/>
          </label>
          <label>Short break (min)
            <input type="number" min={1}
              value={settings.shortMin}
              onChange={(e) => setSettings(s => ({...s, shortMin: +e.target.value || 1}))}/>
          </label>
          <label>Long break (min)
            <input type="number" min={1}
              value={settings.longMin}
              onChange={(e) => setSettings(s => ({...s, longMin: +e.target.value || 1}))}/>
          </label>
          <label>Cycles before long
            <input type="number" min={1}
              value={settings.cyclesBeforeLong}
              onChange={(e) => setSettings(s => ({...s, cyclesBeforeLong: Math.max(1, +e.target.value || 1)}))}/>
          </label>
          <label className="rowFlex">
            <input type="checkbox"
              checked={settings.autoStartNext}
              onChange={(e) => setSettings(s => ({...s, autoStartNext: e.target.checked}))}/>
              Auto-start next
          </label>
          <div className="muted">Completed in block: {cycle}</div>
        </div>
      </details>
    </div>
  );
};

export default PomodoroTimer;
