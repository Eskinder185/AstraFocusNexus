import React, { createContext, useCallback, useContext, useState } from "react";

type ToastTone = "info" | "warning";

export interface ShowToastOptions {
  tone?: ToastTone;
  /** Default 7000; idle eye-break uses longer */
  durationMs?: number;
}

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface AppToastContextValue {
  showToast: (message: string, options?: ShowToastOptions) => void;
}

const AppToastContext = createContext<AppToastContextValue | null>(null);

export const AppToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, options?: ShowToastOptions) => {
    const id = Date.now() + Math.random();
    const tone = options?.tone ?? "info";
    const durationMs = options?.durationMs ?? 7000;
    setItems(prev => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setItems(prev => prev.filter(t => t.id !== id));
    }, durationMs);
  }, []);

  const dismiss = (id: number) => setItems(prev => prev.filter(t => t.id !== id));

  return (
    <AppToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" aria-label="App messages">
        {items.map(t => (
          <div
            key={t.id}
            className={`toast toast--${t.tone}`}
            role="status"
          >
            <p className="toast__message">{t.message}</p>
            <button
              type="button"
              className="toast__dismiss"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </AppToastContext.Provider>
  );
};

export function useAppToast(): AppToastContextValue {
  const ctx = useContext(AppToastContext);
  if (!ctx) {
    throw new Error("useAppToast must be used within AppToastProvider");
  }
  return ctx;
}
