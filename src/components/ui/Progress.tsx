import React from "react";
import { cx } from "../../lib/cx";

export const ProgressBar: React.FC<{ value: number; label: string; className?: string }> = ({ value, label, className }) => {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cx("progress", v === 100 && "progress--done", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
    >
      <div className="progress__fill" style={{ width: `${v}%` }} />
    </div>
  );
};

interface RingProps {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
}

/** Circular progress. Decorative: always pair it with visible text for the value. */
export const ProgressRing: React.FC<RingProps> = ({ value, size = 44, stroke = 4, className, children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const mid = size / 2;
  return (
    <div className={cx("ring", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden focusable="false">
        <circle className="ring__track" cx={mid} cy={mid} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="ring__value"
          cx={mid}
          cy={mid}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${mid} ${mid})`}
        />
      </svg>
      {children && <div className="ring__label">{children}</div>}
    </div>
  );
};
