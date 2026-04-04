import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import BreakSuggestions from "../BreakSuggestions";
import { useAppToast } from "./AppToast";
import {
  flashTitleStop,
  playChime,
  startTitleFlash,
  tryNotify,
  vibrate,
} from "../utils/pomodoroEffects";

export type PomodoroMode = "focus" | "short" | "long";

export interface PomodoroSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  cyclesBeforeLong: number;
  autoStartNext: boolean;
}

export const POMODORO_DEFAULTS: PomodoroSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  cyclesBeforeLong: 4,
  autoStartNext: true,
};

const SETTINGS_KEY = "pomodoro.settings";
const RUNTIME_KEY = "pomodoro.session.v1";

type Phase = "idle" | "running" | "paused";

interface RuntimePersist {
  v: 1;
  mode: PomodoroMode;
  cycle: number;
  phase: Phase;
  endAt: number | null;
  pausedRemainingMs: number | null;
  segmentDurationMs: number;
  breakModalOpen: boolean;
}

function loadSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...POMODORO_DEFAULTS };
    return { ...POMODORO_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...POMODORO_DEFAULTS };
  }
}

export function durationForMode(mode: PomodoroMode, s: PomodoroSettings): number {
  if (mode === "focus") return s.focusMin * 60_000;
  if (mode === "short") return s.shortMin * 60_000;
  return s.longMin * 60_000;
}

export function formatPomodoroMs(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function modeLabel(mode: PomodoroMode) {
  if (mode === "focus") return "Focus";
  if (mode === "short") return "Short break";
  return "Long break";
}

interface PomodoroContextValue {
  /** Task title from Home 🎯 Focus (for display + notifications) */
  linkedTaskTitle: string | null;
  settings: PomodoroSettings;
  setSettings: React.Dispatch<React.SetStateAction<PomodoroSettings>>;
  mode: PomodoroMode;
  setMode: (m: PomodoroMode) => void;
  phase: Phase;
  cycle: number;
  remainingMs: number;
  segmentDurationMs: number;
  running: boolean;
  showBreakModal: boolean;
  breakModalClosing: boolean;
  start: (durMs?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  quickStartFocus: (minutes?: number) => void;
  confirmStartBreak: () => void;
  confirmSkipBreak: () => void;
  setBreakModalClosing: (v: boolean) => void;
  setShowBreakModal: (v: boolean) => void;
  showMiniTimer: boolean;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

interface ProviderProps {
  children: React.ReactNode;
  activeTaskTitle?: string | null;
  onFocusComplete?: () => void;
  onRunningChange?: (running: boolean) => void;
}

export const PomodoroProvider: React.FC<ProviderProps> = ({
  children,
  activeTaskTitle = null,
  onFocusComplete,
  onRunningChange,
}) => {
  const { showToast } = useAppToast();
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings);
  const [mode, setModeState] = useState<PomodoroMode>("focus");
  const [phase, setPhase] = useState<Phase>("idle");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [pausedRemainingMs, setPausedRemainingMs] = useState<number | null>(null);
  const [segmentDurationMs, setSegmentDurationMs] = useState(() =>
    durationForMode("focus", loadSettings())
  );
  const [cycle, setCycle] = useState(0);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakModalClosing, setBreakModalClosing] = useState(false);
  const [tick, setTick] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const originalTitleRef = useRef(document.title);
  const flasherRef = useRef<number | null>(null);
  const nextModeAfterBreakRef = useRef<PomodoroMode>("short");
  const nextDurAfterBreakRef = useRef(0);
  const endingRef = useRef(false);

  const modeRef = useRef(mode);
  const cycleRef = useRef(cycle);
  const settingsRef = useRef(settings);
  const activeTaskTitleRef = useRef(activeTaskTitle);
  const onFocusCompleteRef = useRef(onFocusComplete);
  const onRunningChangeRef = useRef(onRunningChange);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    cycleRef.current = cycle;
  }, [cycle]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    activeTaskTitleRef.current = activeTaskTitle;
  }, [activeTaskTitle]);
  useEffect(() => {
    onFocusCompleteRef.current = onFocusComplete;
  }, [onFocusComplete]);
  useEffect(() => {
    onRunningChangeRef.current = onRunningChange;
  }, [onRunningChange]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const persistRuntime = useCallback(() => {
    const snap: RuntimePersist = {
      v: 1,
      mode,
      cycle,
      phase,
      endAt,
      pausedRemainingMs,
      segmentDurationMs,
      breakModalOpen: showBreakModal,
    };
    try {
      localStorage.setItem(RUNTIME_KEY, JSON.stringify(snap));
    } catch {}
  }, [mode, cycle, phase, endAt, pausedRemainingMs, segmentDurationMs, showBreakModal]);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RUNTIME_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as RuntimePersist;
      if (p.v !== 1) return;
      setModeState(p.mode);
      setCycle(p.cycle);
      setSegmentDurationMs(p.segmentDurationMs);
      setShowBreakModal(!!p.breakModalOpen);

      if (p.phase === "running" && p.endAt != null) {
        const now = Date.now();
        if (p.endAt > now) {
          setEndAt(p.endAt);
          setPhase("running");
          setPausedRemainingMs(null);
          onRunningChangeRef.current?.(true);
        } else {
          showToast("A focus or break timer finished while you were away. Check the Focus page to continue.", {
            durationMs: 10_000,
          });
          setPhase("idle");
          setEndAt(null);
          setPausedRemainingMs(null);
          const s = settingsRef.current;
          const d = durationForMode(p.mode, s);
          setSegmentDurationMs(d);
          setShowBreakModal(false);
          onRunningChangeRef.current?.(false);
        }
      } else {
        setPhase(p.phase);
        setEndAt(p.endAt);
        setPausedRemainingMs(p.pausedRemainingMs);
        const runningNow = p.phase === "running" && p.endAt != null && p.endAt > Date.now();
        if (p.phase === "running" && p.endAt != null && p.endAt <= Date.now()) {
          setPhase("idle");
          setEndAt(null);
        }
        onRunningChangeRef.current?.(!!runningNow);
      }
    } catch {
      /* ignore corrupt snapshot */
    } finally {
      setHydrated(true);
    }
  }, [showToast]);

  useEffect(() => {
    if (!hydrated) return;
    persistRuntime();
  }, [hydrated, persistRuntime]);

  const durationMs = useMemo(() => durationForMode(mode, settings), [mode, settings]);

  const remainingMs = useMemo(() => {
    if (phase === "running" && endAt != null) {
      void tick;
      return Math.max(0, endAt - Date.now());
    }
    if (pausedRemainingMs != null && phase !== "running") {
      return Math.max(0, pausedRemainingMs);
    }
    return durationMs;
  }, [phase, endAt, pausedRemainingMs, durationMs, tick]);

  const running = phase === "running";

  const finishFocusSegment = useCallback(async () => {
    const s = settingsRef.current;
    const title = "Focus complete ✅";
    const body = activeTaskTitleRef.current ? `Task: ${activeTaskTitleRef.current}` : "Take a break!";
    await tryNotify(title, body);
    playChime(audioRef);
    vibrate();
    startTitleFlash(originalTitleRef, flasherRef);
    window.setTimeout(() => flashTitleStop(originalTitleRef, flasherRef), 20_000);
    onFocusCompleteRef.current?.();

    const nextCycle = cycleRef.current + 1;
    const nextMode: PomodoroMode =
      nextCycle % s.cyclesBeforeLong === 0 ? "long" : "short";
    const nextDur =
      (nextMode === "long" ? s.longMin : s.shortMin) * 60_000;

    setCycle(nextCycle);
    setModeState(nextMode);
    setSegmentDurationMs(nextDur);
    setPhase("idle");
    setEndAt(null);
    setPausedRemainingMs(nextDur);
    nextModeAfterBreakRef.current = nextMode;
    nextDurAfterBreakRef.current = nextDur;
    setShowBreakModal(true);
    onRunningChangeRef.current?.(false);
  }, []);

  const finishBreakSegment = useCallback(async () => {
    const m = modeRef.current;
    const s = settingsRef.current;
    const title =
      m === "short" ? "Short break over ☕" : "Long break over 🌿";
    await tryNotify(title, "Time to focus again!");
    playChime(audioRef);
    vibrate();
    startTitleFlash(originalTitleRef, flasherRef);
    window.setTimeout(() => flashTitleStop(originalTitleRef, flasherRef), 20_000);

    const focusDur = s.focusMin * 60_000;
    setModeState("focus");
    setSegmentDurationMs(focusDur);
    setPausedRemainingMs(focusDur);

    if (s.autoStartNext) {
      setEndAt(Date.now() + focusDur);
      setPhase("running");
      setPausedRemainingMs(null);
      onRunningChangeRef.current?.(true);
      void tryNotify(
        "Focus started",
        activeTaskTitleRef.current ? `Task: ${activeTaskTitleRef.current}` : ""
      );
    } else {
      setPhase("idle");
      setEndAt(null);
      onRunningChangeRef.current?.(false);
    }
  }, []);

  const handleSegmentEnd = useCallback(() => {
    if (endingRef.current) return;
    endingRef.current = true;
    const m = modeRef.current;
    setPhase("idle");
    setEndAt(null);
    if (m === "focus") {
      void finishFocusSegment().finally(() => {
        endingRef.current = false;
      });
    } else {
      void finishBreakSegment().finally(() => {
        endingRef.current = false;
      });
    }
  }, [finishFocusSegment, finishBreakSegment]);

  useEffect(() => {
    if (phase !== "running" || endAt == null) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now >= endAt!) {
        handleSegmentEnd();
      } else {
        setTick(t => t + 1);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, endAt, handleSegmentEnd]);

  useEffect(() => {
    try {
      if (audioRef.current) {
        audioRef.current.src =
          "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAACAAAAPGZmZmZmZmZm";
      }
    } catch {}
  }, []);

  const flashStop = useCallback(() => {
    flashTitleStop(originalTitleRef, flasherRef);
  }, []);

  const setMode = useCallback(
    (newMode: PomodoroMode) => {
      setModeState(newMode);
      setPhase("idle");
      setEndAt(null);
      const d = durationForMode(newMode, settingsRef.current);
      setPausedRemainingMs(null);
      setSegmentDurationMs(d);
      flashStop();
      onRunningChangeRef.current?.(false);
    },
    [flashStop]
  );

  const start = useCallback(
    (durMs?: number) => {
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
      flashStop();
      const dur = durationForMode(modeRef.current, settingsRef.current);
      const base =
        typeof durMs === "number" && durMs > 0
          ? durMs
          : phase === "paused" && pausedRemainingMs != null && pausedRemainingMs > 0
            ? pausedRemainingMs
            : dur;
      const ms = base > 0 ? base : dur;
      setSegmentDurationMs(ms);
      setEndAt(Date.now() + ms);
      setPhase("running");
      setPausedRemainingMs(null);
      onRunningChangeRef.current?.(true);
      const m = modeRef.current;
      const label =
        m === "focus"
          ? "Focus started"
          : m === "short"
            ? "Short break started"
            : "Long break started";
      void tryNotify(
        label,
        activeTaskTitleRef.current ? `Task: ${activeTaskTitleRef.current}` : ""
      );
    },
    [phase, pausedRemainingMs, flashStop]
  );

  const pause = useCallback(() => {
    if (phase !== "running" || endAt == null) return;
    const left = Math.max(0, endAt - Date.now());
    setPausedRemainingMs(left);
    setEndAt(null);
    setPhase("paused");
    onRunningChangeRef.current?.(false);
  }, [phase, endAt]);

  const resume = useCallback(() => {
    if (phase !== "paused" || pausedRemainingMs == null || pausedRemainingMs <= 0) return;
    setEndAt(Date.now() + pausedRemainingMs);
    setPhase("running");
    setPausedRemainingMs(null);
    onRunningChangeRef.current?.(true);
  }, [phase, pausedRemainingMs]);

  const reset = useCallback(() => {
    setPhase("idle");
    setEndAt(null);
    setShowBreakModal(false);
    setBreakModalClosing(false);
    const d = durationForMode(modeRef.current, settingsRef.current);
    setPausedRemainingMs(null);
    setSegmentDurationMs(d);
    flashStop();
    onRunningChangeRef.current?.(false);
  }, [flashStop]);

  const skip = useCallback(() => {
    flashStop();
    setPhase("idle");
    setEndAt(null);
    const s = settingsRef.current;
    const c = cycleRef.current;
    if (modeRef.current === "focus") {
      onFocusCompleteRef.current?.();
      const nextCycle = c + 1;
      const nextMode: PomodoroMode =
        nextCycle % s.cyclesBeforeLong === 0 ? "long" : "short";
      const nextDur =
        (nextMode === "long" ? s.longMin : s.shortMin) * 60_000;
      setCycle(nextCycle);
      setModeState(nextMode);
      setSegmentDurationMs(nextDur);
      setPausedRemainingMs(nextDur);
      nextModeAfterBreakRef.current = nextMode;
      nextDurAfterBreakRef.current = nextDur;
      setShowBreakModal(true);
      onRunningChangeRef.current?.(false);
    } else {
      const focusDur = s.focusMin * 60_000;
      setModeState("focus");
      setSegmentDurationMs(focusDur);
      if (s.autoStartNext) {
        setEndAt(Date.now() + focusDur);
        setPhase("running");
        setPausedRemainingMs(null);
        onRunningChangeRef.current?.(true);
      } else {
        setPausedRemainingMs(focusDur);
        onRunningChangeRef.current?.(false);
      }
    }
  }, [flashStop]);

  const quickStartFocus = useCallback(
    (minutes = 25) => {
      flashStop();
      setShowBreakModal(false);
      setBreakModalClosing(false);
      const ms = minutes * 60_000;
      setModeState("focus");
      setCycle(0);
      setSegmentDurationMs(ms);
      setPausedRemainingMs(null);
      setEndAt(Date.now() + ms);
      setPhase("running");
      onRunningChangeRef.current?.(true);
      void tryNotify(
        "Focus started",
        activeTaskTitleRef.current ? `Task: ${activeTaskTitleRef.current}` : ""
      );
    },
    [flashStop]
  );

  const confirmStartBreak = useCallback(() => {
    setBreakModalClosing(true);
    window.setTimeout(() => {
      setShowBreakModal(false);
      setBreakModalClosing(false);
      const m = nextModeAfterBreakRef.current;
      const d = nextDurAfterBreakRef.current;
      setModeState(m);
      setSegmentDurationMs(d);
      setEndAt(Date.now() + d);
      setPhase("running");
      setPausedRemainingMs(null);
      onRunningChangeRef.current?.(true);
      void tryNotify(m === "short" ? "Short break started" : "Long break started", "");
    }, 180);
  }, []);

  const confirmSkipBreak = useCallback(() => {
    setBreakModalClosing(true);
    window.setTimeout(() => {
      setShowBreakModal(false);
      setBreakModalClosing(false);
      const focusDur = settingsRef.current.focusMin * 60_000;
      setModeState("focus");
      setSegmentDurationMs(focusDur);
      setEndAt(Date.now() + focusDur);
      setPhase("running");
      setPausedRemainingMs(null);
      onRunningChangeRef.current?.(true);
      void tryNotify(
        "Focus started",
        activeTaskTitleRef.current ? `Task: ${activeTaskTitleRef.current}` : ""
      );
    }, 180);
  }, []);

  const showMiniTimer =
    phase === "running" ||
    (phase === "paused" && pausedRemainingMs != null && pausedRemainingMs > 0);

  const value: PomodoroContextValue = {
    linkedTaskTitle: activeTaskTitle ?? null,
    settings,
    setSettings,
    mode,
    setMode,
    phase,
    cycle,
    remainingMs,
    segmentDurationMs,
    running,
    showBreakModal,
    breakModalClosing,
    start,
    pause,
    resume,
    reset,
    skip,
    quickStartFocus,
    confirmStartBreak,
    confirmSkipBreak,
    setBreakModalClosing,
    setShowBreakModal,
    showMiniTimer,
  };

  return (
    <PomodoroContext.Provider value={value}>
      <audio ref={audioRef} style={{ display: "none" }} aria-hidden />
      {children}
      {showBreakModal && (
        <BreakSuggestions
          closing={breakModalClosing}
          onStartBreak={confirmStartBreak}
          onSkipBreak={confirmSkipBreak}
        />
      )}
    </PomodoroContext.Provider>
  );
};

export function usePomodoro(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro must be used within PomodoroProvider");
  return ctx;
}

export function usePomodoroOptional(): PomodoroContextValue | null {
  return useContext(PomodoroContext);
}
