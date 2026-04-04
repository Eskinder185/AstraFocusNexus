import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  formatPomodoroMs,
  modeLabel,
  usePomodoro,
} from "../context/PomodoroContext";

/**
 * Compact floating controls while a session is running or paused (hidden on /focus).
 */
const MiniPomodoroBar: React.FC = () => {
  const location = useLocation();
  const {
    showMiniTimer,
    mode,
    running,
    remainingMs,
    linkedTaskTitle,
    pause,
    resume,
  } = usePomodoro();

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick(t => t + 1), 500);
    return () => window.clearInterval(id);
  }, [running]);

  if (location.pathname === "/focus" || !showMiniTimer) return null;

  const displayRemaining =
    running && remainingMs >= 0 ? Math.max(0, remainingMs) : remainingMs;

  return (
    <div
      className="pomo-mini"
      role="region"
      aria-label="Pomodoro session"
    >
      <div className="pomo-mini__main">
        <span className="pomo-mini__mode">{modeLabel(mode)}</span>
        <time
          className="pomo-mini__time"
          dateTime={`PT${Math.ceil(displayRemaining / 1000)}S`}
        >
          {formatPomodoroMs(displayRemaining)}
        </time>
        {linkedTaskTitle ? (
          <span className="pomo-mini__task" title={linkedTaskTitle}>
            {linkedTaskTitle.length > 28 ? `${linkedTaskTitle.slice(0, 26)}…` : linkedTaskTitle}
          </span>
        ) : null}
      </div>
      <div className="pomo-mini__actions">
        {running ? (
          <button type="button" className="pomo-mini__btn" onClick={pause} aria-label="Pause timer">
            Pause
          </button>
        ) : (
          <button type="button" className="pomo-mini__btn" onClick={resume} aria-label="Resume timer">
            Resume
          </button>
        )}
        <Link to="/focus" className="pomo-mini__link">
          Open Focus
        </Link>
      </div>
    </div>
  );
};

export default MiniPomodoroBar;
