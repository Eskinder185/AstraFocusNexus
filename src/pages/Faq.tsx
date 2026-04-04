import React from "react";
import PageHeader from "../components/PageHeader";

const items: { id: string; question: string; answer: React.ReactNode }[] = [
  {
    id: "reminders",
    question: "How do reminders work?",
    answer: (
      <>
        Enable notifications (bell in the nav), set a due date on a task, and turn on <strong>Remind me at due time</strong>.
        The app checks periodically and sends a notification when the due time passes (if your browser allows it).
      </>
    ),
  },
  {
    id: "no-notification",
    question: "Why didn’t I get a notification?",
    answer: (
      <>
        Confirm the bell shows alerts are allowed in your browser. Some systems only notify when the tab is open or was
        recently active. See <strong>About → Privacy &amp; technical details → Notifications</strong> for more.
      </>
    ),
  },
  {
    id: "export",
    question: "Can I export my data?",
    answer: (
      <>
        Today you can copy from your browser’s storage tools or back up by keeping this device. A one-click export could be
        added later if there’s demand.
      </>
    ),
  },
  {
    id: "matrix",
    question: "What’s the Eisenhower Matrix?",
    answer: (
      <>
        It groups work by urgency and importance. Do <em>Urgent + Important</em> first; schedule <em>Not Urgent + Important</em>{" "}
        next; delegate or shorten <em>Urgent + Not Important</em>; trim <em>Neither</em> when you’re overloaded.
      </>
    ),
  },
  {
    id: "goals",
    question: "How are goals used?",
    answer: (
      <>
        Create a goal on the Goals page, optionally set it as the default for new tasks, then add tasks on Home. Progress bars
        show how many linked tasks are done.
      </>
    ),
  },
];

const Faq: React.FC = () => {
  return (
    <>
      <PageHeader
        icon="❓"
        title="FAQ"
        subtitle="Quick answers about reminders, the matrix, goals, and how your data stays local."
      />
      <section className="card faq-page" aria-labelledby="faq-intro">
        <p id="faq-intro" className="faq-intro">
          Browse the questions below. Each row expands in place—your place in the list stays put.
        </p>
        <h2 className="visually-hidden">
          Questions
        </h2>
        <ul className="faq-list">
          {items.map(entry => (
            <li key={entry.id} className="faq-list__item">
              <details className="faq">
                <summary className="faq__summary">
                  <span className="faq__question">{entry.question}</span>
                  <span className="faq__chevron" aria-hidden>
                    ▼
                  </span>
                </summary>
                <div className="faq__panel">
                  <div className="faq__answer">{entry.answer}</div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
};

export default Faq;
