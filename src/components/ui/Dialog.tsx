import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cx } from "../../lib/cx";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Visible title. Use `ariaLabel` instead when the dialog has no header. */
  title?: React.ReactNode;
  ariaLabel?: string;
  variant?: "center" | "sheet";
  className?: string;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Native <dialog> + showModal(): browser-provided focus trapping, inert background,
 * Escape to close and top-layer stacking. Focus returns to the opener on close.
 * Mark the control that should receive focus first with `data-autofocus` (React's
 * autoFocus prop doesn't emit the attribute showModal() looks for).
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  ariaLabel,
  variant = "center",
  className,
  footer,
  headerActions,
  children,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const opener = document.activeElement as HTMLElement | null;
    if (!el.open) el.showModal();
    el.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      if (el.open) el.close();
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      className={cx("dialog", variant === "sheet" && "dialog--sheet", className)}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
      onCancel={e => {
        e.preventDefault();
        onCloseRef.current();
      }}
      onMouseDown={e => {
        // A press on the ::backdrop targets the <dialog> itself, outside its box.
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) onCloseRef.current();
      }}
    >
      {title && (
        <div className="dialog__header">
          <h2 id={titleId} className="dialog__title">
            {title}
          </h2>
          <div className="row">
            {headerActions}
            <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label="Close">
              <X size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}
      {children}
      {footer && <div className="dialog__footer">{footer}</div>}
    </dialog>
  );
};
