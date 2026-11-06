# AstraFocusNexus — Architecture

Status: **BUILDING** — recovery baseline restored, build passes.
Last verified: 2026-10-30.

## 1. Tech Stack (verified)

| Concern | Technology |
|---------|-----------|
| Framework | React 18 (`react`, `react-dom`) |
| Language | TypeScript (strict: `noImplicitAny`, strict mode, `esModuleInterop`, `jsx: react-jsx`) |
| Styling | Tailwind CSS (via `src/index.css`, ~74 KB raw file with custom theme, breakpoints, animations) |
| Build system | Create React App (`react-scripts`), webpack |
| Router | **None** — page switching via component state (`currentView`) |
| State | React `useState`/`useReducer` + React Context |
| Persistence | **None** — in-memory only (no storage adapter yet) |
| Testing | **None** configured (`"test": "react-scripts test"` placeholder, no test infra) |
| Linter | ESLint (`react-scripts`) |

## 2. Entry points

- `src/index.tsx` — mounts `<App/>` into `#root` (`createRoot`).
- `src/App.tsx` — owns `currentView` state, renders `<Layout/>`, and dispatches view rendering.

## 3. Routing / navigation

Not a router. `App.tsx` holds `const [currentView, setCurrentView] = useState<...>()` and conditionally renders the page component. The sidebar (`Sidebar.tsx`) maps nav items to `currentView` values.

## 4. Layout

- `src/components/layout/Layout.tsx` — wraps app content; renders `<Sidebar/>` + `<Outlet/>`.
- `src/components/layout/Sidebar.tsx` — nav container.
- `src/components/layout/SidebarItem.tsx` — individual nav row.
- 7 working nav items: **Dashboard, My Day, Inbox, Tasks, Projects, Calendar, Settings**.
- No search palette, no command palette, no theme toggle in shell (ThemeContext exists but is not wired into the sidebar).

## 5. Design system

- `src/design-system/tokens.ts` (5.2 KB) — color palette, spacing, radius, elevation, typography tokens.
- `src/components/ui/` — 7 reusable primitives: `Badge`, `Dropdown`, `EmptyState`, `Input`, `Modal`, `Progress`, `Tooltip`.
- `src/components/layout/LoadingSpinner.tsx` — spinner.
- `src/index.css` — full Tailwind theme config (~430 lines of custom CSS).

## 6. State management

- `ThemeContext.tsx` — theme (light/dark) context.
- `AppToast.tsx` — toast/notification context.
- `PomodoroContext.tsx` (~18 KB) — Pomodoro timer state (work/rest intervals, start/pause/reset, session history).
- `hooks/useNudges.ts` — nudges hook.

## 7. Pages

| File | Status |
|------|--------|
| `src/pages/Dashboard.tsx` (445 lines) | Restored to clean baseline (0 diff from `b773330b`). Rich: 5 stat cards, "My Day" task list, "Projects" list, "Focus" card, "Quick add". |
| `src/pages/MyDay.tsx` | NOT IMPLEMENTED (referenced in spec) |
| `src/pages/Inbox.tsx` | NOT IMPLEMENTED |
| `src/pages/TaskList.tsx` | NOT IMPLEMENTED |
| `src/pages/Projects.tsx` | NOT IMPLEMENTED |
| `src/pages/Calendar.tsx` | NOT IMPLEMENTED |
| `src/pages/Settings.tsx` | NOT IMPLEMENTED |

## 8. Persistence status

**NOT IMPLEMENTED.** All state is in-memory; reloads lose data. No storage adapter, no backend, no localStorage adapter. Documented as a known limitation.

## 9. Key files

- `package.json`, `tsconfig.json`, `tailwind.config.js`, `src/index.css`, `src/App.tsx`, `src/index.tsx`, `src/design-system/tokens.ts`.

## 10. Data model (current)

No shared task model exists yet. Tasks live ad-hoc in `Dashboard.tsx` local state. Phase 3 will introduce a shared `Task` model and a persistence layer so tasks render consistently across Dashboard / My Day / Inbox / Projects / Calendar.
