# Phase 1 & 2 Add‑Ons

This patch adds:
- Wellness check‑in (mood + stress) with supportive suggestion
- 50‑minute break nudges (Notification API / alert fallback)
- Eisenhower Matrix priorities (UI, UN, NI, NN) + Matrix view
- Personal Goals panel with simple progress bars

## Files added
- `src/types.ts`
- `src/hooks/useNudges.ts`
- `src/components/WellnessPanel.tsx`
- `src/components/GoalsPanel.tsx`
- `src/components/PriorityMatrix.tsx`
- `src/App_Phase12.tsx` (a drop‑in updated App component)
- CSS appended to `src/index.css`

## How to use
1. **Option A (safe)**: Rename your current `src/App.tsx` to `src/App_backup.tsx`. Then rename `src/App_Phase12.tsx` → `src/App.tsx`.
2. Ensure your project builds: `npm i` then `npm run dev` (or `npm run build`).
3. If you had custom types for `Task`, adjust `src/types.ts` or update imports accordingly.
4. To enable break notifications, click **Enable Notifications** once in the UI.
5. Switch to **Matrix** view to manage tasks by Eisenhower quadrant.
6. Add **Goals** and use “Use for new tasks” to auto‑attach future tasks.

> Note: Location‑based reminders and templates are planned for later phases.
