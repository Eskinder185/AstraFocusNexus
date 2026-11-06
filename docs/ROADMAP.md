# AstraFocusNexus — Roadmap

Ordered by the project's stated priority (compile → preserve → core tasks → persistence → notes/projects → calendar → productivity → polish → tests).

## Phase 0 — Recovery & Audit — DONE ✅
Clean baseline; build passing.

## Phase 1 — Project Architecture (in progress)
- ✅ Write ARCHITECTURE.md, PROJECT_STATUS.md
- Pending: ROADMAP (this doc), DECISIONS.md, TEST_RESULTS.md

## Phase 2 — Core Workspace
- Responsive sidebar, functional navigation, collapsible sections
- Global search + command palette (Tab-key)
- Theme switching (ThemeContext already exists; wire into shell)
- Quick-create controls, consistent page layouts, loading/empty states, a11y nav

## Phase 3 — Task Management (NEXT)
- Shared `Task` model + persistence adapter
- CRUD, complete/reopen, due date+time, priority, description, tags, subtasks
- Recurring schedules, project assignment, filter/sort/search
- List and board views, overdue indicators, progress
- Consistent shared state across Dashboard/My Day/Inbox/Projects/Calendar

## Phase 4 — Notes & Pages
- Create/edit nested pages, block editor (headings, paragraphs, lists, code, quotes, dividers, links, icons)
- Favorites, search, autosave, reordering; markdown where practical

## Phase 5 — Projects
- CRUD, description, task assignment, Kanban/list views, status, milestones, progress, due dates, archive
- Shared task references (no copies)

## Phase 6 — Calendar & Planning
- Month/week/day views, task due dates, navigation, scheduled-task views, overdue, create-from-date

## Phase 7 — Focus / Habits / Goals / Wellness
- Pomodoro (existing) + history/stats; habits (streak/weekly); goals (milestones/progress); Eisenhower (4 quadrants, shared state); wellness check-ins (local only)

## Phase 8 — Analytics & Dashboard
- Real completed/overdue/priority/project/focus/habit/goal/weekly/monthly charts; empty states

## Phase 9 — Design & UX
- Cohesive visual language, themes, responsive (tablet/mobile), a11y, focus states, feedback

## Phase 10 — Quality & Testing
- Targeted component tests, TS/lint validation, Playwright for key workflows (task CRUD, persistence, timer, reload)

## Phase 11 — Security & Data Integrity
- HTML escaping, input validation, error boundaries, privacy of local data; document unimplemented auth/sync

## Definition of Done (per milestone)
Build passes, no new lint/TS errors, targeted tests run, git diff reviewed, unrelated files untouched, docs updated.
