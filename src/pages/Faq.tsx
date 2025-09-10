import React from "react";
import PageHeader from "../components/PageHeader";

const Faq: React.FC = () => {
  return (
    <div className="card">
      <PageHeader icon="❓" title="FAQ" subtitle="Answers to common questions" />

      <section style={{marginBottom:12}}>
        <details className="faq">
          <summary>How do reminders work?</summary>
          <p>Enable notifications (bell icon), set a due date, and toggle “Remind me”. The app checks about every 30 seconds and notifies when due.</p>
        </details>

        <details className="faq">
          <summary>Why didn’t I get a notification?</summary>
          <p>Ensure you clicked the bell and your browser shows “Allowed”. Some platforms only notify when the page is open or recently active.</p>
        </details>

        <details className="faq">
          <summary>Can I export my data?</summary>
          <p>You can copy values from your browser’s localStorage or add a simple export button later. Ask and I’ll wire one up.</p>
        </details>

        <details className="faq">
          <summary>What’s the Eisenhower Matrix?</summary>
          <p>Organize by urgency and importance. Do <em>Urgent + Important</em> first; schedule <em>Not Urgent + Important</em> next.</p>
        </details>

        <details className="faq">
          <summary>How are goals used?</summary>
          <p>Create a goal, then attach new tasks to it. Progress bars show completed vs total tasks per goal.</p>
        </details>
      </section>
    </div>
  );
};

export default Faq;

