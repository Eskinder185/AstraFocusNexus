import React, { useEffect, useState } from "react";
import {
  formatPomodoroMs,
  modeLabel,
  usePomodoro,
} from "../context/PomodoroContext";
import { useAppToast } from "../context/AppToast";
import { tryNotify } from "../utils/pomodoroEffects";

/**
 * Full Pomodoro UI for the /focus page only.
 */
const PomodoroFocusPanel: React.FC = () => {
  const { showToast } = useAppToast();
  const {
    linkedTaskTitle,
    settings,
    setSettings,
    mode,
    setMode,
    phase,
    cycle,
    remainingMs,
    segmentDurationMs,
    running,
    start,
    resume,
    pause,
    reset,
    skip,
  } = usePomodoro();

  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (!("Notification" in window)) setPerm("unsupported");
    else setPerm(Notification.permission);
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      showToast("This browser doesn’t support notifications.", { tone: "warning" });
      return;
    }
    if (Notification.permission === "denied") {
      setPerm("denied");
      showToast(
        "Notifications are blocked. Allow them in site settings for this page, then try the bell again.",
        { tone: "warning", durationMs: 12_000 }
      );
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setPerm(res);
      if (res !== "granted") {
        showToast("Notifications weren’t enabled.", { tone: "warning" });
      } else {
        await tryNotify("Notifications enabled", "You'll get alerts at start and end.");
      }
    } catch {
      showToast("Couldn’t request notifications. Check browser settings.", { tone: "warning" });
    }
  };

  const denom = Math.max(1, segmentDurationMs);
  const frac = Math.max(0, Math.min(1, remainingMs / denom));

  return (
    <div className="pomodoro pomodoro--panel">
      <div className="pomodoro__topbar">
        <div className="pomodoro__modes" role="tablist" aria-label="Timer mode">
          {(["focus", "short", "long"] as const).map(m => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              disabled={running}
              className={`pill pill--mode ${mode === m ? "active" : ""}`}
              onClick={() => setMode(m)}
            >
              {modeLabel(m)}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="pill pomodoro__notify"
          onClick={requestPermission}
          title="Enable notifications for session start and end"
          disabled={perm === "unsupported"}
          aria-label={perm === "granted" ? "Notifications on" : "Enable notifications"}
        >
          <span aria-hidden>{perm === "granted" ? "🔔" : "🔕"}</span>
          <span className="pomodoro__notify-label">{perm === "granted" ? "Alerts on" : "Alerts"}</span>
        </button>
      </div>

      {linkedTaskTitle ? (
        <div className="pomodoro__task pomodoro__task--chip" title="Linked task">
          <span className="pomodoro__task-label">Focus on</span>
          <span className="pomodoro__task-title">{linkedTaskTitle}</span>
        </div>
      ) : (
        <p className="pomodoro__task-hint">
          Link a task from <strong>Home</strong> with <strong>🎯 Focus</strong> so completed pomodoros count toward it.
        </p>
      )}

      <div className="pomodoro__timer-row">
        <div className="pomodoro__timer" aria-live="polite" aria-label="Time remaining">
          <svg className="pomo-ring" width="120" height="120" viewBox="0 0 120 120" aria-hidden>
            {(() => {
              const r = 52;
              const cx = 60;
              const cy = 60;
              const c = 2 * Math.PI * r;
              const off = c * frac;
              return (
                <g>
                  <circle className="ring-bg" cx={cx} cy={cy} r={r} />
                  <circle
                    className="ring-fg"
                    cx={cx}
                    cy={cy}
                    r={r}
                    style={{ strokeDasharray: `${c}px`, strokeDashoffset: `${off}px` }}
                  />
                </g>
              );
            })()}
          </svg>
          <div className="pomo-time">{formatPomodoroMs(remainingMs)}</div>
        </div>

        <div className="pomodoro__side">
          <div className="pomodoro__controls">
            {!running ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => (phase === "paused" ? resume() : start())}
              >
                {phase === "paused" ? "Resume" : "Start"}
              </button>
            ) : (
              <button type="button" className="btn btn--secondary" onClick={pause}>
                Pause
              </button>
            )}
            <button type="button" className="btn btn--secondary" onClick={reset}>
              Reset
            </button>
            <button type="button" className="btn btn--secondary" onClick={skip}>
              Skip
            </button>
          </div>

          <details className="pomodoro__settings">
            <summary>Timer settings</summary>
            <div className="grid2">
              <label>
                Focus (min)
                <input
                  type="number"
                  min={1}
                  value={settings.focusMin}
                  onChange={e => setSettings(s => ({ ...s, focusMin: +e.target.value || 1 }))}
                />
              </label>
              <label>
                Short break (min)
                <input
                  type="number"
                  min={1}
                  value={settings.shortMin}
                  onChange={e => setSettings(s => ({ ...s, shortMin: +e.target.value || 1 }))}
                />
              </label>
              <label>
                Long break (min)
                <input
                  type="number"
                  min={1}
                  value={settings.longMin}
                  onChange={e => setSettings(s => ({ ...s, longMin: +e.target.value || 1 }))}
                />
              </label>
              <label>
                Cycles before long
                <input
                  type="number"
                  min={1}
                  value={settings.cyclesBeforeLong}
                  onChange={e =>
                    setSettings(s => ({
                      ...s,
                      cyclesBeforeLong: Math.max(1, +e.target.value || 1),
                    }))
                  }
                />
              </label>
              <label className="rowFlex">
                <input
                  type="checkbox"
                  checked={settings.autoStartNext}
                  onChange={e => setSettings(s => ({ ...s, autoStartNext: e.target.checked }))}
                />
                Auto-start next
              </label>
              <div className="muted pomodoro__cycle-note">
                Focus sessions this block: <strong>{cycle}</strong>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default PomodoroFocusPanel;
