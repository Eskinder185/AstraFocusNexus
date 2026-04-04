import React from "react";
import { Link } from "react-router-dom";
import ToolEmpty from "../components/ToolEmpty";

type Priority = "UI" | "UN" | "NI" | "NN";
interface Task {
  id: number;
  text: string;
  completed: boolean;
  priority?: Priority;
}
interface Props {
  tasks: Task[];
  toggleTask: (id: number) => void;
  setTaskPriority: (id: number, p: Priority) => void;
}

const labels: Record<Priority, string> = {
  UI: "Urgent + Important",
  UN: "Urgent + Not Important",
  NI: "Not Urgent + Important",
  NN: "Not Urgent + Not Important",
};

const quadrants: Priority[] = ["UI", "UN", "NI", "NN"];

const emptyBodyForQuadrant = (q: Priority, noTasksAtAll: boolean): string => {
  if (noTasksAtAll) {
    const hints: Record<Priority, string> = {
      UI: "On Home, add a task and set priority to Do first (UI)—it will show up here.",
      UN: "Tasks marked Delegate / quick (UN) land here once you add them on Home.",
      NI: "Schedule-priority (NI) tasks—important work you plan ahead—appear in this quadrant.",
      NN: "Later or drop (NN) tasks collect here when you add them from Home.",
    };
    return hints[q];
  }
  return "Nothing with this priority right now. Change a task’s priority from Home or use the buttons on an open task below.";
};

const Matrix: React.FC<Props> = ({ tasks, toggleTask, setTaskPriority }) => {
  const noTasksAtAll = tasks.length === 0;

  return (
    <div className="matrix-page">
      {noTasksAtAll && (
        <div className="tool-banner" role="status">
          <p className="tool-banner__title">Your matrix is waiting for tasks</p>
          <p className="tool-banner__body">
            Add tasks on <strong>Home</strong>, choose a priority for each, and they’ll sort into these four boxes automatically. You can still move tasks between quadrants here.
          </p>
          <Link to="/" className="btn btn--secondary tool-banner__cta">
            Go to Home
          </Link>
        </div>
      )}

      <div className="matrix">
        {quadrants.map(q => {
          const items = tasks.filter(t => (t.priority ?? "NN") === q);
          return (
            <div key={q} className="matrix-cell">
              <div className="matrix-cell__head">
                <span className="matrix-title">{labels[q]}</span>
                <span className="matrix-cell__code" aria-hidden>
                  {q}
                </span>
              </div>
              {items.length === 0 ? (
                <ToolEmpty
                  className="tool-empty--matrix"
                  icon="📌"
                  title={noTasksAtAll ? "Empty" : "No tasks here"}
                  body={emptyBodyForQuadrant(q, noTasksAtAll)}
                />
              ) : (
                <ul className="list matrix-list">
                  {items.map(t => (
                    <li key={t.id} className="item matrix-item">
                      <div className="matrix-item__row">
                        <input
                          type="checkbox"
                          checked={t.completed}
                          onChange={() => toggleTask(t.id)}
                          title="Mark complete"
                        />
                        <span className={`text ${t.completed ? "done" : ""}`}>{t.text}</span>
                      </div>
                      {!t.completed && (
                        <div className="matrix-item__move" role="group" aria-label="Move to quadrant">
                          {quadrants.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              className={`pill small ${(t.priority ?? "NN") === opt ? "active" : ""}`}
                              onClick={() => setTaskPriority(t.id, opt)}
                              title={labels[opt]}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Matrix;
