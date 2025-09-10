import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

type Task = { id:number; text:string; completed:boolean; };

function emailMeSummary() {
  const KEY_V4 = "task-tracker.tasks.v4";
  const KEY_V3 = "task-tracker.tasks.v3";
  const raw = localStorage.getItem(KEY_V4) ?? localStorage.getItem(KEY_V3) ?? "[]";
  let tasks: Task[] = [];
  try { tasks = JSON.parse(raw) as Task[]; } catch {}

  let to = localStorage.getItem("eskinder.email") ?? "";
  if (!to) {
    const entered = window.prompt("Enter your email for summaries:", "eskinder@example.com");
    if (!entered) return;
    to = entered.trim();
    localStorage.setItem("eskinder.email", to);
  }

  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const top = tasks.slice(0,5).map(t => `- ${t.text}${t.completed ? " (done)" : ""}`);

  const subject = encodeURIComponent("Your Task Tracker Summary");
  const body = encodeURIComponent([
    `Hi Eskinder,`,
    ``,
    `Here is your Task Tracker summary:`,
    `• Total tasks: ${total}`,
    `• Completed: ${done}`,
    ``,
    `Top items:`,
    ...top,
    ``,
    `— AstraFocus Nexus`
  ].join("\n"));

  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}

const Nav: React.FC = () => {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (!("Notification" in window)) setPerm("unsupported");
    else setPerm(Notification.permission);
  }, []);

  const request = async () => {
    if (!("Notification" in window)) { alert("Notifications are not supported in this browser."); return; }
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p !== "granted") alert("Notification permission denied.");
  };

  const link = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav__link active" : "nav__link";

  return (
    <nav className="nav">
      <div className="nav__brand">
        AstraFocus <span>Nexus</span>
      </div>

      <div className="nav__links">
        <NavLink to="/" end className={link}>🏠 Home</NavLink>
        <NavLink to="/wellness" className={link}>🧠 Wellness</NavLink>
        <NavLink to="/matrix" className={link}>🧭 Matrix</NavLink>
        <NavLink to="/goals" className={link}>🎯 Goals</NavLink>
        <NavLink to="/about" className={link}>ℹ️ About</NavLink>

        <button className="icon-btn" onClick={request} title="Enable notifications">
          {perm === "granted" ? "🔔" : "🔕"}
        </button>
        <button className="icon-btn" onClick={emailMeSummary} title="Email me a summary">📧</button>
      </div>

      <div className="nav__owner">Eskinder Kassahun • 2025</div>
    </nav>
  );
};

export default Nav;
