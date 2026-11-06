import React, { useId } from "react";

/**
 * AstraFocus mark: an open orbit (direction, momentum) around a warm star core (focus).
 * The gap in the orbit is the "start" point: the next step.
 */
export const BrandMark: React.FC<{ size?: number; className?: string }> = ({ size = 28, className }) => {
  const gid = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={gid} x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--star)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="var(--surface-3)" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="none" stroke="var(--border-strong)" />
      <circle
        cx="16"
        cy="16"
        r="9"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray="42 15"
        transform="rotate(-62 16 16)"
      />
      <circle cx="16" cy="16" r="3" fill="var(--star)" />
      <circle cx="23.6" cy="9.4" r="1.4" fill="var(--accent)" />
    </svg>
  );
};
