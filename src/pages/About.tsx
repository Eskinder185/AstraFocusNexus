import React from "react";
import PageHeader from "../components/PageHeader";

const About: React.FC = () => {
  return (
    <div className="card">
      <PageHeader icon="ℹ️" title="About" subtitle="What this app does and why" />

      {/* Mission */}
      <section style={{marginBottom:12}}>
        <h3>Our mission</h3>
        <p>
          <strong>AstraFocus Nexus</strong> turns a simple checklist into a supportive coach:
          it helps you choose what matters, work in focused bursts, and stay kind to yourself.
          No accounts needed—your data stays on your device.
        </p>
      </section>

      {/* Core features */}
      <section className="grid2" style={{gap:12, marginBottom:12}}>
        <div>
          <h3>Core features</h3>
          <ul>
            <li>🧠 <strong>Wellness check-ins:</strong> mood buttons + stress slider with gentle suggestions.</li>
            <li>⏰ <strong>Pomodoro sessions:</strong> focus & breaks with chime, tab flash, and optional notifications.</li>
            <li>🧭 <strong>Eisenhower Matrix:</strong> prioritize by Urgent/Important so you start with the right things.</li>
            <li>🎯 <strong>Goals:</strong> link tasks to outcomes (e.g., “Workout → Stronger body”) and see progress.</li>
            <li>🔔 <strong>Reminders:</strong> due-time notifications when you enable permission (browser popup).</li>
          </ul>
        </div>
        <div>
          <h3>Why it helps</h3>
          <ul>
            <li>Breaks big tasks into doable steps when stress is high.</li>
            <li>Protects energy with 25/5 focus cycles and gentle nudges.</li>
            <li>Makes priorities obvious—less busywork, more progress.</li>
          </ul>
        </div>
      </section>

      {/* Privacy & storage */}
      <section style={{marginBottom:12}}>
        <h3>Privacy & storage</h3>
        <p>
          Your tasks, settings, wellness entries, and goals are stored in <em>localStorage</em> in your browser:
        </p>
        <ul>
          <li><code>task-tracker.tasks.v4</code> — tasks</li>
          <li><code>pomodoro.settings</code> — timer settings</li>
          <li><code>task-tracker.goals.v1</code> — goals</li>
          <li><code>wellness.entry.YYYY-MM-DD</code> — daily mood/stress</li>
        </ul>
        <p className="muted">No cloud, no account. Clearing browser data or using a different device/browser will remove data.</p>
      </section>

      {/* Notifications help */}
      <section style={{marginBottom:12}}>
        <h3>Notifications</h3>
        <ul>
          <li>Click the bell (🔕 → 🔔) in the navigation or Pomodoro box to grant permission.</li>
          <li>Notifications work on <strong>HTTPS</strong> or <strong>localhost</strong>.</li>
          <li>If blocked: check your browser site settings → Notifications → “Allow”.</li>
        </ul>
      </section>

      {/* Tips */}
      <section style={{marginBottom:12}}>
        <h3>Tips</h3>
        <ul>
          <li>Press <strong>Enter</strong> in the task input to add quickly.</li>
          <li>Tag priorities as you go: UI / UN / NI / NN.</li>
          <li>Use the Wellness page when you feel stuck—pick one tiny step.</li>
        </ul>
      </section>

      {/* FAQ moved to its own page */}

      {/* Roadmap */}
      <section style={{marginBottom:12}}>
        <h3>Roadmap</h3>
        <ul>
          <li>📍 <strong>Location reminders:</strong> “Buy milk” near a grocery store.</li>
          <li>🎯 <strong>Focus mode:</strong> show only Today’s Top 3.</li>
          <li>🧰 <strong>Modes:</strong> Student / Job Seeker / Health / Finance templates.</li>
          <li>🕹️ <strong>Gamification:</strong> XP, streaks, badges, daily challenges.</li>
          <li>📧 <strong>Email summary:</strong> send daily/weekly reports automatically.</li>
        </ul>
      </section>

      {/* Credits */}
      <section>
        <h3>Credits & contact</h3>
        <p>Built by <strong>Eskinder Kassahun (2025)</strong>. Feedback or feature ideas? <a href="mailto:eskinder@example.com">Email me</a>.</p>
      </section>
    </div>
  );
};

export default About;
