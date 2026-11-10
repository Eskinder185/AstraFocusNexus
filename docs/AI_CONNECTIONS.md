# AI assistant (Bring Your Own AI)

AstraFocus can optionally use an AI model **you** run or provide. Everything else in the app
works without it, nothing is sent in the background, and no AstraFocus account is needed.

- **Set up:** sidebar → **AI assistant** (`#/ai`). Settings shows a short summary that links there.
- **Use:** Goals → **Break into tasks**.
- **Providers:** Ollama (native API), LM Studio and any OpenAI-compatible server
  (`/v1/chat/completions`), and OpenAI with your own key. Native Anthropic and Gemini APIs are
  **not** supported.

## The setup wizard

Two entry points on the AI assistant page:

**“I already have a local AI”** (4 steps)
1. **Find:** “Scan this computer” checks `127.0.0.1` ports 11434 (Ollama), 1234 (LM Studio)
   and 8080 (llama.cpp / other). Only when you press the button; GETs only; no data sent.
   You can also type an address. Then tick “Allow AstraFocus to send requests to …”.
2. **Pick a model** from the installed list (size, parameters, quantization, context,
   capabilities), or type a name.
3. **Test:** a connection test (server reachable → model installed → model details; no text
   generated), then an optional streamed test prompt that reports time to first words,
   total time and tokens per second. You can only continue after a real, successful check.
4. **Done.**

**“Help me install my first AI”** (9 steps) adds, before those:
1. **About your computer:** OS, CPU, RAM, GPU, VRAM, free disk, intended tasks. Values the
   browser exposes are marked **Detected**, your edits **You entered**, the rest **Unknown**.
2. **Choose a model:** Lightweight / Balanced / Higher quality, with download size, estimated
   memory, where it runs (GPU / unified memory / CPU) and trade-offs. Estimates only.
3. **Install Ollama:** per-OS steps, official download links, copyable commands, start/stop
   instructions, and an LM Studio alternative.
4. **Download your model:** `ollama pull <model>` and friends, ready to copy.
5. **Let AstraFocus connect:** `OLLAMA_ORIGINS` instructions per OS (skipped automatically
   when AstraFocus itself runs on localhost).

AstraFocus never downloads or runs anything on your computer; it only shows instructions.

### What the browser can and can’t detect

| Value | Source | Notes |
| --- | --- | --- |
| OS | `navigator.userAgentData.platform` / user agent | usually right |
| CPU threads | `navigator.hardwareConcurrency` | logical threads |
| RAM | `navigator.deviceMemory` | Chromium only, rounded, **capped at 8 GB** (shown as “at least”) |
| GPU name | WebGL `WEBGL_debug_renderer_info` | may be generic or hidden |
| CPU model, VRAM, free disk | — | never available; entered by the user |

### How recommendations are calculated (`src/features/ai/recommend.ts`)

- Catalogue: verified Ollama tags and download sizes (ollama.com/library, Nov 2026):
  `llama3.2`, `qwen3`, `gemma3` (long documents), `qwen2.5-coder` (coding).
- Memory ≈ download × 1.15 + params(B) × 0.05 GB per 4K tokens of context + 0.5 GB.
  Context assumed: 4K (Ollama’s default) or 32K for long documents.
- Budget: 90 % of VRAM (NVIDIA/AMD with VRAM entered), 65 % of RAM on Apple Silicon,
  60 % of RAM on CPU-only machines (capped at 14B parameters). Models that overflow VRAM but
  fit with system RAM are marked “split between GPU and CPU (slower)”.
- All constants are in one `RULES` object so they’re easy to tune.

## The dashboard

After setup the AI page shows: provider, server URL and version, model, last check; the test
panel with diagnostics and latency; default model picker with capabilities; privacy and
permissions; and **Run setup again**, **Disconnect** (forget key, results and permission)
and **Reset** (forget everything, including remembered settings).

## Privacy model

- **API keys** live in React memory only: they survive moving between pages and are gone on
  reload. Never written to any storage, URL, log or export (Playwright asserts this).
- **Non-secret settings for servers on this computer** (provider, loopback URL, model, and
  the permission for that exact URL) are remembered in `localStorage` under
  `astra.ai.config.v1`, and only once you’ve chosen a model or given permission. Remote and
  cloud settings are never remembered. A remembered setup shows “Saved, not checked yet”;
  AstraFocus makes **no request on page load**.
- Changing the provider or URL clears the key, status, model list, diagnostics and permission.
- Nothing is sent before you tick the permission box for that exact destination.
- The goal planner sends only the goal text (shown to you first). Suggestions become tasks
  only when you press **Add selected tasks**. AI never changes tasks, goals, calendar or
  wellness data on its own.
- A key held by a web page isn’t a secure vault. Use a key with a spending limit.

## Connection layer

| File | Purpose |
| --- | --- |
| `client.ts` | `AIAdapter` interface; shared HTTP (timeouts, idle timeout for streams, cancellation, `redirect: "error"`, no retries, error mapping); OpenAI-compatible adapter with SSE streaming |
| `ollama.ts` | Ollama native adapter: `/api/version`, `/api/tags`, `/api/show`, `/api/chat` (NDJSON streaming, `format`, `think: false` for thinking models, tokens/s from `eval_count`/`eval_duration`) |
| `discovery.ts` | “Scan this computer” |
| `hardware.ts`, `recommend.ts` | detection and recommendation engine |
| `installGuide.ts` | per-OS instructions and commands |
| `configStore.ts` | non-secret local settings |
| `connectionState.ts`, `AIConnectionProvider.tsx` | state, invalidation rules, diagnostics |
| `SetupWizard.tsx`, `AIPage.tsx`, `AIConnectionsSection.tsx` | UI |

Timeouts: 15 s for checks, 180 s to the first byte of a reply, 60 s of silence mid-stream,
120 s for the test prompt. Model output is only rendered as text.

Why the native Ollama API: on a real Ollama 0.40.15 with `qwen3.5:9b`, a goal breakdown
took ~108 s through `/v1/chat/completions` (the model “thinks” first) and **7.3 s** natively
with `think: false`.

## Ollama setup (short version)

1. Install from <https://ollama.com/download> (Windows `OllamaSetup.exe`, macOS
   `Ollama.dmg`, Linux `curl -fsSL https://ollama.com/install.sh | sh`).
2. `ollama pull qwen3:8b` (or the model the wizard suggests).
3. Keep Ollama on `127.0.0.1:11434` (the default). Don’t set `OLLAMA_HOST=0.0.0.0`.
4. Running AstraFocus locally (`npm run dev`)? Nothing else to do. Using the live site? Set
   `OLLAMA_ORIGINS=https://eskinder185.github.io` and restart Ollama (the wizard shows the
   exact command per OS).
5. AI assistant → **I already have a local AI** → Scan → Pick → Test.

If Ollama is bound to a LAN address (e.g. `OLLAMA_HOST=10.0.0.243`), AstraFocus refuses it:
plain HTTP is only allowed for loopback addresses.

## Browser compatibility

- **Same-device page** (`npm run dev` / `npm run preview`): works in all modern browsers.
- **Live HTTPS site → `http://127.0.0.1`:** Chrome/Edge 142+ ask for Local Network Access
  permission (choose Allow). Other browsers may block it; AstraFocus can’t work around that
  and doesn’t try. See [AI_COMPANION_CONNECTOR.md](AI_COMPANION_CONNECTOR.md) for a design
  for that case (not implemented).
- A browser can’t tell “server not running” from “blocked by CORS”; the UI says so.

## Tests

- `src/features/ai/*.test.ts` (Vitest, **simulated**): endpoints, adapters, streaming,
  cancellation, timeouts, errors, hardware parsing, recommendations, install guide, storage.
- `e2e/ai.spec.ts`, `e2e/ai-setup.spec.ts` (Playwright, **simulated** with `page.route`):
  wizard paths, scan results, CORS-blocked, missing server/model, timeout, cancellation,
  permissions, storage, keyboard, 375/430 px.
- `e2e/ai-real.spec.ts` (**real**, skipped by default):
  `REAL_OLLAMA=1 REAL_OLLAMA_MODEL=qwen3.5:9b npx playwright test ai-real` with Ollama on
  `127.0.0.1:11434`.

## Undo

Everything lives on the `feat/ai-setup-wizard` branch (built on `feat/ai-connections`). To
drop it, don’t merge it, or delete the branch. To clear remembered settings in a browser,
use **Reset** on the AI page (or remove `astra.ai.config.v1` from localStorage).
