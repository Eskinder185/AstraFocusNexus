import React, { useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { useNow } from "../../hooks/useNow";
import { cx } from "../../lib/cx";
import { InlineQuickAdd } from "../tasks/TaskComposer";
import { TaskRow } from "../tasks/TaskRow";
import { PRIORITY_META, PRIORITY_ORDER } from "../workspace/priority";
import type { Priority } from "../workspace/schema";
import { compareByDue, isOpen } from "../workspace/selectors";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";

/** Standard Eisenhower layout: columns = urgent / not urgent, rows = important / not important. */
const GRID: Priority[] = ["UI", "NI", "UN", "NN"];

export const MatrixPage: React.FC = () => {
  const { tasks } = useWorkspace();
  const { updateTask } = useWorkspaceActions();
  const now = useNow();
  const [showDone, setShowDone] = useState(false);
  const [dragOver, setDragOver] = useState<Priority | null>(null);

  const visible = tasks.filter(t => showDone || isOpen(t));

  return (
    <div className="matrix-page">
      <PageHeader
        title="Priority Matrix"
        description="Sort work by urgency and importance. Drag tasks between quadrants, or use “Move to”."
        actions={
          <label className="switch">
            <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
            Show completed
          </label>
        }
      />
      <div className="matrix" aria-label="Eisenhower matrix">
        <span className="matrix__axis matrix__axis--top" aria-hidden>
          <span>Urgent</span>
          <span>Not urgent</span>
        </span>
        {GRID.map(code => {
          const m = PRIORITY_META[code];
          const items = visible.filter(t => t.priority === code).sort((a, b) => (a.status === b.status ? compareByDue(a, b) : a.status === "todo" ? -1 : 1));
          const openCount = items.filter(isOpen).length;
          return (
            <section
              key={code}
              className={cx("quadrant", `quadrant--${m.tone}`, dragOver === code && "is-drop-target")}
              aria-labelledby={`q-${code}`}
              onDragOver={e => {
                if (e.dataTransfer.types.includes("text/x-astra-task")) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOver(code);
                }
              }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
              }}
              onDrop={e => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/x-astra-task");
                if (id) updateTask(id, { priority: code });
              }}
            >
              <header className="quadrant__head">
                <div>
                  <h2 id={`q-${code}`} className="quadrant__title">
                    <span className={cx("pdot", `pdot--${m.tone}`)} aria-hidden />
                    {m.label}
                    <span className="quadrant__count tabular">{openCount}</span>
                  </h2>
                  <p className="quadrant__long">{m.long}</p>
                </div>
              </header>
              <p className="quadrant__hint">{m.hint}</p>
              {items.length > 0 && (
                <ul role="list" className="task-list">
                  {items.map(t => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      now={now}
                      hidePriority
                      compact
                      draggable={isOpen(t)}
                      trailing={
                        isOpen(t) && (
                          <>
                            <label className="visually-hidden" htmlFor={`mv-${t.id}`}>
                              Move “{t.title}” to
                            </label>
                            <select
                              id={`mv-${t.id}`}
                              className="move-select"
                              value={code}
                              onChange={e => updateTask(t.id, { priority: e.target.value as Priority })}
                              title="Move to quadrant"
                            >
                              {PRIORITY_ORDER.map(p => (
                                <option key={p} value={p}>
                                  {PRIORITY_META[p].label}
                                </option>
                              ))}
                            </select>
                          </>
                        )
                      }
                    />
                  ))}
                </ul>
              )}
              <div className="quadrant__add">
                <InlineQuickAdd label={`Add to ${m.label}`} placeholder={`Add to ${m.label}…`} defaults={{ priority: code }} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
