import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAppToast } from "../context/AppToast";

type Task = { id: number; text: string; completed: boolean };

function emailMeSummary() {
  const KEY_V4 = "task-tracker.tasks.v4";
  const KEY_V3 = "task-tracker.tasks.v3";
  const raw = localStorage.getItem(KEY_V4) ?? localStorage.getItem(KEY_V3) ?? "[]";
  let tasks: Task[] = [];
  try {
    tasks = JSON.parse(raw) as Task[];
  } catch {}

  let to = localStorage.getItem("eskinder.email") ?? "";
  if (!to) {
    const entered = window.prompt("Enter your email for summaries:\n", "eskinder@example.com");
    if (!entered) return;
    to = entered.trim();
    localStorage.setItem("eskinder.email", to);
  }

  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const top = tasks.slice(0, 5).map(t => `- ${t.text}${t.completed ? " (done)" : ""}`);

  const subject = encodeURIComponent("Your Task Tracker Summary");
  const body = encodeURIComponent(
    [
      "Hi Eskinder,",
      "",
      "Here is your Task Tracker summary:",
      `- Total tasks: ${total}`,
      `- Completed: ${done}`,
      "",
      "Top items:",
      ...top,
      "",
      "- AstraFocus Nexus",
    ].join("\n")
  );

  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}

const navItems: { to: string; end?: boolean; icon: string; label: string }[] = [
  { to: "/", end: true, icon: "🏠", label: "Home" },
  { to: "/focus", icon: "⏱️", label: "Focus" },
  { to: "/wellness", icon: "🧠", label: "Wellness" },
  { to: "/matrix", icon: "🧭", label: "Matrix" },
  { to: "/goals", icon: "🎯", label: "Goals" },
  { to: "/about", icon: "ℹ️", label: "About" },
  { to: "/faq", icon: "❓", label: "FAQ" },
];

const Nav: React.FC = () => {
  const { showToast } = useAppToast();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem("task-tracker.theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    if (!("Notification" in window)) setPerm("unsupported");
    else setPerm(Notification.permission);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("theme-light");
    else root.classList.remove("theme-light");
    try {
      localStorage.setItem("task-tracker.theme", theme);
    } catch {}
  }, [theme]);

  const testNotify = () => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification("Notifications enabled", { body: "You'll get alerts from the app." });
    } catch {}
  };

  const request = async () => {
    if (!("Notification" in window)) {
      showToast("This browser doesn’t support notifications.", { tone: "warning" });
      return;
    }
    if (Notification.permission === "denied") {
      setPerm("denied");
      showToast(
        "Notifications are blocked. Open site settings for this page and set Notifications to Allow, then try again.",
        { tone: "warning", durationMs: 12_000 }
      );
      return;
    }
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p !== "granted") {
      showToast("Notifications weren’t enabled. You can try again anytime from this bell.", { tone: "warning" });
    } else {
      testNotify();
    }
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav__link nav__link--active" : "nav__link";

  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav__shell">
        <div className="nav__cluster">
          <div className="nav__brand">
            AstraFocus <span>Nexus</span>
          </div>
          <div className="nav__utils" role="toolbar" aria-label="Quick actions">
            <button type="button" className="icon-btn" onClick={request} title="Enable notifications" aria-label="Enable notifications">
              <span className="nav__util-icon" aria-hidden>
                {perm === "granted" ? "🔔" : "🔕"}
              </span>
            </button>
            <button type="button" className="icon-btn" onClick={emailMeSummary} title="Email me a summary" aria-label="Email me a summary">
              <span className="nav__util-icon" aria-hidden>
                📧
              </span>
            </button>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title="Toggle theme"
              aria-label="Toggle light or dark theme"
            >
              <span className="nav__util-icon" aria-hidden>
                {theme === "light" ? "🌞" : "🌙"}
              </span>
            </button>
            <a
              href="https://eskinder.dev/"
              className="nav__portfolio-btn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Portfolio website (opens in a new tab)"
            >
              <svg
                className="nav__portfolio-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                focusable={false}
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span className="nav__portfolio-label" aria-hidden>
                Portfolio
              </span>
            </a>
          </div>
        </div>

        <div className="nav__track">
          <div className="nav__links">
            {navItems.map(({ to, end, icon, label }) => (
              <NavLink key={to} to={to} end={end} className={linkClass}>
                <span className="nav__link-icon" aria-hidden>
                  {icon}
                </span>
                <span className="nav__link-text">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="nav__owner">Eskinder Kassahun · 2026</div>
      </div>
    </nav>
  );
};

export default Nav;
