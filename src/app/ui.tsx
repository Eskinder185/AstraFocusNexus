import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Priority } from "../features/workspace/schema";

export interface ComposerDefaults {
  title?: string;
  priority?: Priority;
  goalId?: string | null;
  dueDate?: string | null;
}

interface UIState {
  paletteOpen: boolean;
  composer: ComposerDefaults | null;
  taskId: string | null;
}

interface UIActions {
  openPalette(): void;
  closePalette(): void;
  openComposer(defaults?: ComposerDefaults): void;
  closeComposer(): void;
  openTask(id: string): void;
  closeTask(): void;
}

const StateCtx = createContext<UIState | null>(null);
const ActionsCtx = createContext<UIActions | null>(null);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paletteOpen, setPalette] = useState(false);
  const [composer, setComposer] = useState<ComposerDefaults | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const openPalette = useCallback(() => setPalette(true), []);
  const closePalette = useCallback(() => setPalette(false), []);
  const openComposer = useCallback((d: ComposerDefaults = {}) => {
    setPalette(false);
    setComposer(d);
  }, []);
  const closeComposer = useCallback(() => setComposer(null), []);
  const openTask = useCallback((id: string) => {
    setPalette(false);
    setTaskId(id);
  }, []);
  const closeTask = useCallback(() => setTaskId(null), []);

  const actions = useMemo(
    () => ({ openPalette, closePalette, openComposer, closeComposer, openTask, closeTask }),
    [openPalette, closePalette, openComposer, closeComposer, openTask, closeTask]
  );
  const state = useMemo(() => ({ paletteOpen, composer, taskId }), [paletteOpen, composer, taskId]);

  return (
    <ActionsCtx.Provider value={actions}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </ActionsCtx.Provider>
  );
};

export function useUI(): UIState {
  const v = useContext(StateCtx);
  if (!v) throw new Error("useUI must be used within UIProvider");
  return v;
}

export function useUIActions(): UIActions {
  const v = useContext(ActionsCtx);
  if (!v) throw new Error("useUIActions must be used within UIProvider");
  return v;
}
