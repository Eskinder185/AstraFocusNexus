import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";

type ToastTone = "info" | "success" | "warning" | "danger";

export interface ShowToastOptions {
  tone?: ToastTone;
  /** Default 6000ms (9000ms when there is an action). */
  durationMs?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ShowToastOptions["action"];
}

interface AppToastContextValue {
  showToast: (message: string, options?: ShowToastOptions) => void;
}

const AppToastContext = createContext<AppToastContextValue | null>(null);

const ICONS = { info: Info, success: CheckCircle2, warning: TriangleAlert, danger: XCircle } as const;

export const AppToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems(prev => prev.filter(t => t.id !== id)), []);

  const showToast = useCallback(
    (message: string, options?: ShowToastOptions) => {
      const id = ++seq.current;
      const tone = options?.tone ?? "info";
      const durationMs = options?.durationMs ?? (options?.action ? 9000 : 6000);
      setItems(prev => [...prev.slice(-3), { id, message, tone, action: options?.action }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <AppToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        <div aria-live="polite" aria-atomic="false" className="toast-stack">
          {items.map(t => {
            const Icon = ICONS[t.tone];
            return (
              <div key={t.id} className={`toast toast--${t.tone}`} role="status">
                <Icon className="toast__icon" size={16} aria-hidden />
                <p className="toast__message">{t.message}</p>
                {t.action && (
                  <button
                    type="button"
                    className="toast__action"
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
                <button type="button" className="toast__dismiss" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                  <X size={14} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AppToastContext.Provider>
  );
};

export function useAppToast(): AppToastContextValue {
  const ctx = useContext(AppToastContext);
  if (!ctx) throw new Error("useAppToast must be used within AppToastProvider");
  return ctx;
}
