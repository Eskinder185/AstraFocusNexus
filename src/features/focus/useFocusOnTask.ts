import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePomodoro } from "../../context/PomodoroContext";
import { useWorkspaceActions } from "../workspace/WorkspaceProvider";

/**
 * Links a task to the focus timer and opens Focus Studio. Starts a focus segment when
 * the timer is idle; never interrupts a running or paused session.
 */
export function useFocusOnTask() {
  const { setPrefs } = useWorkspaceActions();
  const { phase, mode, setMode, start, showBreakModal } = usePomodoro();
  const navigate = useNavigate();

  return useCallback(
    (taskId: string, opts: { autoStart?: boolean } = {}) => {
      setPrefs({ activeTaskId: taskId });
      if (opts.autoStart !== false && phase === "idle" && !showBreakModal) {
        if (mode !== "focus") setMode("focus");
        // setMode resets state synchronously via setState; start on the next tick so it uses the focus duration.
        window.setTimeout(() => start(), 0);
      }
      navigate("/focus");
    },
    [setPrefs, phase, mode, setMode, start, showBreakModal, navigate]
  );
}
