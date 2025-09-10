import React, { useEffect, useMemo, useState } from "react";
import type { Goal, Task } from "../types";

const KEY = "task-tracker.goals.v1";

function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) try { setGoals(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(goals));
  }, [goals]);
  return { goals, setGoals };
}

const emojiDefaults = ["🎯","🏋️","📚","💼","💵","🧘","🧠","💡","❤️","🏃"];

const GoalsPanel: React.FC<{
  tasks: Task[];
  onSelectGoalForNewTask?: (goalId: number | null) => void;
}> = ({ tasks, onSelectGoalForNewTask }) => {
  const { goals, setGoals } = useGoals();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(emojiDefaults[0]);

  const progress = useMemo(() => {
    const byGoal = new Map<number, { total: number; done: number }>();
    for (const t of tasks) {
      if (t.goalId == null) continue;
      const g = byGoal.get(t.goalId) ?? { total: 0, done: 0 };
      g.total += 1;
      if (t.completed) g.done += 1;
      byGoal.set(t.goalId, g);
    }
    return byGoal;
  }, [tasks]);

  function addGoal() {
    const text = title.trim();
    if (!text) return;
    const g: Goal = {
      id: Date.now(),
      title: text,
      emoji,
      color: undefined,
    };
    setGoals([...goals, g]);
    setTitle("");
  }

  return (
    <div className="card">
      <h2 style={{marginTop:0}}>Personal goals</h2>
      <div style={{display:"flex", gap:8}}>
        <select value={emoji} onChange={(e)=>setEmoji(e.target.value)}>
          {emojiDefaults.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <input className="input" placeholder="Add a new goal (e.g., Stronger body)" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <button className="btn" onClick={addGoal}>Add</button>
      </div>

      {goals.length === 0 ? (
        <div className="muted" style={{marginTop:8}}>No goals yet. Add one, then link tasks to it.</div>
      ) : (
        <ul className="goals">
          {goals.map(g => {
            const prog = progress.get(g.id) ?? { total: 0, done: 0 };
            const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
            return (
              <li key={g.id}>
                <span className="goal-emoji">{g.emoji ?? "🎯"}</span>
                <span className="goal-title">{g.title}</span>
                <div className="bar">
                  <div className="fill" style={{width: `${pct}%`}}/>
                </div>
                <span className="goal-stat">{prog.done}/{prog.total}</span>
                {onSelectGoalForNewTask && (
                  <button className="pill" onClick={()=>onSelectGoalForNewTask(g.id)} title="Attach new tasks to this goal">Use for new tasks</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default GoalsPanel;
