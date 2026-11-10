import { afterEach, describe, expect, it, vi } from "vitest";
import { AIError, CHAT_TIMEOUT_MS, STREAM_IDLE_MS, buildChatBody, createOpenAICompatibleAdapter, type ConnectionTarget } from "./client";
import { GOAL_TASKS_FORMAT, buildGoalMessages } from "./goalBreakdown";
import { jsonResponse as json, streamResponse } from "./testUtils";

/** SIMULATED: every test here uses a mocked fetch; no network is used. */

const target: ConnectionTarget = { baseUrl: "https://api.example.com/v1", model: "test-model", apiKey: "sk-secret-123456789", structured: "json_schema" };

afterEach(() => vi.useRealTimers());

describe("request formatting", () => {
  it("posts to {base}/chat/completions with bearer auth and safe fetch options", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { choices: [{ message: { content: "hi" } }] }));
    const out = await createOpenAICompatibleAdapter(fetchMock).chat(target, buildGoalMessages("Learn Spanish"), { format: GOAL_TASKS_FORMAT });
    expect(out.text).toBe("hi");
    expect(out.metrics.totalMs).toBeGreaterThanOrEqual(0);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("error");
    expect(init.credentials).toBe("omit");
    expect(init.referrerPolicy).toBe("no-referrer");
    expect(init.headers.Authorization).toBe("Bearer sk-secret-123456789");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("test-model");
    expect(body.stream).toBe(false);
    expect(body.messages[1]).toEqual({ role: "user", content: "Goal: Learn Spanish" });
    expect(body.response_format).toEqual({ type: "json_schema", json_schema: { name: "goal_tasks", schema: GOAL_TASKS_FORMAT.schema, strict: true } });
  });

  it("omits response_format in prompt mode", () => {
    expect(buildChatBody({ ...target, structured: "prompt" }, [], GOAL_TASKS_FORMAT)).not.toHaveProperty("response_format");
  });

  it("sends no Authorization header without a key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { data: [] }));
    await createOpenAICompatibleAdapter(fetchMock).listModels({ baseUrl: "http://127.0.0.1:1234/v1", apiKey: "" });
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  });

  it("never puts the key in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { data: [] }));
    await createOpenAICompatibleAdapter(fetchMock).listModels(target);
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("secret");
  });

  it("refuses an invalid endpoint without sending anything", async () => {
    const fetchMock = vi.fn();
    await expect(createOpenAICompatibleAdapter(fetchMock).chat({ ...target, baseUrl: "http://evil.example.com/v1" }, [])).rejects.toMatchObject({ kind: "invalid_endpoint" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("model discovery", () => {
  it("returns sorted unique ids", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { object: "list", data: [{ id: "b" }, { id: "a" }, { id: "b" }, { nope: 1 }] }));
    expect(await createOpenAICompatibleAdapter(fetchMock).listModels(target)).toEqual([{ id: "a" }, { id: "b" }]);
  });
  it("returns null when the server has no /models", async () => {
    expect(await createOpenAICompatibleAdapter(vi.fn().mockResolvedValue(json(404, { error: "not found" }))).listModels(target)).toBeNull();
  });
  it("probe reports latency without generating", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { data: [{ id: "a" }] }));
    const p = await createOpenAICompatibleAdapter(fetchMock).probe(target);
    expect(p.latencyMs).toBeGreaterThanOrEqual(0);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/models$/);
  });
});

describe("errors", () => {
  const run = (status: number, body: unknown) =>
    createOpenAICompatibleAdapter(vi.fn().mockResolvedValue(json(status, body))).chat(target, []).then(
      () => {
        throw new Error("expected a failure");
      },
      (e: unknown) => e as AIError
    );

  it("maps 401 to auth without leaking the key", async () => {
    const e = await run(401, { error: { message: "Incorrect API key provided: sk-secret-123456789", type: "invalid_request_error", code: "invalid_api_key" } });
    expect(e.kind).toBe("auth");
    expect(e.message).not.toContain("sk-secret-123456789");
  });
  it("distinguishes quota from rate limiting", async () => {
    expect((await run(429, { error: { message: "quota", type: "insufficient_quota", code: "insufficient_quota" } })).kind).toBe("quota");
    expect((await run(429, { error: { message: "slow down", code: "rate_limit_exceeded" } })).kind).toBe("rate_limit");
  });
  it("maps a missing model", async () => {
    const e = await run(404, { error: { message: "The model `x` does not exist", code: "model_not_found" } });
    expect(e.kind).toBe("model_not_found");
    expect(e.message).toContain("test-model");
  });
  it("explains a 403 as access or CORS", async () => {
    expect((await run(403, {})).message).toMatch(/CORS/);
  });
  it("maps server errors and malformed replies", async () => {
    expect((await run(503, {})).kind).toBe("server");
    expect((await run(200, { choices: [] })).kind).toBe("malformed");
    const notJson = await createOpenAICompatibleAdapter(vi.fn().mockResolvedValue(new Response("<html>", { status: 200 }))).chat(target, []).catch(e => e);
    expect(notJson.kind).toBe("malformed");
  });
  it("reports network failures (CORS, server down) as network", async () => {
    const e = await createOpenAICompatibleAdapter(vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))).chat(target, []).catch(err => err);
    expect(e.kind).toBe("network");
  });
  it("does not retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(500, {}));
    await createOpenAICompatibleAdapter(fetchMock).chat(target, []).catch(() => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("streaming (SSE)", () => {
  it("assembles deltas, reports tokens and metrics, ignores [DONE]", async () => {
    const sse = [
      'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n',
      '\ndata: {"choices":[],"usage":{"completion_tokens":2}}\n\ndata: [DONE]\n\n',
    ];
    const fetchMock = vi.fn().mockResolvedValue(streamResponse(sse));
    const pieces: string[] = [];
    const out = await createOpenAICompatibleAdapter(fetchMock).chat(target, [], { stream: true, onToken: p => pieces.push(p) });
    expect(out.text).toBe("Hello");
    expect(pieces).toEqual(["Hel", "lo"]);
    expect(out.metrics.outputTokens).toBe(2);
    expect(out.metrics.firstTokenMs).toBeGreaterThanOrEqual(0);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).stream).toBe(true);
  });
  it("fails clearly on an empty or unreadable stream", async () => {
    await expect(createOpenAICompatibleAdapter(vi.fn().mockResolvedValue(streamResponse([": keep-alive\n"]))).chat(target, [], { stream: true })).rejects.toMatchObject({ kind: "malformed" });
    await expect(createOpenAICompatibleAdapter(vi.fn().mockResolvedValue(streamResponse(["data: {nope\n"]))).chat(target, [], { stream: true })).rejects.toMatchObject({ kind: "malformed" });
  });
  it("cancels mid-stream", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn((_u: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(streamResponse(['data: {"choices":[{"delta":{"content":"Hi"}}]}\n'], { hang: true, signal: init!.signal! }))
    );
    const pieces: string[] = [];
    const p = createOpenAICompatibleAdapter(fetchMock).chat(target, [], { stream: true, signal: controller.signal, onToken: t => pieces.push(t) });
    await vi.waitFor(() => expect(pieces).toEqual(["Hi"]));
    controller.abort();
    await expect(p).rejects.toMatchObject({ kind: "cancelled" });
  });
  it("times out when a stream goes silent", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_u: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(streamResponse(['data: {"choices":[{"delta":{"content":"Hi"}}]}\n'], { hang: true, signal: init!.signal! }))
    );
    const p = createOpenAICompatibleAdapter(fetchMock).chat(target, [], { stream: true }).catch(e => e);
    await vi.advanceTimersByTimeAsync(STREAM_IDLE_MS + 1);
    const e = await p;
    expect(e.kind).toBe("timeout");
    expect(e.message).toMatch(/stopped/);
  });
});

/** A fetch that never settles until its signal aborts, like a hung server. */
const hangingFetch = vi.fn(
  (_url: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_, reject) => init!.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))
);

describe("cancellation and timeout", () => {
  it("cancels when the caller aborts", async () => {
    const controller = new AbortController();
    const p = createOpenAICompatibleAdapter(hangingFetch).chat(target, [], { signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toMatchObject({ kind: "cancelled" });
  });
  it("times out a hung request", async () => {
    vi.useFakeTimers();
    const p = createOpenAICompatibleAdapter(hangingFetch).chat(target, []).catch(e => e);
    await vi.advanceTimersByTimeAsync(CHAT_TIMEOUT_MS + 1);
    expect((await p).kind).toBe("timeout");
  });
  it("respects a custom timeout", async () => {
    vi.useFakeTimers();
    const p = createOpenAICompatibleAdapter(hangingFetch).chat(target, [], { timeoutMs: 1000 }).catch(e => e);
    await vi.advanceTimersByTimeAsync(1001);
    expect((await p).kind).toBe("timeout");
  });
});
