import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import ToolSection from "../components/ToolSection";
import ToolEmpty from "../components/ToolEmpty";

type Priority = "UI" | "UN" | "NI" | "NN";
interface Task {
  id: number;
  text: string;
  completed: boolean;
  goalId?: number | null;
  priority?: Priority;
}
interface Goal {
  id: number;
  title: string;
  emoji?: string;
}

interface GoalsProps {
  goals: Goal[];
  setGoals: (g: Goal[]) => void;
  goalTitle: string;
  setGoalTitle: (v: string) => void;
  goalEmoji: string;
  setGoalEmoji: (v: string) => void;
  setGoalPref: (id: number | null) => void;
  tasks: Task[];
}

const emojiDefaults = ["🎯", "🏋️", "📚", "💼", "💵", "🧘", "🧠", "💡", "❤️", "🏃", "🎵", "🎨", "🧑‍🍳"];

const Goals: React.FC<GoalsProps> = ({
  goals,
  setGoals,
  goalTitle,
  setGoalTitle,
  goalEmoji,
  setGoalEmoji,
  setGoalPref,
  tasks,
}) => {
  const addGoal = () => {
    const title = goalTitle.trim();
    if (!title) return;
    const g: Goal = { id: Date.now(), title, emoji: goalEmoji };
    setGoals([...goals, g]);
    setGoalTitle("");
  };

  const canAdd = goalTitle.trim().length > 0;

  const progress = useMemo(() => {
    const m = new Map<number, { total: number; done: number }>();
    for (const t of tasks) {
      if (t.goalId == null) continue;
      const v = m.get(t.goalId) ?? { total: 0, done: 0 };
      v.total += 1;
      if (t.completed) v.done += 1;
      m.set(t.goalId, v);
    }
    return m;
  }, [tasks]);

  return (
    <div>
      <PageHeader
        icon="🎯"
        title="Goals"
        subtitle="Name what you’re aiming for, attach new tasks, and watch progress add up over time."
      />

      <ToolSection
        title="Goals & progress"
        lede="Create a goal, optionally set it as the default for new tasks, then add work on Home—bars fill as linked tasks get done."
      >
        <div className="goal-form-block">
          <span className="task-form__label">Symbol</span>
          <div className="emoji-grid" role="group" aria-label="Goal icon">
            {emojiDefaults.map(e => (
              <button
                key={e}
                type="button"
                className={"emoji-pick" + (goalEmoji === e ? " selected" : "")}
                onClick={() => setGoalEmoji(e)}
                aria-pressed={goalEmoji === e}
              >
                {e}
              </button>
            ))}
          </div>

          <span className="task-form__label" style={{ marginTop: "0.75rem" }}>
            Goal name
          </span>
          <div className="goal-input-row">
            <input
              className="input"
              placeholder="e.g. Ship portfolio, Run 5K, Sleep better"
              value={goalTitle}
              onChange={e => setGoalTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && canAdd && addGoal()}
            />
            <button type="button" className="btn btn--primary" onClick={addGoal} disabled={!canAdd} title={canAdd ? undefined : "Enter a goal name first"}>
              Add goal
            </button>
          </div>
        </div>

        {goals.length === 0 ? (
          <ToolEmpty
            className="tool-empty--goals"
            icon="🎯"
            title="No goals yet"
            body="Goals group your tasks so progress isn’t invisible. Add one meaningful outcome above, then go to Home and use “Use for new tasks” so fresh tasks link automatically."
          >
            <Link to="/" className="btn btn--secondary tool-empty__cta">
              Open Home to add tasks
            </Link>
          </ToolEmpty>
        ) : (
          <ul className="goals goals--section">
            {goals.map(g => {
              const prog = progress.get(g.id) ?? { total: 0, done: 0 };
              const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
              return (
                <li key={g.id} className="goal-row">
                  <div className="goal-row__top">
                    <span className="goal-emoji" aria-hidden>
                      {g.emoji ?? "🎯"}
                    </span>
                    <span className="goal-title">{g.title}</span>
                    <span className="goal-stat">
                      {prog.done}/{prog.total} tasks
                    </span>
                  </div>
                  <div className="bar goal-row__bar" aria-hidden>
                    <div className="fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="goal-row__meta">
                    <span className="goal-row__pct">{prog.total ? `${pct}% done` : "No linked tasks yet"}</span>
                    <button
                      type="button"
                      className="pill"
                      onClick={() => setGoalPref(g.id)}
                      title="New tasks you add on Home will attach to this goal until you pick another"
                    >
                      Use for new tasks
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ToolSection>
    </div>
  );
};

export default Goals;
