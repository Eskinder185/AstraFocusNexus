import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useUIActions } from "../../app/ui";
import { PageHeader } from "../../components/PageHeader";
import { addDays, formatClock, toDateKey } from "../../lib/dates";
import { useFocusOnTask } from "../focus/useFocusOnTask";
import type { Task } from "../workspace/schema";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";

type View = "day" | "week" | "month" | "agenda";
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const startWeek = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
const dateAt = (day: Date, hour: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).getTime();
const sameDay = (ts: number, day: Date) => toDateKey(new Date(ts)) === toDateKey(day);

export const CalendarPage: React.FC = () => {
  const { tasks } = useWorkspace();
  const { updateTask } = useWorkspaceActions();
  const { openComposer, openTask } = useUIActions();
  const focusOnTask = useFocusOnTask();
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<View>("week");
  const [pickedTask, setPickedTask] = useState("");
  const scheduled = useMemo(() => tasks.filter(t => t.scheduledAt != null).sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0)), [tasks]);
  const unscheduled = tasks.filter(t => t.status === "todo" && t.scheduledAt == null);
  const selected = unscheduled.find(t => t.id === pickedTask);
  const start = view === "month" ? new Date(cursor.getFullYear(), cursor.getMonth(), 1) : view === "day" ? cursor : startWeek(cursor);
  const days = view === "month"
    ? Array.from({ length: 42 }, (_, i) => addDays(startWeek(start), i))
    : Array.from({ length: view === "day" ? 1 : 7 }, (_, i) => addDays(start, i));
  const move = (delta: number) => setCursor(d => view === "month" ? new Date(d.getFullYear(), d.getMonth() + delta, 1) : addDays(d, delta * (view === "day" ? 1 : 7)));
  const place = (taskId: string, at: number) => {
    if (at < Date.now()) return;
    if (!tasks.some(t => t.id === taskId)) return;
    updateTask(taskId, { scheduledAt: at });
    setPickedTask("");
  };
  const drop = (event: React.DragEvent, at: number) => {
    event.preventDefault();
    place(event.dataTransfer.getData("text/x-astra-task"), at);
  };
  const block = (task: Task) => (
    <div key={task.id} className={"calendar-block" + (task.status === "done" ? " is-done" : "")}
      draggable onDragStart={event => event.dataTransfer.setData("text/x-astra-task", task.id)}>
      <button type="button" onClick={() => openTask(task.id)}>
        <strong>{task.title}</strong>
        <span>{formatClock(task.scheduledAt!)} · {task.estimateMin ?? 30} min</span>
      </button>
      <button type="button" className="calendar-block__focus" onClick={() => focusOnTask(task.id)} aria-label={`Focus on ${task.title}`}>Focus</button>
    </div>
  );

  return <div className="calendar-page">
    <PageHeader title="Calendar" description="Plan work blocks separately from deadlines." actions={
      <button type="button" className="btn btn--primary" onClick={() => openComposer()}><Plus size={16} aria-hidden /> New task</button>
    } />
    <div className="calendar-toolbar card">
      <div className="row">
        <button type="button" className="btn btn--sm" onClick={() => move(-1)} aria-label="Previous period"><ChevronLeft size={16} /></button>
        <button type="button" className="btn btn--sm" onClick={() => setCursor(new Date())}>Today</button>
        <button type="button" className="btn btn--sm" onClick={() => move(1)} aria-label="Next period"><ChevronRight size={16} /></button>
        <strong>{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
      </div>
      <div className="segmented" aria-label="Calendar view">
        {(["day", "week", "month", "agenda"] as const).map(v => <button key={v} type="button" aria-pressed={view === v} className={view === v ? "is-active" : ""} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
      </div>
    </div>
    <div className="calendar-layout">
      <aside className="card calendar-backlog">
        <div className="card__header"><h2 className="card__title">To schedule</h2><span className="subtle">{unscheduled.length}</span></div>
        <div className="card__body">
          <label className="label" htmlFor="calendar-task">Choose a task, then choose a time</label>
          <select id="calendar-task" className="select" value={pickedTask} onChange={e => setPickedTask(e.target.value)}>
            <option value="">Select task</option>
            {unscheduled.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          {selected && <p className="subtle">Placing: {selected.title} · {selected.estimateMin ?? 30} min</p>}
          <ul role="list" className="calendar-backlog__list">
            {unscheduled.slice(0, 30).map(t => <li key={t.id} draggable onDragStart={e => e.dataTransfer.setData("text/x-astra-task", t.id)}>
              <button type="button" onClick={() => setPickedTask(t.id)}>{t.title}</button>
            </li>)}
          </ul>
        </div>
      </aside>
      <section className="card calendar-content" aria-label={view + " schedule"}>
        {view === "agenda" ? <div className="calendar-agenda">
          {days.map(day => <section key={toDateKey(day)}>
            <h2>{day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</h2>
            {scheduled.filter(t => sameDay(t.scheduledAt!, day)).map(block)}
            {!scheduled.some(t => sameDay(t.scheduledAt!, day)) && <p className="subtle">No work blocks</p>}
          </section>)}
        </div> : view === "month" ? <div className="calendar-month">
          {days.map(day => <div key={toDateKey(day)} className="calendar-month__day" onDragOver={e => e.preventDefault()} onDrop={e => drop(e, dateAt(day, 9))}>
            <button type="button" className="calendar-day-label" onClick={() => { setCursor(day); setView("day"); }}>{day.getDate()}</button>
            {scheduled.filter(t => sameDay(t.scheduledAt!, day)).map(block)}
            {pickedTask && dateAt(day, 9) >= Date.now() && <button type="button" className="calendar-place" onClick={() => place(pickedTask, dateAt(day, 9))}>Schedule at 9 AM</button>}
          </div>)}
        </div> : <div className="calendar-grid" style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(9rem, 1fr))` }}>
          <span className="calendar-grid__corner" />
          {days.map(day => <strong key={toDateKey(day)} className="calendar-grid__heading">{day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</strong>)}
          {HOURS.map(hour => <React.Fragment key={hour}>
            <span className="calendar-grid__hour">{formatClock(dateAt(cursor, hour))}</span>
            {days.map(day => <div key={toDateKey(day)} className="calendar-grid__slot" onDragOver={e => e.preventDefault()} onDrop={e => drop(e, dateAt(day, hour))}>
              {scheduled.filter(t => sameDay(t.scheduledAt!, day) && new Date(t.scheduledAt!).getHours() === hour).map(block)}
              {pickedTask && dateAt(day, hour) >= Date.now() && <button type="button" className="calendar-place" onClick={() => place(pickedTask, dateAt(day, hour))}>Place here</button>}
            </div>)}
          </React.Fragment>)}
        </div>}
      </section>
    </div>
  </div>;
};
