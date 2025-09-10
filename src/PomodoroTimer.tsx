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

/** Try web notification; returns true if a notification was shown */
async function tryNotify(title: string, body: string) {
  if (!("Notification" in window)) return false;
  // If user hasn't decided yet, politely ask
  if (Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch {}
  }
  if (Notification.permission === "granted") {
    try { new Notification(title, { body, tag: "pomodoro-complete" }); return true; } catch {}
  }
  return false;
}

// --- Secondary alert methods (work even if notifications are blocked) ---
function playChime(audioRef: React.MutableRefObject<HTMLAudioElement | null>) {
  const a = audioRef.current;
  if (a) {
    a.currentTime = 0;
    a.volume = 1;
    a.play().catch(() => {
      // fallback: simple beep
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = 880;
        osc.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.03);
        osc.start();
        setTimeout(() => {
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
          osc.stop(ctx.currentTime + 0.27);
        }, 230);
      } catch {}
    });
  }
}
function vibrate() {
  if ("vibrate" in navigator) {
    try { navigator.vibrate([200, 100, 200]); } catch {}
  }
}
function flashTitleStart(store: React.MutableRefObject<string>, handle: React.MutableRefObject<number | null>) {
  if (handle.current) return;
  store.current = document.title;
  let on = false;
  handle.current = window.setInterval(() => {
    on = !on;
    document.title = on ? "⏰ Pomodoro done!" : store.current;
  }, 800) as unknown as number;
}
function flashTitleStop(store: React.MutableRefObject<string>, handle: React.MutableRefObject<number | null>) {
  if (handle.current) {
    window.clearInterval(handle.current);
    handle.current = null;
    document.title = store.current || document.title;
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
  const [remaining, setRemaining] = useState<number>(settings.focusMin * 60_000);
  const [cycle, setCycle] = useState<number>(0); // completed focus sessions in current block

  // permission/bell state
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  // refs for secondary alerts
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const originalTitleRef = useRef<string>(document.title);
  const flasherRef = useRef<number | null>(null);

  // persist settings
  useEffect(() => {
    localStorage.setItem("pomodoro.settings", JSON.stringify(settings));
  }, [settings]);

  // init notification permission + tiny inline chime
  useEffect(() => {
    if (!("Notification" in window)) setPerm("unsupported");
    else setPerm(Notification.permission);

    // tiny inline WAV so it works offline
    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAACAAAAPGZmZmZmZmZm"
    );
  }, []);

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
    if (!running || endAt == null) return;

    const id = window.setInterval(() => {
      const now = Date.now();
      const left = endAt - now;
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(id);
        setRunning(false);
        setRemaining(0);

        // session complete
        (async () => {
          if (mode === "focus") {
            // 1) Web notification (if allowed)
            const title = "Focus complete ✅";
            const body = activeTaskTitle ? `Task: ${activeTaskTitle}` : "Take a break!";
            const shown = await tryNotify(title, body);

            // 2) Secondary alerts (always try)
            playChime(audioRef);
            vibrate();
            flashTitleStart(originalTitleRef, flasherRef);
            // auto stop flashing after 20s
            window.setTimeout(() => flashTitleStop(originalTitleRef, flasherRef), 20_000);

            // callback to parent
            onFocusComplete?.();

            // choose next mode
            const nextMode =
              (cycle + 1) % settings.cyclesBeforeLong === 0 ? "long" : "short";
            setCycle((c) => c + 1);
            setMode(nextMode);

            // prepare next session
            const nextDur = (nextMode === "long" ? settings.longMin : settings.shortMin) * 60_000;
            setRemaining(nextDur);
            if (settings.autoStartNext) start(nextDur);
          } else {
            // Break finished
            const title = mode === "short" ? "Short break over ☕" : "Long break over 🌿";
            await tryNotify(title, "Time to focus again!");
            playChime(audioRef);
            vibrate();
            flashTitleStart(originalTitleRef, flasherRef);
            window.setTimeout(() => flashTitleStop(originalTitleRef, flasherRef), 20_000);

            setMode("focus");
            const nextDur = settings.focusMin * 60_000;
            setRemaining(nextDur);
            if (settings.autoStartNext) start(nextDur);
          }
        })();
      }
    }, 250);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, endAt, mode, settings, cycle, activeTaskTitle]);

  const start = (dur = durationMs) => {
    // If user hasn't made a choice yet, ask once they start
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((p) => setPerm(p));
    }
    flashTitleStop(originalTitleRef, flasherRef); // clear any previous flashing
    setEndAt(Date.now() + dur);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setEndAt(null);
    setRemaining(durationMs);
    flashTitleStop(originalTitleRef, flasherRef);
  };
  const skip = () => {
    // force-complete current mode
    setRunning(false);
    setRemaining(0);
    flashTitleStop(originalTitleRef, flasherRef);

    if (mode === "focus") {
      setCycle((c) => c + 1);
      onFocusComplete?.();
      const next = (cycle + 1) % settings.cyclesBeforeLong === 0 ? "long" : "short";
      setMode(next);
    } else {
      setMode("focus");
    }
    setTimeout(() => {
      if (settings.autoStartNext) start();
      else reset();
    }, 0);
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) return alert("Notifications not supported.");
    try {
      const res = await Notification.requestPermission();
      setPerm(res);
      if (res !== "granted") alert("Notifications denied.");
    } catch {
      alert("Could not request notifications.");
    }
  };

  return (
    <div className="pomodoro">
      {/* hidden audio for chime */}
      <audio ref={audioRef} style={{ display: "none" }} />

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
                flashTitleStop(originalTitleRef, flasherRef);
              }}
            >
              {m === "focus" ? "Focus" : m === "short" ? "Short" : "Long"}
            </button>
          ))}
        </div>

        {/* Bell shows state: 🔕 (not granted) / 🔔 (granted) */}
        <button className="pill" onClick={requestPermission} title="Enable notifications">
          {perm === "granted" ? "🔔" : "🔕"}
        </button>
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
