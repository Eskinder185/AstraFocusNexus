import React, { useEffect, useMemo, useRef, useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import LiveBackground from "./LiveBackground";
import PomodoroTimer from "./PomodoroTimer";
import Nav from "./components/Nav";
import { celebrate } from "./utils/celebrate";
import Home from "./pages/Home";
import Wellness from "./pages/Wellness";
import Matrix from "./pages/Matrix";
import Goals from "./pages/Goals";
import About from "./pages/About";
import Faq from "./pages/Faq";

type Filter = "all" | "active" | "completed";
type Priority = "UI" | "UN" | "NI" | "NN";

interface Task {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
  dueAt?: string;
  remind?: boolean;
  notified?: boolean;
  pomos?: number;
  priority?: Priority;
  goalId?: number | null;
}

interface Goal {
  id: number;
  title: string;
  emoji?: string;
}

const TASKS_KEY = "task-tracker.tasks.v4";
const GOALS_KEY = "task-tracker.goals.v1";
const GOAL_PREF_KEY = "task-tracker.goalPref";
const WELLNESS_PREFIX = "wellness.entry.";

const todayKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${WELLNESS_PREFIX}${yyyy}-${mm}-${dd}`;
};

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [dueAt, setDueAt] = useState<string>("");
  const [remind, setRemind] = useState<boolean>(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  // Wellness
  const [mood, setMood] = useState<number>(3);
  const [stress, setStress] = useState<number>(3);

  // Goals + Priority
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalEmoji, setGoalEmoji] = useState("🎯");
  const [goalPref, setGoalPref] = useState<number | null>(null);
  const [priorityPref, setPriorityPref] = useState<Priority>("UI");
  const [pomoRunning, setPomoRunning] = useState<boolean>(false);

  // Load from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) try { setTasks(JSON.parse(raw)); } catch {}
    const graw = localStorage.getItem(GOALS_KEY);
    if (graw) try { setGoals(JSON.parse(graw)); } catch {}
    const gpref = localStorage.getItem(GOAL_PREF_KEY);
    if (gpref) try { setGoalPref(JSON.parse(gpref)); } catch {}
    const w = localStorage.getItem(todayKey());
    if (w) try {
      const o = JSON.parse(w);
      if (o.mood) setMood(o.mood);
      if (o.stress != null) setStress(o.stress);
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem(GOAL_PREF_KEY, JSON.stringify(goalPref)); }, [goalPref]);
  useEffect(() => {
    const k = todayKey();
    localStorage.setItem(k, JSON.stringify({ date: k.replace(WELLNESS_PREFIX, ""), mood, stress }));
  }, [mood, stress]);

  // Gentle nudge (~50m idle)
  const lastActiveRef = useRef<number>(Date.now());
  useEffect(() => {
    const onActive = () => lastActiveRef.current = Date.now();
    window.addEventListener("mousemove", onActive);
    window.addEventListener("keydown", onActive);
    window.addEventListener("click", onActive);
    const iv = window.setInterval(() => {
      if (Date.now() - lastActiveRef.current >= 50 * 60_000) {
        alert("Time to rest your eyes 🚶 — take 5 minutes.");
        lastActiveRef.current = Date.now();
      }
    }, 30_000);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("mousemove", onActive);
      window.removeEventListener("keydown", onActive);
      window.removeEventListener("click", onActive);
    };
  }, []);

  // Task ops
  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    const t: Task = {
      id: Date.now(),
      text,
      completed: false,
      createdAt: Date.now(),
      dueAt: dueAt || undefined,
      remind: remind || false,
      notified: false,
      pomos: 0,
      priority: priorityPref,
      goalId: goalPref ?? null,
    };
    setTasks(prev => [t, ...prev]);
    setInput("");
    setDueAt("");
    setRemind(false);
  };

  const toggleTask = (id: number) => {
    let willComplete = false;
    setTasks(prev => {
      const target = prev.find(t => t.id === id);
      willComplete = !!target && !target.completed;
      return prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    });
    if (willComplete) {
      // small celebration when a task is completed
      celebrate();
    }
  };

  const removeTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const clearCompleted = () =>
    setTasks(prev => prev.filter(t => !t.completed));

  const setTaskPriority = (id: number, p: Priority) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, priority: p } : t));

  // Derived
  const remaining = useMemo(() => tasks.filter(t => !t.completed).length, [tasks]);
  const filteredTasks = useMemo(
    () => filter === "active"
      ? tasks.filter(t => !t.completed)
      : filter === "completed"
      ? tasks.filter(t => t.completed)
      : tasks,
    [tasks, filter]
  );
  const activeTaskTitle = tasks.find(t => t.id === activeTaskId)?.text;

  // Notifications
  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Notifications not supported.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") alert("Notification permission denied.");
  };

  const showReminder = (task: Task) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification("Task Reminder ⏰", { body: task.text, tag: String(task.id) });
  };

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      let changed = false;
      const next = tasks.map(t => {
        if (!t.remind || t.notified || !t.dueAt) return t;
        const due = Date.parse(t.dueAt);
        if (!isNaN(due) && now >= due) {
          showReminder(t);
          changed = true;
          return { ...t, notified: true };
        }
        return t;
      });
      if (changed) setTasks(next);
    };
    const id = window.setInterval(tick, 30_000);
    tick();
    return () => window.clearInterval(id);
  }, [tasks]);

  const suggestBreakdown = () => {
    const t = tasks.find(t => !t.completed);
    if (t) alert(`Try this: Write 3 micro-steps for "${t.text}" and do the first in 2 minutes.`);
    else alert("Add a task first, then break it into 3 micro-steps.");
  };

  return (
    <HashRouter>
      <LiveBackground />
      <Nav />
      <div className="container">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Pomodoro</h2>
          <PomodoroTimer
            activeTaskTitle={activeTaskTitle}
            onRunningChange={setPomoRunning}
            onFocusComplete={() => {
              if (activeTaskId == null) return;
              setTasks(prev =>
                prev.map(t => t.id === activeTaskId
                  ? { ...t, pomos: (t.pomos ?? 0) + 1 }
                  : t
                )
              );
            }}
          />
        </div>

        <Routes>
          <Route path="/" element={
            <Home
              input={input} setInput={setInput}
              dueAt={dueAt} setDueAt={setDueAt}
              remind={remind} setRemind={setRemind}
              addTask={addTask}
              requestPermission={requestPermission}
              activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
              tasks={tasks} filteredTasks={filteredTasks}
              filter={filter} setFilter={setFilter}
              toggleTask={toggleTask} removeTask={removeTask}
              clearCompleted={clearCompleted} remaining={remaining}
              priorityPref={priorityPref} setPriorityPref={setPriorityPref}
              setTaskPriority={setTaskPriority}
              pomoRunning={pomoRunning}
            />
          } />
          <Route path="/wellness" element={
            <Wellness
              mood={mood} setMood={setMood}
              stress={stress} setStress={setStress}
              suggestBreakdown={suggestBreakdown}
            />
          } />
          <Route path="/matrix" element={
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Eisenhower Matrix</h2>
              <Matrix tasks={tasks} toggleTask={toggleTask} setTaskPriority={setTaskPriority} />
            </div>
          } />
          <Route path="/goals" element={
            <Goals
              goals={goals} setGoals={setGoals}
              goalTitle={goalTitle} setGoalTitle={setGoalTitle}
              goalEmoji={goalEmoji} setGoalEmoji={setGoalEmoji}
              setGoalPref={setGoalPref}
              tasks={tasks}
            />
          } />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<Faq />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
