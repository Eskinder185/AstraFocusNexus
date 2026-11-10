import React, { useCallback } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./app/AppShell";
import { UIProvider } from "./app/ui";
import { AppToastProvider } from "./context/AppToast";
import { PomodoroProvider, type FocusSegmentInfo } from "./context/PomodoroContext";
import { ThemeProvider } from "./context/ThemeContext";
import { FocusPage } from "./features/focus/FocusPage";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { AnalyticsPage } from "./features/analytics/AnalyticsPage";
import { ProjectsPage } from "./features/projects/ProjectsPage";
import { GoalsPage } from "./features/goals/GoalsPage";
import { HelpPage } from "./features/help/HelpPage";
import { MatrixPage } from "./features/matrix/MatrixPage";
import { OverviewPage } from "./features/overview/OverviewPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { TasksPage } from "./features/tasks/TasksPage";
import { WellnessPage } from "./features/wellness/WellnessPage";
import { AIConnectionProvider } from "./features/ai/AIConnectionProvider";
import { WorkspaceProvider, useWorkspace, useWorkspaceActions } from "./features/workspace/WorkspaceProvider";

/** Sessions shorter than this (e.g. an accidental start then skip) aren't logged. */
const MIN_LOGGED_FOCUS_MS = 60_000;

/** Connects the (unchanged) Pomodoro engine to workspace data: linked task + session log. */
const FocusBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tasks, prefs } = useWorkspace();
  const { logFocusSession } = useWorkspaceActions();
  const activeTask = prefs.activeTaskId ? tasks.find(t => t.id === prefs.activeTaskId) : undefined;

  const onFocusComplete = useCallback(
    (info: FocusSegmentInfo) => {
      if (!info.completed && info.focusedMs < MIN_LOGGED_FOCUS_MS) return;
      logFocusSession({ ...info, taskId: prefs.activeTaskId });
    },
    [logFocusSession, prefs.activeTaskId]
  );

  return (
    <PomodoroProvider activeTaskTitle={activeTask?.title ?? null} onFocusComplete={onFocusComplete}>
      {children}
    </PomodoroProvider>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <ThemeProvider>
      <AppToastProvider>
        <WorkspaceProvider>
          <FocusBridge>
            <AIConnectionProvider>
            <UIProvider>
              <AppShell>
                <Routes>
                  <Route path="/" element={<OverviewPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/focus" element={<FocusPage />} />
                  <Route path="/matrix" element={<MatrixPage />} />
                  <Route path="/goals" element={<GoalsPage />} />
                  <Route path="/wellness" element={<WellnessPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  {/* v0.2 routes */}
                  <Route path="/about" element={<Navigate to="/help" replace />} />
                  <Route path="/faq" element={<Navigate to="/help" replace />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            </UIProvider>
            </AIConnectionProvider>
          </FocusBridge>
        </WorkspaceProvider>
      </AppToastProvider>
    </ThemeProvider>
  </HashRouter>
);

export default App;
