import React, { useEffect, useMemo, useState } from "react";
import PomodoroTimer from "./PomodoroTimer";
import LiveBackground from "./LiveBackground";

type Filter = "all" | "active" | "completed";

interface Task {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
  /** ISO string like "2025-08-29T10:30" from <input type="datetime-local"> */
  dueAt?: string;
  /** true if we should notify when due */
  remind?: boolean;
  /** internal flag so we don't double-notify */
  notified?: boolean;
  /** completed focus sessions */
  pomos?: number;
}

const STORAGE_KEY = "task-tracker.tasks.v3";

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [dueAt, setDueAt] = useState<string>("");
  const [remind, setRemind] = useState<boolean>(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  // Load from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setTasks(JSON.parse(raw)); } catch {}
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    const newTask: Task = {
      id: Date.now(),
      text,
      completed: false,
      createdAt: Date.now(),
      dueAt: dueAt || undefined,
      remind: remind || false,
      notified: false,
      pomos: 0,
    };
    setTasks((prev) => [newTask, ...prev]);
    setInput("");
    setDueAt("");
    setRemind(false);
  };

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const removeTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const clearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  const remaining = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);

  const filteredTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((t) => !t.completed);
    if (filter === "completed") return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, filter]);

  // --- Notifications ---
  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") alert("Notification permission denied.");
  };

  const showReminder = (task: Task) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    new Notification("Task Reminder ⏰", {
      body: task.text,
      tag: String(task.id), // avoids duplicates
    });
  };

  // Check every 30s for due tasks that haven't been notified yet
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      let changed = false;
      const next = tasks.map((t) => {
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
    // Run once immediately
    tick();
    return () => window.clearInterval(id);
  }, [tasks]);

  // Pomodoro: when a focus session completes, increment pomo count on active task
  const handleFocusComplete = () => {
    if (activeTaskId == null) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeTaskId ? { ...t, pomos: (t.pomos ?? 0) + 1 } : t
      )
    );
  };
  const activeTaskTitle = tasks.find((t) => t.id === activeTaskId)?.text;

  return (
    <>
      {/* Live animated background + brand header */}
      <LiveBackground />
      <header className="brand">
        <div className="brand__logo">
          AstraFocus <span>Nexus</span>
        </div>
        <p className="brand__tag">Define • Do • Done</p>
      </header>

      {/* Main app container */}
      <div className="container">
        <h1 className="title">
          Task Tracker <span className="badge">✅</span>
        </h1>

        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            type="text"
            value={input}
            placeholder="Enter a task"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
          />
          <input
            className="input"
            style={{ minWidth: 220 }}
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            title="Due date & time"
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={remind}
              onChange={(e) => setRemind(e.target.checked)}
            />
            Remind me
          </label>
          <button className="btn" onClick={addTask}>Add Task</button>
          <button className="btn" onClick={requestPermission}>Enable Notifications</button>
        </div>

        {/* Pomodoro Panel */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Pomodoro</h2>
          <PomodoroTimer
            activeTaskTitle={activeTaskTitle}
            onFocusComplete={handleFocusComplete}
          />
        </div>

        <div className="controls">
          <div className="filters">
            <button className={`chip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button>
            <button className={`chip ${filter === "active" ? "active" : ""}`} onClick={() => setFilter("active")}>Active</button>
            <button className={`chip ${filter === "completed" ? "active" : ""}`} onClick={() => setFilter("completed")}>Completed</button>
          </div>

          <div className="meta">
            <span>{remaining} left</span>
            <button
              className="link"
              onClick={clearCompleted}
              disabled={tasks.every((t) => !t.completed)}
            >
              Clear completed
            </button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <p className="empty">No tasks here yet.</p>
        ) : (
          <ul className="list">
            {filteredTasks.map((task) => (
              <li className="item" key={task.id}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  title="Toggle complete"
                />
                <span className={`text ${task.completed ? "done" : ""}`}>
                  {task.text}
                  {task.dueAt && (
                    <small style={{ marginLeft: 8, color: "#475569" }}>
                      (due {new Date(task.dueAt).toLocaleString()})
                    </small>
                  )}
                  {task.remind && !task.notified && <small> • will remind</small>}
                  {task.remind && task.notified && <small> • reminded</small>}
                  {typeof task.pomos === "number" && task.pomos > 0 && (
                    <small style={{ marginLeft: 8, color: "#475569" }}>
                      • {task.pomos} pomos
                    </small>
                  )}
                </span>
                <button
                  className={`pill ${activeTaskId === task.id ? "active" : ""}`}
                  onClick={() =>
                    setActiveTaskId(activeTaskId === task.id ? null : task.id)
                  }
                  title="Set as active for Pomodoro"
                >
                  🎯 Focus
                </button>
                <button className="icon" onClick={() => removeTask(task.id)} aria-label="Delete">✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default App;

