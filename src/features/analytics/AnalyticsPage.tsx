import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { ProgressBar } from "../../components/ui/Progress";
import { addDays, formatDuration, toDateKey } from "../../lib/dates";
import { focusByDay, goalProgress } from "../workspace/selectors";
import { useWorkspace } from "../workspace/WorkspaceProvider";

export const AnalyticsPage: React.FC = () => {
  const { tasks, goals, focusSessions } = useWorkspace();
  const now = new Date();
  const first = addDays(now, -6);
  first.setHours(0, 0, 0, 0);
  const last = addDays(now, 1);
  last.setHours(0, 0, 0, 0);
  const daily = focusByDay(focusSessions, now, 7);
  const max = Math.max(60_000, ...daily.map(d => d.ms));
  const recentDone = tasks.filter(t => t.completedAt && t.completedAt >= first.getTime() && t.completedAt < last.getTime());
  const unfinished = tasks.filter(t => t.status === "todo" && t.dueDate && t.dueDate < toDateKey(now));
  const planned = tasks.filter(t => t.scheduledAt && t.scheduledAt >= first.getTime() && t.scheduledAt < last.getTime());
  const plannedMs = planned.reduce((sum, t) => sum + (t.estimateMin ?? 30) * 60_000, 0);
  const plannedIds = new Set(planned.map(t => t.id));
  const actualMs = focusSessions.filter(s => s.endedAt >= first.getTime() && s.endedAt < last.getTime() && s.taskId && plannedIds.has(s.taskId)).reduce((sum, s) => sum + s.focusedMs, 0);
  const totalMs = daily.reduce((sum, d) => sum + d.ms, 0);

  return <div className="analytics-page">
    <PageHeader title="Analytics" description="A seven day view of work recorded on this device." />
    <div className="analytics-summary">
      <div className="card stat"><p className="stat__label">Focus time</p><p className="stat__value">{formatDuration(totalMs)}</p></div>
      <div className="card stat"><p className="stat__label">Completed tasks</p><p className="stat__value">{recentDone.length}</p></div>
      <div className="card stat"><p className="stat__label">Planned time</p><p className="stat__value">{formatDuration(plannedMs)}</p></div>
      <div className="card stat"><p className="stat__label">Focused on planned tasks</p><p className="stat__value">{formatDuration(actualMs)}</p></div>
    </div>
    <div className="analytics-grid">
      <section className="card">
        <div className="card__header"><h2 className="card__title">Daily focus</h2></div>
        <div className="card__body">
          <p className="subtle">Actual focused time by session end date. Skipped segments count for the time you focused.</p>
          <div className="analytics-bars" role="img" aria-label={daily.map(d => `${d.date.toLocaleDateString()}: ${formatDuration(d.ms)}`).join(", ")}>
            {daily.map(d => <div key={toDateKey(d.date)}><span className="analytics-bars__bar" style={{ height: `${Math.max(3, d.ms / max * 100)}%` }} /><span>{d.date.toLocaleDateString(undefined, { weekday: "short" })}</span></div>)}
          </div>
        </div>
      </section>
      <section className="card">
        <div className="card__header"><h2 className="card__title">Weekly review</h2></div>
        <div className="card__body analytics-review">
          <p><strong>{recentDone.length}</strong> tasks completed in the last seven days.</p>
          <p><strong>{unfinished.length}</strong> unfinished tasks with past deadlines.</p>
          <p><strong>{planned.length}</strong> tasks had planned work blocks. Of their {formatDuration(plannedMs)} estimated time, {formatDuration(actualMs)} was recorded in focus sessions.</p>
          {unfinished.length > 0 && <Link to="/tasks" className="btn btn--sm">Review overdue tasks</Link>}
          {planned.length === 0 && <Link to="/calendar" className="btn btn--sm">Plan work blocks</Link>}
        </div>
      </section>
      {goals.length > 0 && <section className="card">
        <div className="card__header"><h2 className="card__title">Goals</h2></div>
        <div className="card__body analytics-goals">
          {goals.map(g => { const p = goalProgress(g, tasks, focusSessions); return <div key={g.id}>
            <strong>{g.emoji} {g.title}</strong><span className="subtle">{p.done} of {p.total} linked tasks done · {formatDuration(p.focusedMs)} focused</span>
            <ProgressBar value={p.pct} label={`${g.title}: ${p.pct}% of linked tasks completed`} />
          </div>; })}
          <p className="subtle">Goal progress is the share of linked tasks completed.</p>
        </div>
      </section>}
    </div>
  </div>;
};
