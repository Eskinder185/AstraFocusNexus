import React, { useState } from "react";
import { Bell, Download, HardDrive, Monitor, Moon, Sun } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useAppToast } from "../../context/AppToast";
import { usePomodoro } from "../../context/PomodoroContext";
import { useTheme, type ThemeMode } from "../../context/ThemeContext";
import { cx } from "../../lib/cx";
import { toDateKey } from "../../lib/dates";
import { readAllEntries } from "../wellness/wellnessStore";
import { LEGACY_BACKUP_KEY } from "../workspace/migrate";
import { PRIORITY_META, PRIORITY_ORDER } from "../workspace/priority";
import type { Priority } from "../workspace/schema";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";

const APP_VERSION = "0.3.0";

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const THEMES: Array<{ id: ThemeMode; label: string; icon: React.ReactNode }> = [
  { id: "system", label: "System", icon: <Monitor size={15} aria-hidden /> },
  { id: "light", label: "Light", icon: <Sun size={15} aria-hidden /> },
  { id: "dark", label: "Dark", icon: <Moon size={15} aria-hidden /> },
];

export const SettingsPage: React.FC = () => {
  const data = useWorkspace();
  const { setPrefs } = useWorkspaceActions();
  const { mode, setMode } = useTheme();
  const { settings } = usePomodoro();
  const { showToast } = useAppToast();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() => ("Notification" in window ? Notification.permission : "unsupported"));
  const hasLegacyBackup = (() => {
    try {
      return localStorage.getItem(LEGACY_BACKUP_KEY) != null;
    } catch {
      return false;
    }
  })();

  const exportAll = () => {
    const payload = {
      app: "AstraFocus",
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      workspace: data,
      wellness: data.prefs.wellnessEnabled ? readAllEntries() : [],
      focusSettings: settings,
    };
    download(`astrafocus-export-${toDateKey(new Date())}.json`, JSON.stringify(payload, null, 2));
    showToast("Export downloaded.", { tone: "success" });
  };

  const exportLegacy = () => {
    const raw = localStorage.getItem(LEGACY_BACKUP_KEY);
    if (raw) download("astrafocus-v0.2-original-backup.json", raw);
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") {
      showToast("Notifications are blocked for this site. Allow them in your browser’s site settings.", { tone: "warning", durationMs: 10_000 });
      return;
    }
    setPerm(await Notification.requestPermission());
  };

  return (
    <div className="settings-page">
      <PageHeader title="Settings" />

      <SettingsSection title="Appearance">
        <SettingRow label="Theme" description="System follows your device’s light or dark setting.">
          <div className="segmented" role="radiogroup" aria-label="Theme">
            {THEMES.map(t => (
              <button key={t.id} type="button" role="radio" aria-checked={mode === t.id} onClick={() => setMode(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Tasks">
        <SettingRow label="Default priority" description="Used when you don’t pick one while adding a task.">
          <select className="select settings-select" aria-label="Default priority" value={data.prefs.defaultPriority} onChange={e => setPrefs({ defaultPriority: e.target.value as Priority })}>
            {PRIORITY_ORDER.map(p => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label} · {PRIORITY_META[p].long}
              </option>
            ))}
          </select>
        </SettingRow>
        <SettingRow label="Default goal" description="New tasks link to this goal unless you choose another.">
          <select className="select settings-select" aria-label="Default goal" value={data.prefs.defaultGoalId ?? ""} onChange={e => setPrefs({ defaultGoalId: e.target.value || null })}>
            <option value="">No goal</option>
            {data.goals.map(g => (
              <option key={g.id} value={g.id}>
                {g.emoji} {g.title}
              </option>
            ))}
          </select>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingRow
          label="Browser notifications"
          description="Used for task reminders and focus session alerts. They only arrive while AstraFocus is open in a browser tab; there’s no server to send them otherwise."
        >
          {perm === "granted" ? (
            <span className="chip chip--success">
              <Bell size={12} aria-hidden /> Allowed
            </span>
          ) : perm === "unsupported" ? (
            <span className="chip">Not supported in this browser</span>
          ) : (
            <button type="button" className="btn btn--sm" onClick={requestNotifications}>
              {perm === "denied" ? "Blocked: how to fix" : "Allow notifications"}
            </button>
          )}
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Privacy">
        <SettingRow label="Wellness check-ins" description="Mood, stress and energy tracking. When off, the page is hidden and nothing new is recorded.">
          <label className="switch">
            <input type="checkbox" checked={data.prefs.wellnessEnabled} onChange={e => setPrefs({ wellnessEnabled: e.target.checked })} />
            <span className="visually-hidden">Wellness check-ins</span>
          </label>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Your data">
        <div className="data-note">
          <HardDrive size={18} aria-hidden />
          <p>
            AstraFocus currently stores everything in this browser on this device. There’s no account and no cloud sync yet, so clearing site data
            removes it. Export regularly if your work matters to you.
          </p>
        </div>
        <SettingRow label="Export everything" description={`${data.tasks.length} tasks, ${data.goals.length} goals, ${data.focusSessions.length} focus sessions as JSON.`}>
          <button type="button" className="btn btn--sm" onClick={exportAll}>
            <Download size={14} aria-hidden /> Export
          </button>
        </SettingRow>
        {hasLegacyBackup && (
          <SettingRow label="Original v0.2 data" description="An untouched copy of your data from before this upgrade.">
            <button type="button" className="btn btn--sm btn--ghost" onClick={exportLegacy}>
              <Download size={14} aria-hidden /> Download backup
            </button>
          </SettingRow>
        )}
        {data.migrations.length > 0 && (
          <div className="migration-log">
            <p className="label">Upgrade history</p>
            <ul role="list">
              {data.migrations.map(m => (
                <li key={m.at} className="subtle">
                  {new Date(m.at).toLocaleString()}: imported {m.importedTasks} tasks and {m.importedGoals} goals
                  {m.skippedRecords ? ` (${m.skippedRecords} unreadable records skipped; they remain in the backup)` : ""}.
                </li>
              ))}
            </ul>
          </div>
        )}
      </SettingsSection>

      <p className="settings-version subtle">AstraFocus {APP_VERSION}</p>
    </div>
  );
};

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="card settings-section" aria-label={title}>
    <h2 className="settings-section__title">{title}</h2>
    <div className="settings-section__rows">{children}</div>
  </section>
);

const SettingRow: React.FC<{ label: string; description?: string; children: React.ReactNode; className?: string }> = ({ label, description, children, className }) => (
  <div className={cx("setting-row", className)}>
    <div className="setting-row__text">
      <p className="setting-row__label">{label}</p>
      {description && <p className="setting-row__desc">{description}</p>}
    </div>
    <div className="setting-row__control">{children}</div>
  </div>
);
