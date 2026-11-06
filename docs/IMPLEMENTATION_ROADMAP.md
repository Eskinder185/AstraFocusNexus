# AstraFocus — Implementation Roadmap

Each phase ships independently, keeps the build green, and leaves user data intact. Nothing is shown in navigation until it works.

## Status

| Phase | Scope | Status |
|---|---|---|
| 0 | Audit, docs, repo hygiene | **Done** |
| 1 | Design system, app shell, command palette, unified data model, migration | **Done** on `feat/phase-1-foundation` (not merged, not deployed) |
| 2 | Task depth + dashboard customisation | Next |
| 3 | Calendar + planning engine | Planned |
| 4 | Projects + notes | Planned |
| 5 | Focus, goals, habits depth | Planned (Focus Studio partly done in Phase 1) |
| 6 | Accounts + cloud sync | Planned; **needs external services** |
| 7 | Integrations, search, analytics, weekly review, Astra assistant | Planned; **needs external services** |
| 8 | Marketing site, pricing, billing | Planned; **needs explicit authorisation** |
| 9 | Hardening | Continuous; final pass before launch |

## Phase 1: delivered

- Vite migration; repo hygiene (`node_modules/` and `build/` untracked); zoom-blocking viewport fixed.
- Design tokens (dark + light), type and spacing scales, motion with reduced-motion support, original brand mark.
- Shell: collapsible sidebar, top bar with live timer pill, tablet rail, mobile bottom nav, skip link.
- ⌘/Ctrl+K command palette (navigate, create, timer, theme, search tasks and goals); shortcuts C, /, ?, G+key.
- Unified `WorkspaceData` model, validated loading, non-destructive v0.2 migration with backup, cross-tab sync, undo for destructive actions, JSON export.
- Natural-language quick add with an editable preview.
- Pages rebuilt: Overview, Tasks, Focus Studio, Priority Matrix, Goals, Wellness, Settings, Help.
- 25 unit tests + 9 E2E tests (migration, core journey, timer persistence, palette, overflow at 320/390/768/1280 px, zoom).

## Phase 2: Tasks and dashboard depth (next)

Depends on: Phase 1 data model.
- Subtasks/checklists, tags, recurrence (RRULE subset), estimates, start dates, archive.
- Multi-select and bulk actions; keyboard list navigation (J/K, X, E).
- Board (Kanban by status) and table views over the same records.
- Dashboard customisation: reorder/hide widgets with a keyboard alternative (dnd-kit).
- Schema v2 migration (tested like v1), and moving storage to IndexedDB (`idb`) behind the same load/save API.

## Phase 3: Calendar and planning

Depends on: Phase 2 (estimates, recurrence).
- `CalendarEvent` model; day/week/month/agenda views; drag to move and resize; click to create.
- Time-blocking: a block references `taskId`; rescheduling never duplicates the task.
- Deterministic planner: fills free working hours by priority and due date, shows a **preview**, never overwrites events.
- Conflict detection (overlaps, impossible due dates, focus vs meeting).
- Library decision: evaluate FullCalendar vs a custom grid (bundle size, a11y, mobile).

## Phase 4: Projects and notes

Depends on: Phase 2.
- `Project` model (status, milestones, colour, deadline); project views reuse task views.
- Notes with Tiptap: slash menu, task/project references by id, autosave, safe serialisation (no raw HTML storage).
- Templates that create real, editable records with a preview first.

## Phase 5: Focus, goals, habits

- Focus: custom timer, stopwatch, interruption logging, per-project focus time.
- Goals: milestones, hierarchy (annual → quarterly → weekly), progress from linked work only.
- Habits: schedules, streaks without guilt messaging, heatmap, DST-safe date handling.

## Phase 6: Accounts and sync (external services)

Recommended: **Supabase** (Postgres + Auth + Row Level Security + Storage).
- Schema mirrors `WorkspaceData`; RLS on every table; workspace ownership checks.
- Local-first sync: IndexedDB outbox, `updatedAt` + per-record version for conflict detection, visible states (Saved / Offline / Pending / Conflict).
- One-time upload of local data with preview; local data kept until the upload is verified.
- Wellness data excluded from sync unless explicitly enabled.
- Hosting must move off `*.github.io` (shared origin family) before accounts exist. Cloudflare Pages or Vercel recommended.

**Needed from you:** Supabase project (URL + anon key; service key stays server-side), a domain, a hosting choice, and an email provider for auth emails.

## Phase 7: Integrations, search, analytics, assistant

- Google Calendar (read-only first) via server-side OAuth token exchange. Tokens never reach the browser.
- Global search (client index first; Postgres full-text once synced).
- Analytics + weekly review with export.
- Astra assistant: provider-agnostic server endpoint, tool calls that return **proposals**, user confirmation before any change, quotas. The core app must remain fully useful without it.

**Needed from you:** Google Cloud OAuth client + consent screen verification; an AI provider API key with spending limits.

## Phase 8: Commercialisation (requires explicit go-ahead)

- Marketing site with real screenshots (`docs/screenshots/` is the start), honest claims only.
- Stripe Checkout + Customer Portal, verified webhooks, server-side entitlements.

**Needed from you:** Stripe account, pricing decision, privacy policy and terms.

## Phase 9: Hardening (continuous)

- axe-core in E2E, manual screen-reader pass (NVDA + VoiceOver), Firefox/WebKit E2E projects.
- Lighthouse budgets in CI (LCP < 2.5 s, CLS < 0.1, INP < 200 ms), measured rather than assumed.
- Visual regression on the screenshot set.
- PWA: manifest, offline shell, installability.

## Rollback

Phase 1 is isolated on `feat/phase-1-foundation`. `main` and the live `gh-pages` site are unchanged. To roll back after a future merge, revert the merge commit. v0.2 keys are never modified, so the old build would still find the data it had. Caveat: anything created or changed *after* upgrading lives only in `astra.workspace.v1` and would not appear in the old build. Export it from Settings before rolling back.
