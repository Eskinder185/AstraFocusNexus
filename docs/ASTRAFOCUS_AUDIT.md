# AstraFocus — Repository Audit

**Audited:** 2026-11-06 · **Branch audited:** `main` @ `b773330b` plus the uncommitted working tree found on disk
**Method:** source reading, local builds, and (after Phase 1) automated browser tests. Anything not verified is marked **Unverified**.

Earlier documents in `docs/archive/` were found to be inaccurate (they state "no router", "no persistence" and "Build: PASS", all contradicted by the code). They are kept for history only.

---

## 1. Summary

| Area | Finding |
|---|---|
| Live site | `gh-pages` branch last deployed **2025-09-02**. It predates the April 2026 Focus-page refactor, so the live site runs older code than `main`. |
| `main` as committed | `src/pages/Dashboard.tsx` imports `../design-system/components`, which was never committed. CRA type-checks every file under `src`, so a clean checkout of `main` **very likely fails to build** (Unverified on a clean clone). |
| Working tree on disk | Contained large uncommitted work from earlier sessions. **`npm run build` failed** (TS2322: `App.tsx` passes task props to `Dashboard`, which now exported only the focus card). In that state the home route had no task list or task form. |
| Build system | `react-scripts` 5 (Create React App, deprecated) drove the scripts; `vite` 7 was installed but unused. `tailwindcss` + `tailwind.config.js` existed, but CSS had no `@tailwind` directives, so every Tailwind class in the WIP sidebar produced no styles. |
| Version control | `node_modules/` (≈38,700 files) and `build/` were committed. `package.json` pointed to the old `Eskinder185/tasktracker` repository. |
| Accessibility | `public/index.html` set `maximum-scale=1, user-scalable=no`, which blocks zoom (WCAG 1.4.4 failure). |
| Data model | Three different `Task` interfaces (`App.tsx`, `pages/*.tsx`, `types.ts`); `types.ts` (title/status) didn't match the stored data (text/completed). |
| Styling | A single 3,313-line `index.css` "neon" theme plus a `LiveBackground` canvas animation running continuously. |
| Tests | None. |

The snapshot of that working tree is preserved in commit `692f172c` on `feat/phase-1-foundation`, so nothing from earlier sessions was lost.

## 2. Feature inventory (v0.2 behaviour)

Status reflects the **last coherent code** (`main` source, `App.tsx` + `pages/Home.tsx`), judged by reading the code. v0.2 was never run in a browser during this audit.

| Feature | v0.2 status | Notes | Phase 1 outcome |
|---|---|---|---|
| Task create / complete / delete | Working (code) | Stored in `task-tracker.tasks.v4`. Ids were `Date.now()`. | Preserved, migrated, E2E-tested |
| Due date + time | Working (code) | `datetime-local` string, parsed with `Date.parse`. | Split into local `dueDate` + `dueTime` |
| Reminders | Partially working | 30 s interval checks while a tab is open; browser `Notification` only, no in-app fallback. | Preserved; adds in-app toast fallback |
| Eisenhower priority (UI/UN/NI/NN) | Working (code) | | Preserved (same codes) |
| Priority Matrix page | Working (code) | Move via code buttons. | Rebuilt: drag-and-drop + "Move to" |
| Goals + linked tasks | Working (code) | Progress = done/total linked tasks. | Preserved, extended (target date, next action, focus time) |
| "Use goal for new tasks" | Working (code) | `task-tracker.goalPref`. | Migrated to `prefs.defaultGoalId` |
| Pomodoro timer | Working (code) | Timestamp-based (`endAt`), persists runtime in `pomodoro.session.v1`, survives navigation and refresh. **Best code in the repo.** | Engine kept; completion now reports session info |
| Focus ↔ task link | Partially working | Linked task id lived in React state only, so it was lost on refresh. Skipping a focus segment still credited a Pomodoro. | Link persisted; skips no longer credit |
| Break suggestions modal | Working (code) | | Restyled; same flow |
| Mood / stress check-in | Partially working | Wrote a default `{mood:3, stress:3}` entry for today **on every app load**, so history can't distinguish real check-ins from defaults. | Writes only on interaction; reads old entries |
| Idle nudge (50 min) | Working (code) | | Preserved |
| Light / dark theme | Partially working | Toggle lived in the old `Nav`; the WIP shell didn't expose it. | System / Light / Dark, no flash on load |
| About / FAQ pages | Working (code) | | Merged into Help; old routes redirect |
| Confetti on completion | Working (code) | DOM confetti. | Replaced by check animation + undo toast |
| Exam helpers (`utils/exam.ts`) | Unused | Not imported anywhere; unrelated quiz logic. | Removed |

## 3. Data persistence (localStorage keys)

| Key | Owner | Shape | Phase 1 handling |
|---|---|---|---|
| `task-tracker.tasks.v4` | v0.2 | `[{id:number, text, completed, createdAt, dueAt?, remind?, notified?, pomos?, priority?, goalId?}]` | Imported; **never modified** |
| `task-tracker.goals.v1` | v0.2 | `[{id:number, title, emoji?}]` | Imported; never modified |
| `task-tracker.goalPref` | v0.2 | `number \| null` | Imported |
| `task-tracker.theme` | v0.2 | `"light" \| "dark"` | Reused (adds `"system"`) |
| `wellness.entry.YYYY-MM-DD` | v0.2 | `{date, mood, stress}` | Reused as-is (adds optional `energy`) |
| `pomodoro.settings`, `pomodoro.session.v1` | v0.2 | timer settings / runtime snapshot | Reused unchanged |
| `astra.workspace.v1` | **new** | versioned workspace (see ARCHITECTURE.md) | Source of truth for tasks, goals, sessions, prefs |
| `astra.backup.legacy-v0` | **new** | raw copy of the three legacy keys, written once | Downloadable from Settings |

## 4. Security & privacy observations

- No backend, no secrets, no network calls beyond static assets. Risk surface is small.
- All user content is rendered through React (escaped); no `dangerouslySetInnerHTML`.
- Data is unencrypted in localStorage and readable by any script on the origin. That is acceptable for a local-only app, and must be revisited before adding third-party scripts or auth tokens.
- `github.io` is a shared origin family, but localStorage is per-origin (`eskinder185.github.io`). Any other project page under the same user subdomain **shares this storage**. This is a real reason to move to a dedicated domain before accounts or sensitive data are added.

## 5. Migration risks

| Risk | Mitigation (implemented) |
|---|---|
| Corrupt or hand-edited legacy JSON | Per-record validation; invalid records are skipped and counted; originals untouched |
| Re-running the import duplicates tasks | Deterministic ids (`legacy-t-<id>`), import runs only when no v1 workspace exists |
| v1 workspace becomes unreadable | Raw value copied to `astra.workspace.v1.unreadable.<ts>` before rebuilding from legacy keys |
| Legacy completions have no timestamp | `completedAt = null`; analytics treat them as undated (documented) |
| Two tabs open during upgrade | Cross-tab `storage` sync; import is idempotent |

## 6. Repository hygiene (left for the owner)

These untracked files are not part of the app. They were **not deleted**, only excluded from commits (now covered by `.gitignore` where safe):

`_tracked.txt` (2 MB), `_vrf_blob.txt`, `temp_dashboard.txt`, `src/index.tsx.tmp`, `src/pages/Dashboard.git.orig.bytes.txt`, `AGENT_TEST.md`, `PATCH_SUMMARY.md` (describes changes that don't match the code), `run-astra-v3.ps1`, `scripts/extract_church_history.py`, `tmp/church-history-extract/` (unrelated project).
