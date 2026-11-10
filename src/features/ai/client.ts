/**
 * OpenAI-compatible adapter. UI code talks to the `AIAdapter` interface only.
 *
 * Safety properties (covered by client.test.ts):
 * - The key is sent only in the Authorization header, only to the validated base URL.
 * - redirect: "error" — a 3xx never forwards the Authorization header elsewhere.
 * - credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store".
 * - Every request has a timeout and accepts a caller AbortSignal.
 * - No automatic retries (a retry can be a second paid request).
 * - Error messages never include the key.
 */
import { validateEndpoint } from "./endpoint";
import type { StructuredMode } from "./providers";

export interface ConnectionTarget {
  baseUrl: string;
  model: string;
  /** Empty string = no Authorization header. */
  apiKey: string;
  structured: StructuredMode;
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface JsonSchemaFormat {
  name: string;
  schema: Record<string, unknown>;
}

export type AIErrorKind =
  | "invalid_endpoint"
  | "auth"
  | "forbidden"
  | "model_not_found"
  | "not_found"
  | "quota"
  | "rate_limit"
  | "bad_request"
  | "server"
  | "malformed"
  | "timeout"
  | "cancelled"
  | "network"
  | "redirect";

export class AIError extends Error {
  readonly kind: AIErrorKind;
  readonly status?: number;
  constructor(kind: AIErrorKind, message: string, status?: number) {
    super(message);
    this.name = "AIError";
    this.kind = kind;
    this.status = status;
  }
}

export interface AIAdapter {
  /** GET {base}/models. Returns model ids, or null when the server doesn't offer a list. */
  listModels(target: Omit<ConnectionTarget, "model" | "structured">, signal?: AbortSignal): Promise<string[] | null>;
  /** POST {base}/chat/completions. Returns the assistant message text. */
  chat(target: ConnectionTarget, messages: ChatMessage[], options?: { format?: JsonSchemaFormat; signal?: AbortSignal; timeoutMs?: number }): Promise<string>;
}

export const MODELS_TIMEOUT_MS = 15_000;
/**
 * Local "thinking" models are slow: qwen3.5:9b took ~108 s for a goal breakdown on a
 * desktop GPU in testing. Long enough for that, short enough to notice a hang.
 */
export const CHAT_TIMEOUT_MS = 180_000;

type Fetch = typeof fetch;

/** Combine the caller's signal with a timeout, tracking which one fired. */
function withTimeout(signal: AbortSignal | undefined, ms: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

function headers(apiKey: string, json: boolean): HeadersInit {
  const h: Record<string, string> = { Accept: "application/json" };
  if (json) h["Content-Type"] = "application/json";
  if (apiKey) h.Authorization = `Bearer ${apiKey}`;
  return h;
}

function providerMessage(body: unknown): { message?: string; code?: string; type?: string } {
  if (!body || typeof body !== "object") return {};
  const err = (body as { error?: unknown }).error;
  if (typeof err === "string") return { message: err };
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    return {
      message: typeof e.message === "string" ? e.message : undefined,
      code: typeof e.code === "string" ? e.code : undefined,
      type: typeof e.type === "string" ? e.type : undefined,
    };
  }
  return {};
}

/** Keep provider text short and strip anything that looks like a bearer token. */
function clean(text: string | undefined, apiKey: string): string {
  if (!text) return "";
  let t = text.slice(0, 240);
  if (apiKey) t = t.split(apiKey).join("[key]");
  return t.replace(/\b(sk-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]+/g, "$1…");
}

export function errorForStatus(status: number, body: unknown, apiKey: string, model?: string): AIError {
  const { message, code, type } = providerMessage(body);
  const detail = clean(message, apiKey);
  const suffix = detail ? ` Server said: “${detail}”` : "";
  if (status === 401) return new AIError("auth", "The server rejected the API key. Check that it’s correct and active." + suffix, status);
  if (status === 403) return new AIError("forbidden", "This key isn’t allowed to use that model or endpoint." + suffix, status);
  if (status === 404) {
    const looksLikeModel = code === "model_not_found" || /model/i.test(message ?? "");
    return looksLikeModel
      ? new AIError("model_not_found", `The server doesn’t have a model named “${model ?? ""}”. Check the exact name, or use Load models.` + suffix, status)
      : new AIError("not_found", "Nothing answered at that path. Check the base URL (it usually ends in /v1)." + suffix, status);
  }
  if (status === 429) {
    if (code === "insufficient_quota" || type === "insufficient_quota") {
      return new AIError("quota", "Your provider account is out of credit or over its spending limit." + suffix, status);
    }
    return new AIError("rate_limit", "The provider is rate-limiting requests. Wait a minute and try again." + suffix, status);
  }
  if (status === 400 || status === 422) return new AIError("bad_request", "The server couldn’t process the request." + suffix, status);
  if (status >= 500) return new AIError("server", `The server had an error (HTTP ${status}). Try again later.` + suffix, status);
  return new AIError("server", `Unexpected response (HTTP ${status}).` + suffix, status);
}

async function request(
  fetchImpl: Fetch,
  url: string,
  init: { method: "GET" | "POST"; apiKey: string; body?: unknown; signal?: AbortSignal; timeoutMs: number; model?: string }
): Promise<unknown> {
  const t = withTimeout(init.signal, init.timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: init.method,
      headers: headers(init.apiKey, init.body !== undefined),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: t.signal,
      redirect: "error",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      mode: "cors",
    });
  } catch (e) {
    t.done();
    if (t.timedOut()) throw new AIError("timeout", `No response after ${Math.round(init.timeoutMs / 1000)} seconds. The server may be busy or the model still loading.`);
    if (init.signal?.aborted || (e instanceof DOMException && e.name === "AbortError")) throw new AIError("cancelled", "Request cancelled.");
    throw new AIError(
      "network",
      "Couldn’t reach the server. It may not be running, the URL may be wrong, the browser may have blocked the request (CORS or local network permission), or it tried to redirect."
    );
  }
  try {
    if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
      throw new AIError("redirect", "The server tried to redirect. Redirects are blocked so your key can’t be forwarded elsewhere. Use the final URL.");
    }
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
    if (!res.ok) throw errorForStatus(res.status, body, init.apiKey, init.model);
    if (body === null) throw new AIError("malformed", "The server replied, but not with JSON. Is this an OpenAI-compatible endpoint?");
    return body;
  } catch (e) {
    if (e instanceof AIError) throw e;
    if (t.timedOut()) throw new AIError("timeout", `No response after ${Math.round(init.timeoutMs / 1000)} seconds.`);
    if (init.signal?.aborted) throw new AIError("cancelled", "Request cancelled.");
    throw new AIError("malformed", "Couldn’t read the server’s response.");
  } finally {
    t.done();
  }
}

function checkedBase(baseUrl: string): string {
  const v = validateEndpoint(baseUrl);
  if (!v.ok) throw new AIError("invalid_endpoint", v.error);
  return v.baseUrl;
}

export function buildChatBody(target: ConnectionTarget, messages: ChatMessage[], format?: JsonSchemaFormat) {
  const body: Record<string, unknown> = { model: target.model, messages, stream: false };
  if (format && target.structured === "json_schema") {
    body.response_format = { type: "json_schema", json_schema: { name: format.name, schema: format.schema, strict: true } };
  }
  return body;
}

export function createOpenAICompatibleAdapter(fetchImpl: Fetch = (...a) => fetch(...a)): AIAdapter {
  return {
    async listModels(target, signal) {
      const base = checkedBase(target.baseUrl);
      let body: unknown;
      try {
        body = await request(fetchImpl, `${base}/models`, { method: "GET", apiKey: target.apiKey, signal, timeoutMs: MODELS_TIMEOUT_MS });
      } catch (e) {
        if (e instanceof AIError && (e.kind === "not_found" || (e.kind === "server" && e.status === 405))) return null;
        throw e;
      }
      const data = (body as { data?: unknown }).data;
      if (!Array.isArray(data)) throw new AIError("malformed", "The model list wasn’t in the expected format.");
      const ids = data
        .map(m => (m && typeof m === "object" && typeof (m as { id?: unknown }).id === "string" ? (m as { id: string }).id : null))
        .filter((id): id is string => !!id);
      return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
    },

    async chat(target, messages, options = {}) {
      const base = checkedBase(target.baseUrl);
      if (!target.model.trim()) throw new AIError("bad_request", "Enter a model name first.");
      const body = await request(fetchImpl, `${base}/chat/completions`, {
        method: "POST",
        apiKey: target.apiKey,
        body: buildChatBody(target, messages, options.format),
        signal: options.signal,
        timeoutMs: options.timeoutMs ?? CHAT_TIMEOUT_MS,
        model: target.model,
      });
      const choice = (body as { choices?: unknown }).choices;
      const first = Array.isArray(choice) ? choice[0] : undefined;
      const message = first && typeof first === "object" ? (first as { message?: unknown }).message : undefined;
      const content = message && typeof message === "object" ? (message as { content?: unknown }).content : undefined;
      if (typeof content !== "string") {
        const refusal = message && typeof message === "object" ? (message as { refusal?: unknown }).refusal : undefined;
        if (typeof refusal === "string" && refusal) throw new AIError("malformed", `The model declined: ${refusal.slice(0, 200)}`);
        throw new AIError("malformed", "The server replied without any message text.");
      }
      return content;
    },
  };
}

export const defaultAdapter = createOpenAICompatibleAdapter();
