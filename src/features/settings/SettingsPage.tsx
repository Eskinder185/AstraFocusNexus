import React, { useState } from "react";
import { Bell, Download, HardDrive, Monitor, Moon, Sun, Upload, Volume2 } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useAppToast } from "../../context/AppToast";
import { usePomodoro } from "../../context/PomodoroContext";
import { useTheme, type ThemeMode } from "../../context/ThemeContext";
import { cx } from "../../lib/cx";
import { toDateKey } from "../../lib/dates";
import { previewNotificationSound, readSoundPreferences, saveSoundPreferences, type SoundPreferences } from "../../lib/notificationSound";
import { AISettingsCard } from "../ai/AISettingsCard";
import { readAllEntries } from "../wellness/wellnessStore";
import { LEGACY_BACKUP_KEY } from "../workspace/migrate";
import { normalizeWorkspace, type WorkspaceData } from "../workspace/schema";
import { PRIORITY_META, PRIORITY_ORDER } from "../workspace/priority";
import type { Priority } from "../workspace/schema";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";

const APP_VERSION = "0.3.0";

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const recordCounts = (d: Pick<WorkspaceData, "tasks" | "goals" | "projects" | "focusSessions">) =>
  `${count(d.tasks.length, "task")}, ${count(d.goals.length, "goal")}, ${count(d.projects.length, "project")}, ${count(d.focusSessions.length, "focus session")}`;

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
  const { setPrefs, replaceData } = useWorkspaceActions();
  const { mode, setMode } = useTheme();
  const { settings } = usePomodoro();
  const { showToast } = useAppToast();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() => ("Notification" in window ? Notification.permission : "unsupported"));
  const [pendingImport, setPendingImport] = useState<WorkspaceData | null>(null);
  const [sound, setSound] = useState(readSoundPreferences);
  const updateSound = (patch: Partial<SoundPreferences>) => {
    const next = { ...sound, ...patch };
    setSound(next);
    if (!saveSoundPreferences(next)) showToast("Sound preference could not be saved on this device.", { tone: "warning" });
  };
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
      notificationSound: sound,
    };
    download(`astrafocus-export-${toDateKey(new Date())}.json`, JSON.stringify(payload, null, 2));
    showToast("Export downloaded.", { tone: "success" });
  };

  const exportLegacy = () => {
    const raw = localStorage.getItem(LEGACY_BACKUP_KEY);
    if (raw) download("astrafocus-v0.2-original-backup.json", raw);
  };

  const readImport = async (file?: File) => {
    setPendingImport(null);
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("File is too large.");
      const parsed: unknown = JSON.parse(await file.text());
      const raw = typeof parsed === "object" && parsed !== null && "workspace" in parsed
        ? (parsed as { workspace: unknown }).workspace : parsed;
      const result = normalizeWorkspace(raw, Date.now());
      if (!result) throw new Error("This file does not contain a supported AstraFocus workspace.");
      if (result.dropped) throw new Error(`${result.dropped} records could not be validated. Nothing was imported.`);
      setPendingImport(result.data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not read this file.", { tone: "danger" });
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    if (!window.confirm(`Replace your current workspace with ${count(pendingImport.tasks.length, "task")}, ${count(pendingImport.goals.length, "goal")} and ${count(pendingImport.projects.length, "project")}? A local backup will be saved first.`)) return;
    try {
      localStorage.setItem(`astra.backup.before-import.${Date.now()}`, JSON.stringify(data));
    } catch {
      showToast("Could not save a backup. Import was cancelled.", { tone: "danger" });
      return;
    }
    replaceData(pendingImport);
    setPendingImport(null);
    showToast("Workspace restored. Your previous workspace is saved as a local backup.", { tone: "success" });
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
        <SettingRow label="Notification sound" description="A gentle two-tone chime for focus endings, break endings, and task reminders. Works while this page is open, subject to browser audio rules.">
          <label className="switch">
            <input type="checkbox" aria-label="Enable notification sound" checked={sound.enabled} onChange={e => updateSound({ enabled: e.target.checked })} />
            <span>{sound.enabled ? "On" : "Off"}</span>
          </label>
        </SettingRow>
        <SettingRow label="Sound volume" description="Default is 30%.">
          <div className="row">
            <label htmlFor="notification-volume" className="visually-hidden">Notification sound volume</label>
            <input id="notification-volume" type="range" min="0" max="100" step="5" value={Math.round(sound.volume * 100)}
              disabled={!sound.enabled} onChange={e => updateSound({ volume: Number(e.target.value) / 100 })} />
            <output htmlFor="notification-volume" className="tabular">{Math.round(sound.volume * 100)}%</output>
          </div>
        </SettingRow>
        <SettingRow label="Task completion sound" description="Optional quieter cue when you complete a task.">
          <label className="switch">
            <input type="checkbox" aria-label="Task completion sound" checked={sound.taskCompletion} disabled={!sound.enabled} onChange={e => updateSound({ taskCompletion: e.target.checked })} />
            <span>{sound.taskCompletion ? "On" : "Off"}</span>
          </label>
        </SettingRow>
        <SettingRow label="Test sound" description="Tap to preview. Your browser may require this interaction before automatic chimes can play.">
          <button type="button" className="btn btn--sm" disabled={!sound.enabled || sound.volume === 0}
            onClick={() => void previewNotificationSound().then(ok => { if (!ok) showToast("Audio is blocked or unavailable in this browser.", { tone: "warning" }); })}>
            <Volume2 size={15} aria-hidden /> Test sound
          </button>
        </SettingRow>
      </SettingsSection>

      <AISettingsCard />

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
        <SettingRow label="Export everything" description={`${recordCounts(data)} as JSON.`}>
          <button type="button" className="btn btn--sm" onClick={exportAll}>
            <Download size={14} aria-hidden /> Export
          </button>
        </SettingRow>
        <SettingRow label="Restore workspace" description="Choose an AstraFocus JSON export. Review its record counts before replacing your current workspace. Wellness and timer settings are not changed.">
          <label className="btn btn--sm" htmlFor="workspace-import"><Upload size={14} aria-hidden /> Choose file</label>
          <input id="workspace-import" className="visually-hidden" type="file" accept=".json,application/json" onChange={e => void readImport(e.target.files?.[0])} />
        </SettingRow>
        {pendingImport && <div className="data-note" role="status">
          <span>Ready to restore: {recordCounts(pendingImport)}.</span>
          <button type="button" className="btn btn--primary btn--sm" onClick={confirmImport}>Restore workspace</button>
          <button type="button" className="btn btn--sm" onClick={() => setPendingImport(null)}>Cancel</button>
        </div>}
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
