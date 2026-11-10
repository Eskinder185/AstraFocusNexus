import React, { useId, useMemo, useRef, useState } from "react";
import { CalendarClock, CornerDownLeft, Flag, Plus, X } from "lucide-react";
import { useUI, useUIActions } from "../../app/ui";
import { Dialog } from "../../components/ui/Dialog";
import { useAppToast } from "../../context/AppToast";
import { cx } from "../../lib/cx";
import { formatTime, relativeDayLabel } from "../../lib/dates";
import { PRIORITY_META, PRIORITY_ORDER } from "../workspace/priority";
import { parseQuickAdd, type QuickAddIgnore } from "../workspace/quickAdd";
import type { Priority } from "../workspace/schema";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";

interface Overrides {
  priority?: Priority;
  dueDate?: string | null;
  dueTime?: string | null;
  goalId?: string | null;
  projectId?: string | null;
  remind?: boolean;
}

/** Shared parsing + chips for quick add. Explicit field values always win over parsed text. */
function useQuickAdd(initial: string) {
  const [text, setText] = useState(initial);
  const [ignore, setIgnore] = useState<QuickAddIgnore>({});
  // Re-read the clock whenever the text changes so "today" is never stale.
  const now = useMemo(() => new Date(), [text]);
  const parsed = useMemo(() => parseQuickAdd(text, now, ignore), [text, now, ignore]);
  const reset = () => {
    setText("");
    setIgnore({});
  };
  return { text, setText, parsed, ignore, setIgnore, reset, now };
}

function ParsedChips({
  parsed,
  now,
  onDismiss,
}: {
  parsed: ReturnType<typeof parseQuickAdd>;
  now: Date;
  onDismiss: (k: keyof QuickAddIgnore) => void;
}) {
  const { matched } = parsed;
  if (!matched.date && !matched.time && !matched.priority) return null;
  return (
    <div className="qa-chips" aria-live="polite">
      <span className="visually-hidden">Recognised:</span>
      {(matched.date || matched.time) && parsed.dueDate && (
        <span className="chip chip--accent">
          <CalendarClock size={12} aria-hidden />
          {relativeDayLabel(parsed.dueDate, now)}
          {parsed.dueTime && ` · ${formatTime(parsed.dueTime)}`}
          <button
            type="button"
            className="chip__remove"
            aria-label={`Keep “${[matched.date, matched.time].filter(Boolean).join(" ")}” as text`}
            onClick={() => {
              if (matched.date) onDismiss("date");
              if (matched.time) onDismiss("time");
            }}
          >
            <X size={11} aria-hidden />
          </button>
        </span>
      )}
      {matched.priority && parsed.priority && (
        <span className="chip chip--accent">
          <Flag size={12} aria-hidden />
          {PRIORITY_META[parsed.priority].label}
          <button type="button" className="chip__remove" aria-label={`Keep “${matched.priority}” as text`} onClick={() => onDismiss("priority")}>
            <X size={11} aria-hidden />
          </button>
        </span>
      )}
    </div>
  );
}

/** Inline quick add used on pages. Press Enter to add; details can be edited afterwards. */
export const InlineQuickAdd: React.FC<{ placeholder?: string; defaults?: Overrides; label?: string }> = ({
  placeholder = "Add a task… try “Essay draft fri 5pm !1”",
  defaults = {},
  label = "Add a task",
}) => {
  const { addTask } = useWorkspaceActions();
  const qa = useQuickAdd("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const canAdd = qa.parsed.title.trim().length > 0;

  const submit = () => {
    if (!canAdd) return;
    const p = qa.parsed;
    addTask({
      title: p.title,
      ...(defaults.goalId !== undefined ? { goalId: defaults.goalId } : {}),
      priority: p.priority ?? defaults.priority,
      dueDate: p.dueDate ?? defaults.dueDate ?? null,
      dueTime: p.dueTime ?? null,
    });
    qa.reset();
    inputRef.current?.focus();
  };

  return (
    <form
      className="qa-inline"
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="qa-inline__row">
        <Plus size={16} className="qa-inline__icon" aria-hidden />
        <label className="visually-hidden" htmlFor={inputId}>
          {label}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className="qa-inline__input"
          value={qa.text}
          onChange={e => qa.setText(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="done"
        />
        {canAdd && (
          <button type="submit" className="btn btn--sm btn--primary">
            Add <CornerDownLeft size={13} aria-hidden />
          </button>
        )}
      </div>
      <ParsedChips parsed={qa.parsed} now={qa.now} onDismiss={k => qa.setIgnore(i => ({ ...i, [k]: true }))} />
    </form>
  );
};

/** Full composer dialog (C or the New task button). */
export const TaskComposerDialog: React.FC = () => {
  const { composer } = useUI();
  const { closeComposer } = useUIActions();
  if (!composer) return null;
  return <ComposerForm key={JSON.stringify(composer)} defaults={composer} onClose={closeComposer} />;
};

const ComposerForm: React.FC<{ defaults: Overrides & { title?: string }; onClose: () => void }> = ({ defaults, onClose }) => {
  const { goals, projects, prefs } = useWorkspace();
  const { addTask } = useWorkspaceActions();
  const { showToast } = useAppToast();
  const qa = useQuickAdd(defaults.title ?? "");
  const [manual, setManual] = useState<Overrides>({});
  const [createMore, setCreateMore] = useState(false);

  const p = qa.parsed;
  const priority = manual.priority ?? p.priority ?? defaults.priority ?? prefs.defaultPriority;
  const dueDate = manual.dueDate !== undefined ? manual.dueDate : p.dueDate ?? defaults.dueDate ?? null;
  const dueTime = dueDate ? (manual.dueTime !== undefined ? manual.dueTime : p.dueTime) ?? null : null;
  const goalId = manual.goalId !== undefined ? manual.goalId : defaults.goalId !== undefined ? defaults.goalId : prefs.defaultGoalId;
  const projectId = manual.projectId !== undefined ? manual.projectId : defaults.projectId ?? null;
  const remind = !!manual.remind && !!dueTime;
  const canAdd = p.title.trim().length > 0;

  const submit = () => {
    if (!canAdd) return;
    addTask({ title: p.title, priority, dueDate, dueTime, goalId, projectId, remind });
    if (remind && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    if (createMore) {
      qa.reset();
      setManual({});
      showToast(`Added “${p.title}”`, { tone: "success", durationMs: 3000 });
    } else {
      onClose();
      showToast(`Added “${p.title}”`, { tone: "success", durationMs: 3000 });
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      ariaLabel="New task"
      className="composer"
      footer={
        <>
          <label className="switch composer__more">
            <input type="checkbox" checked={createMore} onChange={e => setCreateMore(e.target.checked)} />
            Create more
          </label>
          <span className="spacer" />
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="composer-form" className="btn btn--primary" disabled={!canAdd}>
            Add task
          </button>
        </>
      }
    >
      <form
        id="composer-form"
        className="composer__body"
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="composer-title" className="visually-hidden">
          Task name
        </label>
        <input
          id="composer-title"
          data-autofocus
          className="composer__title"
          placeholder="What needs to happen?"
          value={qa.text}
          onChange={e => qa.setText(e.target.value)}
          autoComplete="off"
          enterKeyHint="done"
        />
        <ParsedChips parsed={p} now={qa.now} onDismiss={k => qa.setIgnore(i => ({ ...i, [k]: true }))} />
        {canAdd && p.title !== qa.text.replace(/\s+/g, " ").trim() && (
          <p className="hint">
            Saves as <strong className="composer__saves-as">“{p.title}”</strong>
          </p>
        )}
        <p className="hint composer__syntax">
          Type dates and priorities naturally: <em>tomorrow</em>, <em>fri 5pm</em>, <em>Dec 3</em>, <em>!1</em>–<em>!4</em>.
        </p>

        <div className="composer__fields">
          <div className="field composer__priority">
            <span className="label" id="composer-priority">
              Priority
            </span>
            <div className="segmented" role="radiogroup" aria-labelledby="composer-priority">
              {PRIORITY_ORDER.map(code => {
                const m = PRIORITY_META[code];
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={priority === code}
                    title={`${m.long}. ${m.hint}`}
                    onClick={() => setManual(o => ({ ...o, priority: code }))}
                  >
                    <span className={cx("pdot", `pdot--${m.tone}`)} aria-hidden />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="composer-date">
              Due date
            </label>
            <input
              id="composer-date"
              type="date"
              className="input"
              value={dueDate ?? ""}
              onChange={e => setManual(o => ({ ...o, dueDate: e.target.value || null }))}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="composer-time">
              Time
            </label>
            <input
              id="composer-time"
              type="time"
              className="input"
              value={dueTime ?? ""}
              disabled={!dueDate}
              onChange={e => setManual(o => ({ ...o, dueTime: e.target.value || null }))}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="composer-goal">
              Goal
            </label>
            <select
              id="composer-goal"
              className="select"
              value={goalId ?? ""}
              onChange={e => setManual(o => ({ ...o, goalId: e.target.value || null }))}
            >
              <option value="">No goal</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.title}
                </option>
              ))}
            </select>
          </div>
          {projects.length > 0 && (
            <div className="field">
              <label className="label" htmlFor="composer-project">
                Project
              </label>
              <select
                id="composer-project"
                className="select"
                value={projectId ?? ""}
                onChange={e => setManual(o => ({ ...o, projectId: e.target.value || null }))}
              >
                <option value="">No project</option>
                {projects.map(pr => (
                  <option key={pr.id} value={pr.id}>
                    {pr.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field composer__remind">
            <label className="switch">
              <input
                type="checkbox"
                checked={remind}
                disabled={!dueTime}
                onChange={e => setManual(o => ({ ...o, remind: e.target.checked }))}
              />
              Remind me at the due time
            </label>
            {!dueTime && <span className="hint">Set a time to enable reminders.</span>}
          </div>
        </div>
      </form>
    </Dialog>
  );
};
