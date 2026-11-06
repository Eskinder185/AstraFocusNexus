# AstraFocusNexus 4.0 Progress

## Milestone 1 — Repair and baseline
- [x] Audit the application.
- [x] Fix blocking bugs.
- [x] Verify the website loads.
- [x] Run build and tests.
- [x] Preserve data.
- [x] Map out routes and data storage.

### Route Map
- `/`: Dashboard (Main task view, quick actions)
- `/focus`: Focus (Pomodoro timer, deep work mode)
- `/wellness`: Wellness (Mood & Stress tracking)
- `/matrix`: Matrix (Eisenhower Principle visualization)
- `/goals`: Goals (High-level objective tracking)
- `/about`: About
- `/faq`: FAQ

### Data Storage Mechanisms
- **Local Storage**: Primary persistence for user data.
- **Keys**:
    - `task-tracker.tasks.v4`: Core task list.
    - `task-tracker.goals.v1`: Goals collection.
    - `task-tracker.goalPref`: User preference for goal focus.
    - `wellness.entry.[YYYY-MM-DD]`: Daily mood and stress metrics.
- **State Management**:
    - **React Context**: `PomodoroContext` manages timer state, cycles, and settings.
    - **Local State**: `App.tsx` manages UI-specific states like task filtering, active IDs, and input fields.
    - **Notifications**: `AppToast` context handles UI-based feedback.

## Milestone 2 — Design system and application shell
- [x] Add design tokens.
- [x] Create reusable components (Button, Card).

- [ ] Build sidebar and navigation.
- [ ] Implement theme behavior.
- [ ] Verify responsive layouts.

## Milestone 3 — Dashboard
- [ ] Implement the command center.
- [ ] Connect real tasks.
- [ ] Connect focus sessions.
- [ ] Connect goals.
- [ ] Add dashboard customization.

## Milestone 4 — Tasks and reminders
- [ ] Improve task CRUD.
- [ ] Add subtasks and priorities.
- [ ] Add task filtering.
- [ ] Build recurring tasks.
- [ ] Implement scheduled reminders.
- [ ] Test persistence.

## Milestone 5 — Projects and Kanban
- [ ] Implement projects.
- [ ] Link tasks.
- [ ] Build Kanban.
- [ ] Add milestones.
- [ ] Calculate progress.

## Milestone 6 — Notes and calendar
- [ ] Add connected notes.
- [ ] Implement calendar views.
- [ ] Add scheduling and time blocking.

## Milestone 7 — Focus, habits, and analytics
- [ ] Upgrade Pomodoro.
- [ ] Implement deep focus.
- [ ] Improve goals.
- [ ] Implement habit tracking.
- [ ] Connect analytics.

## Milestone 8 — Local AI assistant
- [ ] Add optional Ollama integration.
- [ ] Implement daily planning.
- [ ] Add task breakdown.
- [ ] Add model connection settings.
- [ ] Handle offline and unavailable models.

## Milestone 9 — Final polish
- [ ] Browser regression tests.
- [ ] Responsive testing.
- [ ] Accessibility.
- [ ] Performance.
- [ ] Fix critical errors.
- [ ] Final documentation.

---
**Last Updated:** 2026-10-27
