# Design: optional local companion connector (not implemented)

**Status:** design only. Nothing in this document ships with AstraFocus today.

## Why it might be needed

AstraFocus is a static site (GitHub Pages). It talks to a local AI server straight from
the browser. That works when all of these hold:

1. The server sends CORS headers for the AstraFocus origin (Ollama: `OLLAMA_ORIGINS`;
   LM Studio: Enable CORS / `lms server start --cors`).
2. The browser allows a public HTTPS page to reach a loopback address. Chrome 142+ shows a
   Local Network Access permission prompt for this; other browsers may block it outright.
3. The browser doesn't treat `http://127.0.0.1` from an HTTPS page as blocked mixed content.

When (2) or (3) fails and the user can't run AstraFocus locally (`npm run dev`), a direct
connection is impossible. A companion connector would be the escape hatch.

## What it would be

A small, separately installed, open-source program that the user runs on their own
computer. It accepts requests from AstraFocus and forwards them to **one** configured local
AI server.

```
AstraFocus (browser) ──HTTPS/WSS + token──► companion (127.0.0.1:47_xxx) ──► Ollama (127.0.0.1:11434)
```

## Security requirements (non-negotiable)

- **Not a general proxy.** It forwards only to a fixed allowlist of paths on one target:
  `GET /api/version`, `GET /api/tags`, `POST /api/show`, `POST /api/chat` (and the
  OpenAI-compatible `/v1/models`, `/v1/chat/completions` for LM Studio). Any other method,
  path or host is rejected. No user-supplied target URLs.
- **Loopback only.** Binds `127.0.0.1` / `::1`. Never `0.0.0.0`. Refuses to start otherwise.
- **Pairing token.** On first run it shows a one-time pairing code; the user pastes it into
  AstraFocus, which exchanges it for a random 256-bit token. Every request must carry
  `Authorization: Bearer <token>`. Tokens are revocable from the companion.
- **Origin check.** Only the configured AstraFocus origin(s) receive CORS headers, and
  requests with any other `Origin` are rejected even with a valid token.
- **DNS-rebinding protection.** Reject requests whose `Host` header isn't a loopback name.
- **No secrets at rest in the browser.** The token is a device credential for a local
  service, not a cloud API key; it may be stored in localStorage, clearly labelled, and
  revocable. Cloud provider keys never pass through the companion.
- **Limits.** Request body size cap, per-request timeout, streaming passthrough with
  backpressure, no response caching, no logging of prompt bodies.
- **No auto-update or remote code.** Signed releases; the user installs updates manually.

## How AstraFocus would use it

- A new provider, "AstraFocus Connector", using the same `AIAdapter` interface.
- The wizard's "Find your local AI" step would also probe the companion's port, and offer it
  only when direct access fails.
- The privacy dashboard would show the connector, its target, and a "Revoke" action.

## Why it isn't built yet

Direct connections already work for local development and for Chrome/Edge users who allow
the local network prompt. A companion adds an installable binary to maintain and secure.
Build it only if real users hit browser restrictions the wizard can't solve.
