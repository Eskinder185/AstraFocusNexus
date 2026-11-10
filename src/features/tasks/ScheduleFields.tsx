import React from "react";
import { cx } from "../../lib/cx";
import type { ScheduleErrors, ScheduleField, ScheduleValue } from "../workspace/schedule";

/** The user's IANA time zone, e.g. "America/New_York", when the browser exposes it. */
export function localTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

interface Props {
  idPrefix: string;
  value: ScheduleValue;
  errors: ScheduleErrors;
  onChange: (next: ScheduleValue) => void;
  /** Due-time reminders etc. can be rendered under the due group. */
  dueExtra?: React.ReactNode;
}

/**
 * Optional start and due, each a date with an optional time. Times are local and shown in
 * the browser's own 12/24-hour format. Clearing a date also clears its time.
 */
export const ScheduleFields: React.FC<Props> = ({ idPrefix, value, errors, onChange, dueExtra }) => {
  const set = (field: ScheduleField, v: string) => {
    const next = { ...value, [field]: v || null };
    if (field === "startDate" && !v) next.startTime = null;
    if (field === "dueDate" && !v) next.dueTime = null;
    onChange(next);
  };
  const id = (f: ScheduleField) => `${idPrefix}-${f}`;
  const errId = (f: ScheduleField) => `${idPrefix}-${f}-error`;
  const tz = localTimeZone();

  const input = (f: ScheduleField, label: string, type: "date" | "time", disabled = false) => (
    <div className="field">
      <label className="label" htmlFor={id(f)}>{label}</label>
      <input
        id={id(f)}
        type={type}
        className={cx("input", errors[f] && "is-invalid")}
        value={value[f] ?? ""}
        disabled={disabled}
        aria-invalid={!!errors[f]}
        aria-describedby={errors[f] ? errId(f) : undefined}
        onChange={e => set(f, e.target.value)}
      />
      {errors[f] && (
        <p id={errId(f)} className="field-error" role="alert">
          {errors[f]}
        </p>
      )}
    </div>
  );

  return (
    <fieldset className="schedule-fields">
      <legend className="label schedule-fields__legend">Schedule <span className="muted">(optional)</span></legend>
      <div className="schedule-fields__group" role="group" aria-label="Start">
        {input("startDate", "Start date", "date")}
        {input("startTime", "Start time", "time", !value.startDate)}
      </div>
      <div className="schedule-fields__group" role="group" aria-label="Due">
        {input("dueDate", "Due date", "date")}
        {input("dueTime", "Due time", "time", !value.dueDate)}
      </div>
      {dueExtra}
      <p className="hint schedule-fields__hint">
        Times are optional; leave one empty for an all-day date.{tz ? ` Times use your time zone (${tz.replace(/_/g, " ")}).` : ""}
      </p>
    </fieldset>
  );
};
