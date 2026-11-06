import React from "react";
import { Link } from "react-router-dom";
import { Pause, Play } from "lucide-react";
import { formatPomodoroMs, modeLabel, usePomodoro } from "../../context/PomodoroContext";
import { cx } from "../../lib/cx";

/** Compact live timer shown in the top bar whenever a session is running or paused. */
export const TimerPill: React.FC = () => {
  const { showMiniTimer, running, mode, remainingMs, pause, resume, segmentDurationMs } = usePomodoro();
  if (!showMiniTimer) return null;
  const frac = 1 - remainingMs / Math.max(1, segmentDurationMs);
  return (
    <div className={cx("timer-pill", mode !== "focus" && "timer-pill--break", !running && "is-paused")}>
      <Link to="/focus" className="timer-pill__link" aria-label={`${modeLabel(mode)}, ${formatPomodoroMs(remainingMs)} remaining${running ? "" : ", paused"}. Open Focus Studio`}>
        <span className="timer-pill__ring" style={{ "--p": frac } as React.CSSProperties} aria-hidden />
        <span className="timer-pill__time tabular" aria-hidden>
          {formatPomodoroMs(remainingMs)}
        </span>
      </Link>
      <button
        type="button"
        className="timer-pill__btn"
        onClick={running ? pause : resume}
        aria-label={running ? "Pause timer" : "Resume timer"}
      >
        {running ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
      </button>
    </div>
  );
};
