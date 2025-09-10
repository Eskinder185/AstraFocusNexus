import React, { useMemo } from "react";
import PageHeader from "../components/PageHeader";

type Priority = "UI" | "UN" | "NI" | "NN";
interface Task { id:number; text:string; completed:boolean; goalId?:number|null; priority?:Priority; }
interface Goal { id:number; title:string; emoji?:string; }

interface GoalsProps {
  goals: Goal[]; setGoals: (g: Goal[]) => void;
  goalTitle: string; setGoalTitle: (v: string) => void;
  goalEmoji: string; setGoalEmoji: (v: string) => void;
  setGoalPref: (id: number|null)=>void;
  tasks: Task[];
}

const emojiDefaults = ["🎯","🏋️","📚","💼","💵","🧘","🧠","💡","❤️","🏃","🎵","🎨","🧑‍🍳"];

const Goals: React.FC<GoalsProps> = ({ goals, setGoals, goalTitle, setGoalTitle, goalEmoji, setGoalEmoji, setGoalPref, tasks }) => {
  const addGoal = () => {
    const title = goalTitle.trim();
    if (!title) return;
    const g: Goal = { id: Date.now(), title, emoji: goalEmoji };
    setGoals([...goals, g]);
    setGoalTitle("");
  };

  const progress = useMemo(() => {
    const m = new Map<number, { total: number; done: number }>();
    for (const t of tasks) {
      if (t.goalId == null) continue;
      const v = m.get(t.goalId) ?? { total: 0, done: 0 };
      v.total += 1; if (t.completed) v.done += 1;
      m.set(t.goalId, v);
    }
    return m;
  }, [tasks]);

  return (
    <div>
      <PageHeader icon="🎯" title="Goals" subtitle="Connect tasks to bigger outcomes" />
      <div className="card">
        <div className="goal-add">
          <div className="label">Pick a symbol</div>
          <div className="emoji-grid">
            {emojiDefaults.map(e => (
              <button key={e} className={"emoji-pick"+(goalEmoji===e?" selected":"")} onClick={()=>setGoalEmoji(e)}>{e}</button>
            ))}
          </div>
          <div className="goal-input-row">
            <input className="input" placeholder="Add a new goal (e.g., Stronger body)" value={goalTitle} onChange={(e)=>setGoalTitle(e.target.value)} />
            <button className="btn" onClick={addGoal}>Add</button>
          </div>
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
                  <div className="bar"><div className="fill" style={{width:`${pct}%`}}/></div>
                  <span className="goal-stat">{prog.done}/{prog.total}</span>
                  <button className="pill" onClick={()=>setGoalPref(g.id)} title="Attach new tasks to this goal">Use for new tasks</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Goals;
