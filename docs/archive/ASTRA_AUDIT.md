# AstraFocusNexus Architecture Audit (v3.0 Alignment)

## Project Overview
AstraFocusNexus is a lightweight, fast front-end application designed for focus, goal setting, and quick dashboards. It emphasizes a simple user experience with a clear UI, fast load times, and minimal noise.

### Key Features:
- **Focus View:** A dedicated screen for today's goals and tasks.
- **Quick Metrics:** Simple cards and charts for progress snapshots.
- **Keyboard-first UX:** Optimized for fast navigation and inputs.
- **Mobile-friendly:** Responsive layout suitable for both phone and desktop.
- **Performance:** Built with Vite and React for instant developer feedback and smooth user experience.

## Tech Stack
- **Frontend Framework**: React
- **Routing**: React Router
- **State Management**: Context API (PomodoroContext)
- **Styling**: CSS Modules / Tailwind (based on directory structure and class names)
- **Date Handling**: Native Date / Localized strings

## Architectural Gaps
- **Context Bloat**: `PomodoroContext` currently manages a wide range of concerns including state, effects, notifications, and persistence. This may lead to complexity as the app grows.
- **State Synchronization**: The `Home.tsx` component uses a hybrid approach of Context (for Pomodoro state) and Props (for Task state). This can lead to inconsistent state updates if not managed carefully.
- **Persistence Layer**: Direct usage of `localStorage` within the Context provider makes it harder to swap out storage mechanisms (e.g., to IndexedDB or a remote API) in the future.

## 3.0 Specification Alignment
- **Status**: Pending
- **Note**: The formal "3.0 Specification" document is missing. Alignment mapping will begin once the specification is provided.

## Data Flow Map
### Home Page (`src/pages/Home.tsx`)
- **Data Sources**:
    - `PomodoroContext`: Provides session state (`running`, `phase`, `mode`, `remainingMs`) and `linkedTaskTitle`.
    - Local Props: Passed from a parent component (likely `App.tsx` or a layout wrapper) containing `tasks`, `filteredTasks`, `filter`, and action handlers (`addTask`, `toggleTask`, `removeTask`, etc.).
- **State Mutations**:
    - `addTask`: Adds new `Task` object.
    - `toggleTask`: Flips `completed` boolean.
    - `removeTask`: Deletes task from list.
    - `setTaskPriority`: Updates `priority` field of a `Task`.
    - `setActiveTaskId`: Sets the task linked to the current Pomodoro session.
- **Flow**:
    1. `Home` component renders based on `filteredTasks` (derived from `tasks` and `filter`).
    2. User interacts with task list (e.g., clicking checkbox).
    3. Action handler updates the central task state (passed via props).
    4. Component re-renders with updated data.
    5. Pomodoro status is updated in real-time via `usePomodoro` hook.
