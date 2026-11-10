# AstraFocus — Architecture

Current as of Phase 1 (`feat/phase-1-foundation`, v0.3.0).

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite 8** (replaced Create React App) | CRA is deprecated; Vite was already a dependency; build takes under 1 s |
| UI | React 18 + TypeScript (strict, `noUnused*`) | Existing stack |
| Routing | React Router 6, **HashRouter** | GitHub Pages has no SPA fallback; hash URLs keep deep links working without a 404 hack |
| Styling | Hand-written CSS on semantic design tokens (`src/styles/`) | Full control over a distinctive look; no runtime cost. The Tailwind setup found in the repo was never wired up and was removed |
| Icons | lucide-react | Consistent 1.5–2 px stroke set, tree-shaken |
| Font | Inter Variable via `@fontsource-variable/inter` | Self-hosted, no third-party request; unicode-range subsets |
| State | React context + `useReducer` | Small, explicit; no extra dependency needed yet |
| Persistence | localStorage via a versioned, validated workspace document | See §4. IndexedDB is planned with sync (Phase 6) |
| Unit tests | Vitest | Pure domain logic (migration, reducer, selectors, parser) |
| E2E tests | Playwright (Chromium) | Real user journeys against the production build |

Deliberately **not** added yet: Tailwind, Radix/shadcn, Framer Motion, Zustand, TanStack Query, dnd-kit, FullCalendar, Tiptap. Each will be added when a phase needs it (e.g. dnd-kit for calendar dragging, Tiptap for notes, TanStack Query with the backend).

## 2. Source layout

```
src/
  main.tsx                    entry: fonts + global styles
  App.tsx                     providers, routes, FocusBridge (timer ↔ workspace)
  app/
    AppShell.tsx              layout, global shortcuts, idle nudge, route focus management
    nav.ts                    navigation config (only shipped features)
    ui.tsx                    UI state: command palette, composer, task panel
  components/
    BrandMark.tsx, PageHeader.tsx
    shell/                    Sidebar, Topbar, MobileNav, TimerPill
    ui/                       Dialog (native <dialog>), EmptyState, Kbd, Progress
  context/
    PomodoroContext.tsx       timer engine (preserved from v0.2)
    AppToast.tsx              toasts with actions (Undo)
    ThemeContext.tsx          system / light / dark
  features/
    workspace/                ← domain core (framework-free except the Provider)
      schema.ts               types + validation/normalisation
      migrate.ts              load + legacy import + backups
      reducer.ts              all mutations (pure)
      selectors.ts            derived data: groups, priorities, progress, insights
      quickAdd.ts             natural-language parser
      priority.ts             Eisenhower metadata
      WorkspaceProvider.tsx   persistence, cross-tab sync, reminders, actions API
      workspace.test.ts       25 unit tests
    overview/ tasks/ focus/ matrix/ goals/ wellness/ settings/ help/ command/
  hooks/                      useNow, useMediaQuery
  lib/                        dates, storage, id, cx, platform
  styles/                     tokens.css, base.css, components.css, shell.css, pages.css
e2e/                          Playwright specs (+ opt-in screenshot capture)
```

Rule: **domain logic lives in `features/workspace` as pure functions**; components only read selectors and call actions.

## 3. Domain model (`schema.ts`)

```ts
Task         { id, title, notes, status: "todo"|"done", priority: "UI"|"NI"|"UN"|"NN",
               dueDate: "YYYY-MM-DD"|null, dueTime: "HH:mm"|null, remind, reminderSentAt,
               goalId, projectId?, scheduledAt?, estimateMin?, pomodoros,
               createdAt, updatedAt, completedAt, legacyId? }
Goal         { id, title, emoji, targetDate, createdAt, updatedAt, legacyId? }
Project      { id, title, notes, targetDate, goalId, createdAt, updatedAt }
FocusSession { id, taskId, endedAt, focusedMs, completed }
Prefs        { defaultGoalId, defaultPriority, activeTaskId, wellnessEnabled }
WorkspaceData{ version: 2, tasks, goals, projects, focusSessions, prefs, migrations[] }
```

Design notes:
- Dates are **local calendar dates** plus an optional local time, never `Date.parse("YYYY-MM-DD")` (which is UTC). A date-only task becomes overdue at the end of its day.
- Relationships use **stable ids**, never display names.
- `scheduledAt` is a planned work timestamp distinct from the deadline. One task record appears across list, calendar and focus.
- Cross-field invariants are enforced in the reducer (`remind` requires a time; changing the due time re-arms the reminder; a time is cleared with its date).
- Wellness check-ins stay in their v0.2 per-day keys (`wellness.entry.*`). They are private and deliberately kept out of the workspace document, so a future sync can exclude them by default.

## 4. Persistence and migration

```
startup → loadWorkspace(localStorage)
  ├─ astra.workspace.v2 valid?          → use it (invalid records dropped, counted)
  ├─ present but unreadable?            → copy to astra.workspace.v2.unreadable.<ts>, then ↓
  ├─ astra.workspace.v1 valid?          → upgrade in memory, retain v1, write v2
  └─ legacy task-tracker.* keys exist?  → back up once to astra.backup.legacy-v0,
                                          convert with deterministic ids, record migration
```

- Legacy keys are **never** written or deleted.
- The v1 workspace key is retained. An older tab cannot erase v2 project or scheduling fields, though edits made in the old tab after migration will not merge into v2.
- After each state change the provider serialises and writes the workspace (skipped if unchanged). Write failures (quota, disabled storage) raise one persistent error toast.
- A `storage` event listener keeps multiple tabs consistent; echo loops are prevented by comparing serialised payloads.
- Export (Settings) produces a JSON file with the workspace, wellness entries (if enabled) and timer settings.
- Import validates workspace records, previews counts, and saves a local backup before replacing workspace data. Wellness and timer settings are not restored.

## 5. Focus timer integration

`PomodoroContext` (v0.2) is timestamp-based: it stores `endAt`, derives remaining time from `Date.now()`, persists its runtime snapshot, and recovers after refresh or sleep. Phase 1 changed only its edges:

- `onFocusComplete(info)` now receives `{ id: "f-<scheduledEnd>", endedAt, focusedMs, completed }`. The id makes duplicate reports (StrictMode, refresh races, two tabs) idempotent in the reducer.
- A segment that **ran out while the app was closed** is now logged on return (it was silently dropped before).
- **Skipping** logs the focused time but no longer credits a Pomodoro.
- `FocusBridge` in `App.tsx` supplies the linked task (persisted in `prefs.activeTaskId`) and drops sessions under 60 s that weren't completed.

## 6. UI architecture

- **Dialogs** use native `<dialog>.showModal()`: browser focus trap, inert background, Esc, top layer. Focus returns to the opener. `data-autofocus` marks the initial focus target.
- **Command palette** is an ARIA combobox + listbox (`aria-activedescendant`).
- **Shortcuts** never fire while typing or while a dialog is open (except ⌘/Ctrl+K).
- **Route changes** reset scroll and move focus to `<main>` for screen-reader users; a skip link is provided.
- **Responsive**: ≥1100 px full sidebar (collapsible, persisted); 768–1099 px icon rail with overlay expand; <768 px bottom navigation + "More" sheet, safe-area aware.
- **Theme** is applied by an inline script before first paint (no flash), then managed by `ThemeContext`.

## 7. Build and deploy

- `npm run build` = `tsc` + `vite build` → `build/` with base `/AstraFocusNexus/`.
- `npm run deploy` (unchanged) publishes `build/` to the `gh-pages` branch. **Not run in Phase 1**: the live site was left untouched.
- CI (`.github/workflows/ci.yml`) runs type check, unit tests, build and E2E on pushes and PRs. It does not deploy.

## 8. Known limitations (Phase 1)

- Single device, single browser: no accounts or sync.
- Reminders only fire while a tab is open (no service worker / push yet).
- No calendar, projects, notes, habits or analytics pages yet; they're hidden from navigation, not faked.
- Dashboard widgets can't yet be reordered or hidden.
- E2E runs on Chromium only; Safari/Firefox are unverified.
