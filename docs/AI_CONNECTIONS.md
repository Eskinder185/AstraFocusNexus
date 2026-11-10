# AI connections (Bring Your Own AI)

AstraFocus can optionally use an AI model **you** provide to break a goal into tasks.
Everything else in the app works without it, and nothing is ever sent in the background.

- **Where:** Settings → AI connections (set up), Goals → **Break into tasks** (use).
- **Providers:** Ollama (local), LM Studio (local), OpenAI, and any custom server that
  implements the OpenAI-compatible `/chat/completions` API. Native Anthropic and Gemini
  APIs are **not** supported (they are not OpenAI-compatible and no adapter exists).

## Privacy model

- The connection (provider, URL, model, API key, consent) lives in React memory only.
  It survives moving between pages and is cleared on reload or when the tab closes.
- It is never written to localStorage, sessionStorage, IndexedDB, the URL, logs or the
  workspace export. Playwright tests assert this.
- Changing the provider or base URL clears the key, the connection status and consent.
- Before anything is sent, you must tick “Allow AstraFocus to send requests to <host>”.
  Consent is bound to that exact base URL.
- Only the goal text you type (or one goal title you pick) is sent, plus fixed
  instructions. The dialog shows exactly what will be sent before you press the button.
- Suggestions are a draft. Tasks are created only when you press **Add selected tasks**.

A key held by a web page is not a secure vault: browser extensions or other code
running on the page could read it. Use a key with a spending limit.

## Local Ollama setup

1. Install Ollama from <https://ollama.com> and pull a model, for example:
   ```
   ollama pull qwen3.5:9b
   ```
   (Any chat model works. Use the exact name from `ollama list`.)
2. Keep Ollama bound to this device (the default, `127.0.0.1:11434`). Don’t expose an
   unauthenticated Ollama server to your network or the internet.
3. Allow AstraFocus’s origin to call Ollama from the browser (CORS):
   - **Running AstraFocus locally** (`npm run dev` → `http://localhost:5173`, or
     `npm run preview`): nothing to do. Ollama accepts pages on `localhost` /
     `127.0.0.1` by default (verified on Ollama 0.40.15).
   - **Using the live site** (`https://eskinder185.github.io`): set the environment variable
     `OLLAMA_ORIGINS=https://eskinder185.github.io`. On Windows: quit Ollama from the
     taskbar, open “Edit environment variables for your account”, add the variable,
     then start Ollama again from the Start menu. Without it Ollama answers `403`.
4. In AstraFocus: Settings → AI connections → Provider **Ollama (local)**. The base URL
   defaults to `http://127.0.0.1:11434/v1`. Tick the consent box, press **Load models**
   (or type the model name), then **Test connection**.
5. Goals → **Break into tasks**.

Notes:
- If your Ollama is bound to a LAN address (`OLLAMA_HOST=10.x.x.x`), AstraFocus will refuse
  `http://10.x.x.x`: plain HTTP is only allowed for loopback. Bind to 127.0.0.1, or put it
  behind HTTPS.
- Ollama “cloud” models (e.g. names ending in `:cloud`) are served from ollama.com even
  though you reach them through localhost.
- Thinking models can be slow. A goal breakdown with `qwen3.5:9b` took ~108 s in testing;
  the request timeout is 180 s, and you can cancel at any time.
- Chrome and Edge may ask whether the site can access devices on your local network when the
  live site contacts `127.0.0.1`. Choose Allow. If your browser blocks it, run AstraFocus
  locally instead.

## LM Studio

Developer tab → start the server (default `http://localhost:1234/v1`) and turn on
**Enable CORS**. Choose **LM Studio (local)** in AstraFocus. An API key is only needed if
you enabled “Require Authentication”. AstraFocus requests JSON-schema structured output,
which LM Studio documents; small models may not follow it, in which case the reply is
parsed leniently or an error is shown.

## OpenAI

Choose **OpenAI**, paste your key, press **Load models** to see the model IDs your key can
use, pick one, tick consent, then **Test connection**. Testing uses `GET /v1/models` (it
doesn’t generate text). Generating tasks is billed to your OpenAI account.

## Custom OpenAI-compatible server

Enter its base URL (usually ending in `/v1`). Rules:
- Remote servers must use **HTTPS**. HTTP is allowed only for loopback (`localhost`,
  `127.0.0.0/8`, `::1`).
- No `user:pass@` in the URL, no query string or fragment.
- The server must allow CORS requests from the AstraFocus origin. AstraFocus does not use a
  proxy, so a provider that blocks browser requests cannot be used.
- Redirects are refused, so a key can’t be forwarded to another host.

## How it works (for reviewers)

| File | Purpose |
| --- | --- |
| `src/features/ai/endpoint.ts` | URL validation (scheme, credentials, HTTPS/loopback rules) |
| `src/features/ai/providers.ts` | Provider presets and doc sources |
| `src/features/ai/client.ts` | `AIAdapter` interface + OpenAI-compatible adapter: timeout, cancellation, no retries, `redirect: "error"`, error mapping |
| `src/features/ai/connectionState.ts` | Pure reducer: invalidation and consent rules |
| `src/features/ai/AIConnectionProvider.tsx` | In-memory shared state, test connection, model discovery |
| `src/features/ai/AIConnectionsSection.tsx` | Settings UI |
| `src/features/ai/goalBreakdown.ts` | Prompt, JSON schema, strict reply validation |
| `src/features/ai/GoalPlannerDialog.tsx` | Preview → generate → review/edit → explicit add |
| `src/features/ai/*.test.ts`, `e2e/ai.spec.ts` | Unit and browser tests (all provider responses mocked) |

Model output is only ever rendered as React text (no `dangerouslySetInnerHTML`).

## Undo

The feature is self-contained on the `feat/ai-connections` branch. To drop it, don’t merge
the branch (or delete it with `git branch -D feat/ai-connections`). If it was merged, revert
the merge commit with `git revert -m 1 <merge-sha>`. No stored data needs cleaning up,
because the feature never stores anything.
