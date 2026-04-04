import React from "react";
import PageHeader from "../components/PageHeader";

const About: React.FC = () => {
  return (
    <div className="about-page">
      <PageHeader
        icon="ℹ️"
        title="About"
        subtitle="AstraFocus Nexus blends tasks, focus, and kindness—built to feel calm, clear, and in your control."
      />

      <article className="card about-section">
        <header className="about-section__head">
          <span className="about-section__icon" aria-hidden>
            🚀
          </span>
          <div>
            <h2 className="about-section__title">Our mission</h2>
            <p className="about-section__kicker">Local-first · No account required</p>
          </div>
        </header>
        <div className="about-prose">
          <p>
            <strong>AstraFocus Nexus</strong> turns a simple checklist into a supportive coach: it helps you choose what
            matters, work in focused bursts, and stay kind to yourself. Your tasks and preferences stay in your
            browser—nothing is uploaded to our servers.
          </p>
        </div>
      </article>

      <article className="card about-section">
        <header className="about-section__head">
          <span className="about-section__icon" aria-hidden>
            ⚡
          </span>
          <h2 className="about-section__title">What you can do here</h2>
        </header>
        <ul className="about-feature-grid">
          <li className="feature-item about-feature">
            <span className="about-feature__icon" aria-hidden>
              🧠
            </span>
            <div>
              <h3 className="about-feature__name">Wellness check-ins</h3>
              <p className="about-feature__desc">Mood and stress, with suggestions tied to your task list.</p>
            </div>
          </li>
          <li className="feature-item about-feature">
            <span className="about-feature__icon" aria-hidden>
              ⏱️
            </span>
            <div>
              <h3 className="about-feature__name">Pomodoro sessions</h3>
              <p className="about-feature__desc">Focus and breaks with optional sound, tab attention, and notifications.</p>
            </div>
          </li>
          <li className="feature-item about-feature">
            <span className="about-feature__icon" aria-hidden>
              🧭
            </span>
            <div>
              <h3 className="about-feature__name">Eisenhower matrix</h3>
              <p className="about-feature__desc">See urgent vs important work at a glance and move tasks between quadrants.</p>
            </div>
          </li>
          <li className="feature-item about-feature">
            <span className="about-feature__icon" aria-hidden>
              🎯
            </span>
            <div>
              <h3 className="about-feature__name">Goals &amp; progress</h3>
              <p className="about-feature__desc">Link tasks to outcomes and track completion over time.</p>
            </div>
          </li>
          <li className="feature-item about-feature">
            <span className="about-feature__icon" aria-hidden>
              🔔
            </span>
            <div>
              <h3 className="about-feature__name">Due reminders</h3>
              <p className="about-feature__desc">Browser notifications when you allow them and set a due time.</p>
            </div>
          </li>
        </ul>
      </article>

      <article className="card about-section">
        <header className="about-section__head">
          <span className="about-section__icon" aria-hidden>
            💡
          </span>
          <h2 className="about-section__title">Why it helps</h2>
        </header>
        <ul className="about-benefits">
          <li>
            <span aria-hidden>🎯</span>
            <span>Turns vague stress into one small, concrete next step.</span>
          </li>
          <li>
            <span aria-hidden>⚡</span>
            <span>Protects attention with timed focus and gentle breaks.</span>
          </li>
          <li>
            <span aria-hidden>📈</span>
            <span>Makes priorities visible so busywork doesn’t crowd out what matters.</span>
          </li>
        </ul>
      </article>

      <article className="card about-section">
        <header className="about-section__head">
          <span className="about-section__icon" aria-hidden>
            💫
          </span>
          <h2 className="about-section__title">Quick tips</h2>
        </header>
        <ul className="about-tips">
          <li>
            Press <kbd>Enter</kbd> in the task field on Home to add a task quickly.
          </li>
          <li>
            Set priority with the tiles on Home—codes <strong>UI</strong>, <strong>UN</strong>, <strong>NI</strong>,{" "}
            <strong>NN</strong> match the matrix.
          </li>
          <li>
            On Wellness, use <strong>Break down 3 steps</strong> when you feel stuck—it reads your open tasks.
          </li>
        </ul>
      </article>

      <article className="card about-section">
        <header className="about-section__head">
          <span className="about-section__icon" aria-hidden>
            🔒
          </span>
          <h2 className="about-section__title">Privacy &amp; technical details</h2>
        </header>
        <p className="about-lead">
          Everything runs in your browser. Expand a topic below for storage keys and notification tips.
        </p>

        <details className="about-disclosure">
          <summary>Privacy &amp; local storage</summary>
          <div className="about-disclosure__body about-prose">
            <p>Your data is stored in <em>localStorage</em> on this device only:</p>
            <ul className="about-code-list">
              <li>
                <code>task-tracker.tasks.v4</code> — tasks
              </li>
              <li>
                <code>pomodoro.settings</code> — timer lengths and options
              </li>
              <li>
                <code>pomodoro.session.v1</code> — active session (mode, end time, pause state)
              </li>
              <li>
                <code>task-tracker.goals.v1</code> — goals
              </li>
              <li>
                <code>wellness.entry.YYYY-MM-DD</code> — daily mood and stress
              </li>
            </ul>
            <p className="about-muted">
              Clearing site data, using private browsing, or switching browsers/devices will not carry your list over.
              There is no cloud sync or sign-in in this version.
            </p>
          </div>
        </details>

        <details className="about-disclosure">
          <summary>Notifications</summary>
          <div className="about-disclosure__body about-prose">
            <ul>
              <li>Use the bell in the nav or the alerts control on the Focus page to request permission when your browser asks.</li>
              <li>Notifications require a secure context (<strong>HTTPS</strong> or <strong>localhost</strong>).</li>
              <li>If nothing appears, open site settings for this page and set Notifications to <strong>Allow</strong>.</li>
            </ul>
          </div>
        </details>
      </article>

      <article className="card about-section about-section--roadmap">
        <span className="about-badge" aria-hidden>
          Coming soon
        </span>
        <header className="about-section__head">
          <span className="about-section__icon" aria-hidden>
            🛤️
          </span>
          <h2 className="about-section__title">Roadmap ideas</h2>
        </header>
        <p className="about-lead">Not promised timelines—just directions we’re considering.</p>
        <ul className="about-roadmap">
          <li>
            <strong>Location-aware reminders</strong>
            <span className="about-roadmap__hint">e.g. nudges when you’re near a store</span>
          </li>
          <li>
            <strong>Focus mode</strong>
            <span className="about-roadmap__hint">surface only today’s top few tasks</span>
          </li>
          <li>
            <strong>Templates</strong>
            <span className="about-roadmap__hint">student, job search, health, and similar presets</span>
          </li>
          <li>
            <strong>Light gamification</strong>
            <span className="about-roadmap__hint">streaks or badges, kept optional</span>
          </li>
          <li>
            <strong>Optional email summaries</strong>
            <span className="about-roadmap__hint">if you explicitly opt in later</span>
          </li>
        </ul>
      </article>

      <footer className="card about-section about-footer">
        <header className="about-section__head">
          <span className="about-section__icon" aria-hidden>
            👨‍💻
          </span>
          <h2 className="about-section__title">Credits</h2>
        </header>
        <p className="about-prose about-prose--tight">
          Built by <strong>Eskinder Kassahun</strong> (2026). Questions or ideas?{" "}
          <a className="about-link" href="mailto:eskinder@example.com">
            Send email
          </a>
          .
        </p>
      </footer>
    </div>
  );
};

export default About;
