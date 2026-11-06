# AstraFocusNexus — Design Decisions

## D1. No router; state-driven view switching
**Decision:** Use `currentView` component state in `App.tsx` rather than installing `react-router`.
**Rationale:** The app is a single-page shell; a state switch is cheaper than adding a router dependency and keeps the bundle small. The spec said not to introduce unnecessary frameworks.

## D2. Tailwind CSS for styling
**Decision:** Continue with the existing Tailwind + custom `index.css` theme + `tokens.ts` design tokens.
**Rationale:** Design tokens already exist; reuse them rather than adopting a CSS-in-JS library.

## D3. Local storage as persistence adapter (Phase 3)
**Decision:** Use `localStorage` as the persistence layer for tasks/notes until a backend is authorized.
**Rationale:** Spec permits local persistence when backend is unavailable; avoids introducing a new backend service. Browser push notifications are **not** a reliable background service and will not be used as the notification mechanism.

## D4. No third-party rich-text editor unless justified
**Decision:** Evaluate a maintained block editor only if compatible with the strict TS setup; otherwise build a lightweight block editor ourselves.
**Rationale:** Avoid uncontrolled dependencies; the spec discourages building a full engine from scratch when alternatives exist.

## D5. Do not redesign working pages for cosmetics
**Decision:** Extend existing components; only touch files needed for the change.
**Rationale:** Preserves user work and minimizes risk of regressions.

## D6. Document unimplemented capabilities rather than simulate
**Decision:** Auth, multi-user isolation, cloud sync, real-time collaboration, and browser background notifications are explicitly NOT implemented and will be labeled as incomplete.
**Rationale:** Honesty about limits; no fake security or sync features.

## D7. Work on a dedicated development branch
**Decision:** Create a local dev branch before making feature commits; never force-push, reset, or delete user content.
**Rationale:** Change safety per the autonomous workflow.

## D8. Verification over appearance
**Decision:** A feature is "complete" only when it compiles, persists, and behaves under a real test. Successful HTTP/SPA boot is not proof of React behavior.
**Rationale:** Prevents declaring success on unverified features.

## D9. Conserve context / tool calls
**Decision:** Prefer Serena symbol navigation and targeted reads; avoid scanning node_modules or generated build output.
**Rationale:** Local model with limited resources.
