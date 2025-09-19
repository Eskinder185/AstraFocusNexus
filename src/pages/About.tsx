import React, { useState } from "react";
import PageHeader from "../components/PageHeader";

const About: React.FC = () => {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div>
      <PageHeader icon="ℹ️" title="About" subtitle="What this app does and why" />

      {/* Mission Card */}
      <div className="card" style={{marginBottom: 16}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12}}>
          <div style={{fontSize: '2rem'}}>🚀</div>
          <h3 style={{margin: 0, color: 'var(--accent)'}}>Our Mission</h3>
        </div>
        <p style={{margin: 0, fontSize: '1.1rem', lineHeight: 1.6}}>
          <strong>AstraFocus Nexus</strong> turns a simple checklist into a supportive coach:
          it helps you choose what matters, work in focused bursts, and stay kind to yourself.
          No accounts needed—your data stays on your device.
        </p>
      </div>

      {/* Core Features Card */}
      <div className="card" style={{marginBottom: 16}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16}}>
          <div style={{fontSize: '2rem'}}>⚡</div>
          <h3 style={{margin: 0, color: 'var(--brand)'}}>Core Features</h3>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16}}>
          <div className="feature-item">
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
              <span style={{fontSize: '1.5rem'}}>🧠</span>
              <strong>Wellness Check-ins</strong>
            </div>
            <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--muted)'}}>Mood buttons + stress slider with gentle suggestions</p>
          </div>
          
          <div className="feature-item">
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
              <span style={{fontSize: '1.5rem'}}>⏰</span>
              <strong>Pomodoro Sessions</strong>
            </div>
            <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--muted)'}}>Focus & breaks with chime, tab flash, and notifications</p>
          </div>
          
          <div className="feature-item">
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
              <span style={{fontSize: '1.5rem'}}>🧭</span>
              <strong>Eisenhower Matrix</strong>
            </div>
            <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--muted)'}}>Prioritize by Urgent/Important to start with the right things</p>
          </div>
          
          <div className="feature-item">
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
              <span style={{fontSize: '1.5rem'}}>🎯</span>
              <strong>Goals & Progress</strong>
            </div>
            <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--muted)'}}>Link tasks to outcomes and track your progress</p>
          </div>
          
          <div className="feature-item">
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
              <span style={{fontSize: '1.5rem'}}>🔔</span>
              <strong>Smart Reminders</strong>
            </div>
            <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--muted)'}}>Due-time notifications when you enable permission</p>
          </div>
        </div>
      </div>

      {/* Why It Helps Card */}
      <div className="card" style={{marginBottom: 16}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16}}>
          <div style={{fontSize: '2rem'}}>💡</div>
          <h3 style={{margin: 0, color: 'var(--brand2)'}}>Why It Helps</h3>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12}}>
          <div style={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
            <span style={{fontSize: '1.2rem', marginTop: 2}}>🎯</span>
            <p style={{margin: 0, fontSize: '0.95rem'}}>Breaks big tasks into doable steps when stress is high</p>
          </div>
          <div style={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
            <span style={{fontSize: '1.2rem', marginTop: 2}}>⚡</span>
            <p style={{margin: 0, fontSize: '0.95rem'}}>Protects energy with 25/5 focus cycles and gentle nudges</p>
          </div>
          <div style={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
            <span style={{fontSize: '1.2rem', marginTop: 2}}>📈</span>
            <p style={{margin: 0, fontSize: '0.95rem'}}>Makes priorities obvious—less busywork, more progress</p>
          </div>
        </div>
      </div>

      {/* Quick Tips Card */}
      <div className="card" style={{marginBottom: 16}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16}}>
          <div style={{fontSize: '2rem'}}>💫</div>
          <h3 style={{margin: 0, color: 'var(--accent)'}}>Quick Tips</h3>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{fontSize: '1.2rem'}}>⌨️</span>
            <span>Press <strong>Enter</strong> in the task input to add quickly</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{fontSize: '1.2rem'}}>🏷️</span>
            <span>Tag priorities as you go: <strong>UI / UN / NI / NN</strong></span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{fontSize: '1.2rem'}}>🧘</span>
            <span>Use the Wellness page when you feel stuck—pick one tiny step</span>
          </div>
        </div>
      </div>

      {/* Privacy & Notifications Accordion */}
      <div className="card" style={{marginBottom: 16}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16}}>
          <div style={{fontSize: '2rem'}}>🔒</div>
          <h3 style={{margin: 0, color: 'var(--muted)'}}>Privacy & Technical Details</h3>
        </div>
        
        <div style={{display: 'flex', gap: 8, marginBottom: 16}}>
          <button 
            className={`pill ${showPrivacy ? 'active' : ''}`}
            onClick={() => setShowPrivacy(!showPrivacy)}
            style={{fontSize: '0.9rem'}}
          >
            🔒 Privacy & Storage
          </button>
          <button 
            className={`pill ${showNotifications ? 'active' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
            style={{fontSize: '0.9rem'}}
          >
            🔔 Notifications
          </button>
        </div>

        {showPrivacy && (
          <div style={{padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', marginBottom: 12}}>
            <p style={{margin: '0 0 8px 0', fontSize: '0.9rem'}}>
              Your tasks, settings, wellness entries, and goals are stored in <em>localStorage</em> in your browser:
            </p>
            <ul style={{margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--muted)'}}>
              <li><code>task-tracker.tasks.v4</code> — tasks</li>
              <li><code>pomodoro.settings</code> — timer settings</li>
              <li><code>task-tracker.goals.v1</code> — goals</li>
              <li><code>wellness.entry.YYYY-MM-DD</code> — daily mood/stress</li>
            </ul>
            <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--muted)'}}>
              No cloud, no account. Clearing browser data or using a different device/browser will remove data.
            </p>
          </div>
        )}

        {showNotifications && (
          <div style={{padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px'}}>
            <ul style={{margin: 0, fontSize: '0.9rem'}}>
              <li>Click the bell (🔕 → 🔔) in the navigation or Pomodoro box to grant permission</li>
              <li>Notifications work on <strong>HTTPS</strong> or <strong>localhost</strong></li>
              <li>If blocked: check your browser site settings → Notifications → "Allow"</li>
            </ul>
          </div>
        )}
      </div>

      {/* Roadmap - Coming Soon Card */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(124,77,255,0.1), rgba(0,229,255,0.1))',
        border: '2px solid rgba(124,77,255,0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'var(--accent)',
          color: 'var(--bg0)',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '0.7rem',
          fontWeight: 'bold'
        }}>
          COMING SOON
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16}}>
          <div style={{fontSize: '2rem'}}>🚀</div>
          <h3 style={{margin: 0, color: 'var(--brand2)'}}>Roadmap</h3>
        </div>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12}}>
          <div style={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
            <span style={{fontSize: '1.2rem', marginTop: 2}}>📍</span>
            <div>
              <strong>Location Reminders</strong>
              <p style={{margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted)'}}>"Buy milk" near a grocery store</p>
            </div>
          </div>
          
          <div style={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
            <span style={{fontSize: '1.2rem', marginTop: 2}}>🎯</span>
            <div>
              <strong>Focus Mode</strong>
              <p style={{margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted)'}}>Show only Today's Top 3</p>
            </div>
          </div>
          
          <div style={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
            <span style={{fontSize: '1.2rem', marginTop: 2}}>🧰</span>
            <div>
              <strong>Smart Modes</strong>
              <p style={{margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted)'}}>Student / Job Seeker / Health / Finance templates</p>
            </div>
          </div>
          
          <div style={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
            <span style={{fontSize: '1.2rem', marginTop: 2}}>🕹️</span>
            <div>
              <strong>Gamification</strong>
              <p style={{margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted)'}}>XP, streaks, badges, daily challenges</p>
            </div>
          </div>
          
          <div style={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
            <span style={{fontSize: '1.2rem', marginTop: 2}}>📧</span>
            <div>
              <strong>Email Summary</strong>
              <p style={{margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted)'}}>Send daily/weekly reports automatically</p>
            </div>
          </div>
        </div>
      </div>

      {/* Credits Card */}
      <div className="card" style={{marginTop: 16}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12}}>
          <div style={{fontSize: '2rem'}}>👨‍💻</div>
          <h3 style={{margin: 0, color: 'var(--accent)'}}>Credits & Contact</h3>
        </div>
        <p style={{margin: 0, fontSize: '1rem'}}>
          Built by <strong>Eskinder Kassahun (2025)</strong>. 
          <br />
          Feedback or feature ideas? <a href="mailto:eskinder@example.com" style={{color: 'var(--brand)'}}>Email me</a>.
        </p>
      </div>
    </div>
  );
};

export default About;
