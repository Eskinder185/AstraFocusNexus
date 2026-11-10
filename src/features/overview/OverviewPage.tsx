import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Flame,
  Lightbulb,
  ListChecks,
  Pause,
  Play,
  Plus,
  Sunrise,
  Target,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { useUIActions } from "../../app/ui";
import { EmptyState } from "../../components/ui/EmptyState";
import { ProgressBar, ProgressRing } from "../../components/ui/Progress";
import { formatPomodoroMs, modeLabel, usePomodoro } from "../../context/PomodoroContext";
import { useNow } from "../../hooks/useNow";
import { cx } from "../../lib/cx";
import { addDays, formatClock, formatDuration, formatTime, greeting, longDate, toDateKey } from "../../lib/dates";
import { useFocusOnTask } from "../focus/useFocusOnTask";
import { suggestSlot } from "../calendar/planner";
import { InlineQuickAdd } from "../tasks/TaskComposer";
import { TaskRow } from "../tasks/TaskRow";
import {
  buildInsights,
  completedOnDay,
  focusOnDay,
  goalProgress,
  groupOpenTasks,
  topPriorities,
} from "../workspace/selectors";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";

export const OverviewPage: React.FC = () => {
  const data = useWorkspace();
  const now = useNow();
  const { openComposer } = useUIActions();

  const groups = useMemo(() => groupOpenTasks(data.tasks, now), [data.tasks, now]);
  const top = useMemo(() => topPriorities(data.tasks, 3), [data.tasks]);
  const next = top[0];
  const nextGoal = next?.goalId ? data.goals.find(g => g.id === next.goalId) : undefined;
  const scheduledToday = data.tasks.filter(t => t.status === "todo" && t.scheduledAt != null && toDateKey(new Date(t.scheduledAt)) === toDateKey(now));
  const scheduledMinutes = scheduledToday.reduce((sum, t) => sum + (t.estimateMin ?? 30), 0);
  const focusToday = focusOnDay(data.focusSessions, now);
  const doneToday = completedOnDay(data.tasks, now);
  const dueTodayTotal = data.tasks.filter(t => t.dueDate === toDateKey(now)).length;
  const insights = useMemo(() => buildInsights(data, now), [data, now]);
  const isEmpty = data.tasks.length === 0 && data.goals.length === 0;

  const summary = (() => {
    const parts: string[] = [];
    if (groups.today.length) parts.push(`${groups.today.length} ${groups.today.length === 1 ? "task" : "tasks"} due today`);
    if (groups.overdue.length) parts.push(`${groups.overdue.length} overdue`);
    if (focusToday.ms > 0) parts.push(`${formatDuration(focusToday.ms)} focused so far`);
    if (!parts.length) return data.tasks.some(t => t.status === "todo") ? "Nothing is due today. A good day for important, unhurried work." : "Your day is a blank page.";
    return parts.join(" · ") + ".";
  })();

  return (
    <div className="overview">
      <header className="overview__hero">
        <div>
          <p className="eyebrow">{longDate(now)}</p>
          <h1 className="overview__greeting">
            {greeting(now)}. <span className="overview__greeting-sub">Let’s make today count.</span>
          </h1>
          <p className="overview__summary">{summary}</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => openComposer({ dueDate: toDateKey(now) })}>
          <Plus size={16} aria-hidden /> Plan a task for today
        </button>
      </header>

      {next && <NextAction task={next} goalTitle={nextGoal?.title} now={now} />}

      <section className="stat-strip card" aria-label="Today at a glance">
        <Stat icon={<CalendarClock size={16} />} label="Due today" value={groups.today.length} detail={dueTodayTotal ? `${dueTodayTotal - groups.today.length} of ${dueTodayTotal} done` : "Nothing scheduled"} />
        <Stat
          icon={<TriangleAlert size={16} />}
          label="Overdue"
          value={groups.overdue.length}
          tone={groups.overdue.length ? "danger" : undefined}
          detail={groups.overdue.length ? "Needs a decision" : "All clear"}
        />
        <Stat icon={<CheckCircle2 size={16} />} label="Done today" value={doneToday} tone={doneToday ? "success" : undefined} detail={doneToday ? "Keep the momentum" : "First win is the hardest"} />
        <Stat icon={<Timer size={16} />} label="Focused today" value={focusToday.ms ? formatDuration(focusToday.ms) : "0m"} detail={`${focusToday.sessions} ${focusToday.sessions === 1 ? "session" : "sessions"}`} />
        <Stat icon={<CalendarClock size={16} />} label="Planned work" value={formatDuration(scheduledMinutes * 60_000)} detail={scheduledToday.length ? `${scheduledToday.length} work blocks` : "No work blocks yet"} />
      </section>

      {isEmpty ? (
        <section className="card">
          <EmptyState
            icon={<Sunrise size={20} />}
            title="Welcome to AstraFocus"
            actions={
              <>
                <button type="button" className="btn btn--primary" onClick={() => openComposer()}>
                  <Plus size={16} aria-hidden /> Add your first task
                </button>
                <Link to="/goals" className="btn">
                  Set a goal
                </Link>
                <Link to="/focus" className="btn btn--ghost">
                  Try a focus session
                </Link>
              </>
            }
          >
            Capture what’s on your mind, choose what matters most, then protect time to do it. Everything stays on this device.
          </EmptyState>
        </section>
      ) : (
        <div className="overview__grid">
          <div className="overview__main">
            {top.length > 1 && <section className="card" aria-labelledby="ov-priorities">
              <div className="card__header">
                <h2 id="ov-priorities" className="card__title">
                  <Flame size={16} aria-hidden /> Other priorities
                </h2>
                <Link to="/matrix" className="btn btn--ghost btn--sm">
                  Matrix <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
              <div className="card__body card__body--list">
                {top.length > 1 ? (
                  <PriorityList now={now} excludeId={next?.id} />
                ) : (
                  <EmptyState compact icon={<CheckCircle2 size={18} />} title="Nothing open">
                    Every task is done. Add what’s next when you’re ready.
                  </EmptyState>
                )}
              </div>
            </section>}

            <section className="card" aria-labelledby="ov-today">
              <div className="card__header">
                <h2 id="ov-today" className="card__title">
                  <ListChecks size={16} aria-hidden /> Today
                </h2>
                <Link to="/tasks" className="btn btn--ghost btn--sm">
                  All tasks <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
              <div className="card__body card__body--list">
                <InlineQuickAdd label="Add a task for today" placeholder="Add for today… try “Call advisor 3pm”" defaults={{ dueDate: toDateKey(now) }} />
                {groups.overdue.length + groups.today.length === 0 ? (
                  <p className="overview__note">Nothing due today. Tasks with today’s date will collect here.</p>
                ) : (
                  <>
                    {groups.overdue.length > 0 && (
                      <>
                        <p className="list-label list-label--danger">Overdue · {groups.overdue.length}</p>
                        <ul role="list" className="task-list">
                          {groups.overdue.map(t => (
                            <TaskRow key={t.id} task={t} now={now} />
                          ))}
                        </ul>
                      </>
                    )}
                    {groups.today.length > 0 && (
                      <>
                        {groups.overdue.length > 0 && <p className="list-label">Due today · {groups.today.length}</p>}
                        <ul role="list" className="task-list">
                          {groups.today.map(t => (
                            <TaskRow key={t.id} task={t} now={now} />
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>

          <aside className="overview__side" aria-label="Focus, schedule and progress">
            <FocusCard focusMs={focusToday.ms} sessions={focusToday.sessions} />
            <TimelineCard now={now} />
            <GoalsCard />
            {insights.length > 0 && (
              <section className="card" aria-labelledby="ov-insights">
                <div className="card__header">
                  <h2 id="ov-insights" className="card__title">
                    <Lightbulb size={16} aria-hidden /> Insights
                  </h2>
                </div>
                <ul role="list" className="card__body insights">
                  {insights.map(i => (
                    <li key={i.id} className={cx("insight", `insight--${i.tone}`)}>
                      {i.text}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; detail: string; tone?: "danger" | "success" }> = ({
  icon,
  label,
  value,
  detail,
  tone,
}) => (
  <div className={cx("stat", tone && `stat--${tone}`)}>
    <p className="stat__label">
      <span aria-hidden>{icon}</span>
      {label}
    </p>
    <p className="stat__value tabular">{value}</p>
    <p className="stat__detail">{detail}</p>
  </div>
);

const NextAction: React.FC<{ task: import("../workspace/schema").Task; goalTitle?: string; now: Date }> = ({ task, goalTitle, now }) => {
  const { openTask } = useUIActions();
  const { updateTask } = useWorkspaceActions();
  const focusOnTask = useFocusOnTask();
  const { tasks } = useWorkspace();
  const suggested = task.scheduledAt ? null : suggestSlot(task, tasks, now);
  return <section className="card next-action" aria-labelledby="next-action-title">
    <div>
      <p className="eyebrow">Next best action · based on priority and deadline</p>
      <h2 id="next-action-title">{task.title}</h2>
      <p className="subtle">
        {task.priority === "UI" ? "Do first" : task.priority === "NI" ? "Important" : "Next task"}
        {" · "}{task.estimateMin ? `${task.estimateMin} min estimated` : "Set an estimate"}
        {task.dueDate ? ` · Due ${new Date(task.dueDate + "T12:00:00").toLocaleDateString()}` : ""}
        {goalTitle ? ` · ${goalTitle}` : ""}
      </p>
      {task.scheduledAt && <p className="subtle">Planned {new Date(task.scheduledAt).toLocaleString()}</p>}
      {suggested && <p className="subtle">Open slot: {new Date(suggested.at).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })} · {suggested.durationMin} min. Based on existing work blocks, 9 AM–5 PM.</p>}
    </div>
    <div className="row row--wrap">
      <button type="button" className="btn btn--primary" onClick={() => focusOnTask(task.id)}><Play size={16} aria-hidden /> Start focus</button>
      <button type="button" className="btn" onClick={() => openTask(task.id)}>Details</button>
      {task.dueDate && <button type="button" className="btn btn--ghost" onClick={() => updateTask(task.id, { dueDate: toDateKey(addDays(now, 1)) })}>Move deadline to tomorrow</button>}
      <Link to="/calendar" className="btn btn--ghost">Schedule</Link>
      {suggested && <button type="button" className="btn btn--ghost" title={suggested.reason} onClick={() => updateTask(task.id, { scheduledAt: suggested.at })}>Use open slot</button>}
    </div>
  </section>;
};

const PriorityList: React.FC<{ now: Date; excludeId?: string }> = ({ now, excludeId }) => {
  const { tasks } = useWorkspace();
  const { updateTask } = useWorkspaceActions();
  const top = topPriorities(tasks, 3).filter(t => t.id !== excludeId);
  const tomorrow = toDateKey(addDays(now, 1));
  return (
    <ol role="list" className="task-list task-list--ranked">
      {top.map((t, i) => (
        <TaskRow
          key={t.id}
          task={t}
          now={now}
          leading={
            <span className="rank tabular" aria-label={`Priority ${i + 1}`}>
              {i + 1}
            </span>
          }
          trailing={
            t.dueDate !== tomorrow && (
              <button
                type="button"
                className="btn btn--ghost btn--sm task-row__defer"
                onClick={() => updateTask(t.id, { dueDate: tomorrow })}
                title="Move to tomorrow"
                aria-label={`Move “${t.title}” to tomorrow`}
              >
                Tomorrow
              </button>
            )
          }
        />
      ))}
    </ol>
  );
};

const FocusCard: React.FC<{ focusMs: number; sessions: number }> = ({ focusMs, sessions }) => {
  const pomo = usePomodoro();
  const { tasks, prefs } = useWorkspace();
  const focusOnTask = useFocusOnTask();
  const linked = prefs.activeTaskId ? tasks.find(t => t.id === prefs.activeTaskId) : undefined;
  const suggestion = !linked ? topPriorities(tasks, 1)[0] : undefined;
  const frac = pomo.showMiniTimer ? 1 - pomo.remainingMs / Math.max(1, pomo.segmentDurationMs) : 0;

  return (
    <section className="card focus-card" aria-labelledby="ov-focus">
      <div className="card__header">
        <h2 id="ov-focus" className="card__title">
          <Timer size={16} aria-hidden /> Focus
        </h2>
        <span className="subtle tabular">
          {formatDuration(focusMs)} today · {sessions} {sessions === 1 ? "session" : "sessions"}
        </span>
      </div>
      <div className="card__body focus-card__body">
        <ProgressRing value={frac} size={76} stroke={5} className={cx("focus-card__ring", pomo.mode !== "focus" && "is-break")}>
          <span className="tabular">{formatPomodoroMs(pomo.remainingMs)}</span>
        </ProgressRing>
        <div className="focus-card__info">
          <p className="focus-card__state">
            {pomo.running ? modeLabel(pomo.mode) : pomo.phase === "paused" ? `${modeLabel(pomo.mode)} · paused` : "Ready when you are"}
          </p>
          <p className="focus-card__task">
            {linked ? (
              <>
                <span className="subtle">On: </span>
                {linked.title}
              </>
            ) : suggestion ? (
              <>
                <span className="subtle">Suggested: </span>
                {suggestion.title}
              </>
            ) : (
              <span className="subtle">No task linked</span>
            )}
          </p>
          <div className="row">
            {pomo.running ? (
              <button type="button" className="btn btn--sm" onClick={pomo.pause}>
                <Pause size={14} aria-hidden /> Pause
              </button>
            ) : pomo.phase === "paused" ? (
              <button type="button" className="btn btn--sm btn--primary" onClick={pomo.resume}>
                <Play size={14} aria-hidden /> Resume
              </button>
            ) : linked || suggestion ? (
              <button type="button" className="btn btn--sm btn--primary" onClick={() => focusOnTask((linked ?? suggestion)!.id)}>
                <Play size={14} aria-hidden /> Start {pomo.settings.focusMin} min
              </button>
            ) : null}
            <Link to="/focus" className="btn btn--sm btn--ghost">
              Studio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

/** Tasks with a time today plus today's logged focus sessions, in order. */
const TimelineCard: React.FC<{ now: Date }> = ({ now }) => {
  const { tasks, focusSessions } = useWorkspace();
  const key = toDateKey(now);
  const items = useMemo(() => {
    const out: Array<{ id: string; at: number; label: string; kind: "task" | "focus"; done?: boolean; time: string }> = [];
    for (const t of tasks) {
      if (t.scheduledAt && toDateKey(new Date(t.scheduledAt)) === key) {
        out.push({ id: `block-${t.id}`, at: t.scheduledAt, label: `${t.title} · ${t.estimateMin ?? 30} min planned`, kind: "task", done: t.status === "done", time: formatClock(t.scheduledAt) });
      }
      if (t.dueDate === key && t.dueTime) {
        const [h, m] = t.dueTime.split(":").map(Number);
        out.push({ id: t.id, at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).getTime(), label: t.title, kind: "task", done: t.status === "done", time: formatTime(t.dueTime) });
      }
    }
    for (const s of focusSessions) {
      if (toDateKey(new Date(s.endedAt)) !== key) continue;
      const start = s.endedAt - s.focusedMs;
      const task = s.taskId ? tasks.find(t => t.id === s.taskId) : undefined;
      out.push({
        id: s.id,
        at: start,
        label: `${formatDuration(s.focusedMs)} focus${task ? ` · ${task.title}` : ""}`,
        kind: "focus",
        time: formatClock(start),
      });
    }
    return out.sort((a, b) => a.at - b.at);
  }, [tasks, focusSessions, key, now]);

  const nowIndex = items.findIndex(i => i.at > now.getTime());

  return (
    <section className="card" aria-labelledby="ov-timeline">
      <div className="card__header">
        <h2 id="ov-timeline" className="card__title">
          <CalendarClock size={16} aria-hidden /> Today’s timeline
        </h2>
      </div>
      <div className="card__body">
        {items.length === 0 ? (
          <p className="overview__note">Give today’s tasks a time, or run a focus session, and your day will take shape here.</p>
        ) : (
          <ol role="list" className="timeline">
            {items.map((item, i) => (
              <React.Fragment key={item.id}>
                {i === nowIndex && <NowMarker now={now} />}
                <li className={cx("timeline__item", `timeline__item--${item.kind}`, item.done && "is-done")}>
                  <span className="timeline__time tabular">{item.time}</span>
                  <span className="timeline__dot" aria-hidden />
                  <span className="timeline__label">
                    {item.kind === "focus" && <span className="visually-hidden">Focus session: </span>}
                    {item.label}
                  </span>
                </li>
              </React.Fragment>
            ))}
            {nowIndex === -1 && <NowMarker now={now} />}
          </ol>
        )}
      </div>
    </section>
  );
};

const NowMarker: React.FC<{ now: Date }> = ({ now }) => (
  <li className="timeline__now">
    <span className="timeline__time tabular">{formatClock(now.getTime())}</span>
    <span className="timeline__now-line" aria-hidden />
    <span className="visually-hidden">Now</span>
  </li>
);

const GoalsCard: React.FC = () => {
  const { goals, tasks, focusSessions } = useWorkspace();
  if (!goals.length) return null;
  const rows = goals
    .map(g => ({ g, p: goalProgress(g, tasks, focusSessions) }))
    .sort((a, b) => (b.p.next ? 1 : 0) - (a.p.next ? 1 : 0))
    .slice(0, 3);
  return (
    <section className="card" aria-labelledby="ov-goals">
      <div className="card__header">
        <h2 id="ov-goals" className="card__title">
          <Target size={16} aria-hidden /> Goals
        </h2>
        <Link to="/goals" className="btn btn--ghost btn--sm">
          All <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <ul role="list" className="card__body goal-mini-list">
        {rows.map(({ g, p }) => (
          <li key={g.id} className="goal-mini">
            <div className="goal-mini__top">
              <span className="goal-mini__emoji" aria-hidden>
                {g.emoji}
              </span>
              <span className="goal-mini__title">{g.title}</span>
              <span className="subtle tabular">{p.total ? `${p.done}/${p.total}` : "No tasks"}</span>
            </div>
            <ProgressBar value={p.pct} label={`${g.title}: ${p.pct}% of linked tasks done`} />
            {p.next && (
              <p className="goal-mini__next">
                <span className="subtle">Next:</span> {p.next.title}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
