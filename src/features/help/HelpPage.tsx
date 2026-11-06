import React from "react";
import { PageHeader } from "../../components/PageHeader";
import { Kbd } from "../../components/ui/Kbd";
import { NAV_ITEMS } from "../../app/nav";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["Mod", "K"], label: "Search, commands, and quick create" },
  { keys: ["C"], label: "New task" },
  { keys: ["/"], label: "Open search" },
  { keys: ["Space"], label: "Start or pause the timer (Focus Studio)" },
  { keys: ["Esc"], label: "Close a dialog or leave distraction-free mode" },
  { keys: ["?"], label: "Open this page" },
];

const SYNTAX: Array<[string, string]> = [
  ["today, tomorrow", "Due today or tomorrow"],
  ["mon … fri, saturday, sunday", "Next occurrence of that day (today counts)"],
  ["Dec 3, 3 December", "A specific date (next year if it has passed)"],
  ["6pm, 6:30 pm, at 7am, 18:00", "A time (a time without a date means today)"],
  ["!1  !2  !3  !4", "Do first · Schedule · Delegate · Later"],
];

const FAQ: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "Where is my data stored?",
    a: "In this browser’s local storage on this device. Nothing is sent to a server. Other devices and browsers won’t see it, and clearing site data deletes it. Use Settings → Export to keep a copy.",
  },
  {
    q: "I used the earlier version. What happened to my tasks?",
    a: "They were imported automatically the first time this version opened, with their goals, priorities, due times and Pomodoro counts. The original data was left untouched and a backup copy was made; you can download it from Settings.",
  },
  {
    q: "How do reminders work?",
    a: "Give a task a due date and time, then turn on “Remind me”. While AstraFocus is open in a tab, you’ll get a browser notification (if allowed) and an in-app message at that time. Reminders can’t arrive while every AstraFocus tab is closed.",
  },
  {
    q: "Does the focus timer keep running if I switch pages or refresh?",
    a: "Yes. The timer is based on clock time, not a counter, so it stays accurate across page changes, refreshes and sleep. If a session ends while the app is closed, it’s logged when you return.",
  },
  {
    q: "What do the four priorities mean?",
    a: "They follow the Eisenhower matrix. Do first: urgent and important. Schedule: important but not urgent, where long-term progress lives. Delegate: urgent but not important. Later: neither.",
  },
  {
    q: "Is there a calendar, projects, or sync across devices?",
    a: "Not yet. They’re on the roadmap and will appear in the sidebar once they work. AstraFocus doesn’t show features that aren’t real.",
  },
];

export const HelpPage: React.FC = () => (
  <div className="help-page">
    <PageHeader title="Help & shortcuts" description="AstraFocus helps you plan your time, organise your work, protect your focus, and make meaningful progress." />

    <div className="help-grid">
      <section className="card" aria-labelledby="h-start">
        <div className="card__header">
          <h2 id="h-start" className="card__title">
            Getting started
          </h2>
        </div>
        <ol className="card__body help-steps">
          <li>
            <strong>Capture.</strong> Press <Kbd keys={["C"]} /> and type naturally, e.g. “Lab report thu 9am !1”.
          </li>
          <li>
            <strong>Prioritise.</strong> Use the Priority Matrix to decide what matters, not just what’s loud.
          </li>
          <li>
            <strong>Focus.</strong> Press play on a task to link it to a focus session in Focus Studio.
          </li>
          <li>
            <strong>Reflect.</strong> Goals and the Overview show progress from the work you actually finished.
          </li>
        </ol>
      </section>

      <section className="card" aria-labelledby="h-keys">
        <div className="card__header">
          <h2 id="h-keys" className="card__title">
            Keyboard shortcuts
          </h2>
        </div>
        <div className="card__body">
          <dl className="shortcut-list">
            {SHORTCUTS.map(s => (
              <div key={s.label}>
                <dt>
                  <Kbd keys={s.keys} />
                  <span className="visually-hidden">{s.keys.join(" + ").replace("Mod", "Control or Command")}</span>
                </dt>
                <dd>{s.label}</dd>
              </div>
            ))}
            {NAV_ITEMS.map(i => (
              <div key={i.id}>
                <dt>
                  <Kbd keys={["G", i.goKey.toUpperCase()]} />
                  <span className="visually-hidden">G then {i.goKey.toUpperCase()}</span>
                </dt>
                <dd>Go to {i.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="card" aria-labelledby="h-syntax">
        <div className="card__header">
          <h2 id="h-syntax" className="card__title">
            Quick-add syntax
          </h2>
        </div>
        <div className="card__body">
          <table className="syntax-table">
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Means</th>
              </tr>
            </thead>
            <tbody>
              {SYNTAX.map(([k, v]) => (
                <tr key={k}>
                  <td>
                    <code>{k}</code>
                  </td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">Anything recognised appears as a chip before you save. Remove a chip to keep those words in the title.</p>
        </div>
      </section>

      <section className="card help-faq" aria-labelledby="h-faq">
        <div className="card__header">
          <h2 id="h-faq" className="card__title">
            Questions
          </h2>
        </div>
        <div className="card__body">
          {FAQ.map(f => (
            <details key={f.q} className="faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  </div>
);
