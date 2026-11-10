# AstraFocus

**Plan with clarity. Focus with intention. Make meaningful progress.**

AstraFocus is a calm productivity workspace that brings tasks, priorities, goals and deep-work sessions together in one place. It's keyboard-first on desktop and built for touch on mobile.

![Overview, dark theme](docs/screenshots/overview-desktop-dark.png)

> Live (previous version): https://eskinder185.github.io/AstraFocusNexus/
> The live site still runs v0.2. The redesign on `feat/phase-1-foundation` has not been deployed yet.

## What it does today

- **Overview:** today at a glance, top priorities, a timeline of today's timed tasks and focus sessions, goal progress, and insights drawn only from your data.
- **Tasks:** natural-language capture (`Lab report thu 9am !1`), smart grouping (overdue, today, upcoming, no date), filters, a detail panel, and undo.
- **Focus Studio:** a Pomodoro timer that survives navigation, refresh and sleep; linked tasks; atmospheres; distraction-free mode; ambient noise generated on-device.
- **Priority Matrix:** Eisenhower quadrants with drag-and-drop and a keyboard alternative.
- **Goals:** progress from the linked work you actually finish, the next action, and time invested.
- **Wellness:** an optional, private mood, stress and energy check-in with supportive, non-medical suggestions.
- **Command palette:** <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> to search, navigate, create tasks and control the timer.
- **AI connections (optional):** bring your own model (Ollama, LM Studio, OpenAI or an OpenAI-compatible server) to break a goal into a reviewable task draft. Keys stay in memory only. See [AI connections](docs/AI_CONNECTIONS.md).

All data stays in your browser on this device. Export it any time from Settings. Accounts and sync are on the [roadmap](docs/IMPLEMENTATION_ROADMAP.md).

## Development

Requires Node 20.19+.

```bash
npm install
npm run dev          # http://localhost:5173/AstraFocusNexus/
npm run typecheck
npm test             # unit tests (Vitest)
npm run build        # type check + production build → build/
npm run test:e2e     # Playwright against the production build (run `npx playwright install chromium` once)
```

Capture review screenshots with `SCREENSHOTS=1 npx playwright test screenshots`.

## Documentation

- [Audit](docs/ASTRAFOCUS_AUDIT.md): what was found, feature-by-feature status
- [Product vision](docs/PRODUCT_VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Implementation roadmap](docs/IMPLEMENTATION_ROADMAP.md)
- [AI connections](docs/AI_CONNECTIONS.md): setup for Ollama, LM Studio, OpenAI and custom servers

## Deployment

`npm run deploy` publishes `build/` to the `gh-pages` branch. Only deploy reviewed, tested builds.
