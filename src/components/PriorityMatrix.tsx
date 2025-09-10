import React from "react";
import type { Task, Priority } from "../types";

const labels: Record<Priority, string> = {
  UI: "Urgent + Important",
  UN: "Urgent + Not Important",
  NI: "Not Urgent + Important",
  NN: "Not Urgent + Not Important",
};

const quadrants: Priority[] = ["UI","UN","NI","NN"];

const qStyles: Record<Priority, React.CSSProperties> = {
  UI: { borderColor: "var(--accent)" },
  UN: { borderColor: "#ff9d00" },
  NI: { borderColor: "#00c2ff" },
  NN: { borderColor: "rgba(255,255,255,.2)" },
};

const PriorityMatrix: React.FC<{
  tasks: Task[];
  onToggleComplete: (id:number)=>void;
  onChangePriority: (id:number, p: Priority)=>void;
}> = ({ tasks, onToggleComplete, onChangePriority }) => {
  return (
    <div className="matrix">
      {quadrants.map(q => {
        const items = tasks.filter(t => (t.priority ?? "NN") === q);
        return (
          <div key={q} className="matrix-cell" style={qStyles[q]}>
            <div className="matrix-title">{labels[q]}</div>
            <ul className="task-list compact">
              {items.map(t => (
                <li key={t.id} className={t.completed ? "done" : ""}>
                  <label style={{display:"flex", gap:8, alignItems:"center"}}>
                    <input type="checkbox" checked={t.completed} onChange={()=>onToggleComplete(t.id)} />
                    <span>{t.text}</span>
                  </label>
                  {!t.completed && (
                    <div className="priority-picker">
                      {quadrants.map(opt => (
                        <button
                          key={opt}
                          className={"pill" + ((t.priority??"NN")===opt ? " active" : "")}
                          onClick={()=>onChangePriority(t.id, opt)}
                          title={labels[opt]}
                        >{opt}</button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default PriorityMatrix;
