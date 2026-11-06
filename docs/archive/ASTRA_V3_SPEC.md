# AstraFocusNexus 3.0 Specification

## 1. Overview
Upgrade AstraFocusNexus to a premium, polished productivity workspace that combines deep focus, project management, and goal tracking.

## 2. Architecture Goals
- **State Management**: Modularize state. Move away from the "everything in PomodoroContext" model. Introduce a more structured approach for Task, Project, and Note states.
- **Persistence**: Abstract `localStorage` into a Persistence Layer (Provider pattern) to allow for future expansion (IndexedDB, Sync, etc.).
- **UI/UX**: Shift to a "Dashboard-first" experience with a premium, modern design system.
- **Component Library**: Standardize UI components (Buttons, Inputs, Modals, Cards) to ensure consistency.

## 3. UI/UX Redesign (Priority 1)
- **Core Layout**:
    - **Collapsible Sidebar**: Navigation and quick-access projects.
    - **Global Header**: Search, Command Palette (Ctrl+K), Profile, and Theme Toggle.
    - **Dashboard**: A high-level overview with "Project Cards," "Upcoming Tasks," "Focus Timer Widget," and "Productivity Insights."
- **Design Language**:
    - **Theme**: Support for sophisticated Light and Dark themes with high-quality glassmorphism and neon accents.
    - **Transitions**: Smooth, reduced-motion-aware animations.
    - **Empty States**: Beautiful and informative empty states for each module.
    - **Loading States**: Skeleton screens for all data-fetching actions.

## 4. Functional Roadmap

### Phase 1: Foundation & UI (Current)
- [ ] Core Design System (Tailwind config, Shared Components)
- [ ] Global Navigation & Layout Shell
- [ ] Command Palette Implementation
- [ ] Premium Dashboard (Overview)

### Phase 2: Task & Project Management (Priority 2 & 3)
- [ ] Enhanced Task Management (Subtasks, Priority, Due Dates)
- [ ] Project Management (Kanban, List Views, Milestones)
- [ ] Task-Project Relationship Mapping

### Phase 3: Notes & Knowledge (Priority 4)
- [ ] Notes Dashboard & Rich Text Editor
- [ ] Tags and Search
- [ ] Cross-linking (Link tasks to notes)

### Phase 4: Calendar & Focus (Priority 5)
- [ ] Calendar Integration (Task visibility)
- [ ] Pomodoro Timer Enhancements (Statistics, Session History)

### Phase 5: Habits & Goals (Priority 6)
- [ ] Habit Tracking (Streaks, Daily completion)
- [ ] Goals & Milestones (Progress visualization)

### Phase 6: AI Assistant (Priority 7)
- [ ] Extensible AI Architecture (Ollama, OpenAI-compatible)
- [ ] AI-powered Task Breakdown & Summarization

## 5. Non-Functional Requirements
- **Accessibility**: Full WCAG compliance (Aria-labels, keyboard navigation).
- **Performance**: Sub-100ms interaction latency, efficient re-renders.
- **Testing**: Playwright for E2E, Vitest for Unit/Integration.
