import { describe, expect, it, vi } from "vitest";
import type { ConnectionTarget } from "./client";
import { streamResponse } from "./testUtils";
import { scanTarget, SCAN_TARGETS } from "./discovery";
import { GOAL_TASKS_FORMAT } from "./goalBreakdown";
import { createOllamaAdapter, ollamaBase, parseShow, parseTags } from "./ollama";

/** SIMULATED: mocked fetch. Payload shapes copied from a real Ollama 0.40.15 server. */

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const target: ConnectionTarget = { baseUrl: "http://127.0.0.1:11434", model: "qwen3.5:9b", apiKey: "", structured: "prompt" };

const TAGS = {
  models: [
    { name: "qwen3.5:9b", size: 6550825574, details: { family: "qwen35", parameter_size: "9.0B", quantization_level: "Q4_K_M", context_length: 262144 }, capabilities: ["completion", "thinking"] },
    { name: "llama3.2:3b", size: 2019393189, details: { family: "llama", parameter_size: "3.2B", quantization_level: "Q4_K_M" } },
    { nope: true },
  ],
};

describe("parsing", () => {
  it("reads /api/tags", () => {
    expect(parseTags(TAGS)).toEqual([
      { id: "llama3.2:3b", sizeBytes: 2019393189, parameterSize: "3.2B", quantization: "Q4_K_M", family: "llama", contextLength: undefined, capabilities: undefined },
      { id: "qwen3.5:9b", sizeBytes: 6550825574, parameterSize: "9.0B", quantization: "Q4_K_M", family: "qwen35", contextLength: 262144, capabilities: ["completion", "thinking"] },
    ]);
    expect(() => parseTags({})).toThrow(/expected format/);
  });
  it("reads /api/show capabilities and context length", () => {
    const show = { capabilities: ["completion", "vision", "tools", "thinking"], details: { parameter_size: "9.0B", quantization_level: "Q4_K_M", family: "qwen35" }, model_info: { "general.architecture": "qwen35", "qwen35.context_length": 262144 } };
    expect(parseShow("qwen3.5:9b", show)).toMatchObject({ capabilities: ["completion", "vision", "tools", "thinking"], contextLength: 262144, parameterSize: "9.0B" });
  });
  it("accepts a /v1 base URL for Ollama", () => {
    expect(ollamaBase("http://127.0.0.1:11434/v1/")).toBe("http://127.0.0.1:11434");
  });
});

describe("adapter", () => {
  it("probes /api/version", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { version: "0.40.15" }));
    const p = await createOllamaAdapter(fetchMock).probe(target);
    expect(p.version).toBe("0.40.15");
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:11434/api/version");
  });
  it("rejects something that isn't Ollama", async () => {
    await expect(createOllamaAdapter(vi.fn().mockResolvedValue(json(200, { hello: 1 }))).probe(target)).rejects.toMatchObject({ kind: "malformed" });
  });
  it("posts the model name to /api/show", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { capabilities: ["completion"] }));
    await createOllamaAdapter(fetchMock).describeModel(target, "qwen3.5:9b");
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:11434/api/show");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ model: "qwen3.5:9b" });
  });

  const ndjson = [
    '{"model":"qwen3.5:9b","message":{"role":"assistant","content":"Hel"},"done":false}\n',
    '{"model":"qwen3.5:9b","message":{"role":"assistant","content":"lo"},"done":false}\n{"model":"qwen3.5:9b","message":{"role":"assistant","content":""},',
    '"done":true,"done_reason":"stop","eval_count":524,"eval_duration":7200000000}\n',
  ];

  it("streams NDJSON and computes tokens/second from eval_count / eval_duration", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse(ndjson));
    const pieces: string[] = [];
    const out = await createOllamaAdapter(fetchMock).chat(target, [{ role: "user", content: "hi" }], { stream: true, onToken: p => pieces.push(p) });
    expect(out.text).toBe("Hello");
    expect(pieces).toEqual(["Hel", "lo"]);
    expect(out.metrics.outputTokens).toBe(524);
    expect(out.metrics.tokensPerSecond).toBe(72.8);
    expect(out.metrics.firstTokenMs).toBeGreaterThanOrEqual(0);
  });

  it("sends format, and think:false only to models with the thinking capability", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(streamResponse(ndjson)));
    const adapter = createOllamaAdapter(fetchMock);
    await adapter.chat({ ...target, capabilities: ["completion", "thinking"] }, [], { stream: true, format: GOAL_TASKS_FORMAT });
    await adapter.chat({ ...target, capabilities: ["completion"] }, [], { stream: true });
    await adapter.chat(target, [], { stream: true });
    const bodies = fetchMock.mock.calls.map(c => JSON.parse(c[1].body));
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:11434/api/chat");
    expect(bodies[0]).toMatchObject({ model: "qwen3.5:9b", stream: true, think: false, format: GOAL_TASKS_FORMAT.schema });
    expect(bodies[1]).not.toHaveProperty("think");
    expect(bodies[2]).not.toHaveProperty("think");
    expect(bodies[2]).not.toHaveProperty("format");
  });

  it("reports an error line in the stream", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse(['{"error":"model requires more system memory (12 GiB) than is available (8 GiB)"}\n']));
    await expect(createOllamaAdapter(fetchMock).chat(target, [], { stream: true })).rejects.toThrow(/more system memory/);
  });

  it("detects a stream that ends without done", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse(['{"message":{"content":"Hi"},"done":false}\n']));
    await expect(createOllamaAdapter(fetchMock).chat(target, [], { stream: true })).rejects.toMatchObject({ kind: "malformed" });
  });

  it("maps a missing model (404) from /api/chat", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(404, { error: "model 'nope' not found" }));
    await expect(createOllamaAdapter(fetchMock).chat({ ...target, model: "nope" }, [], { stream: true })).rejects.toMatchObject({ kind: "model_not_found" });
  });
});

describe("device scan", () => {
  const ollama = SCAN_TARGETS[0];
  it("reports a found server with its models", async () => {
    const r = await scanTarget(ollama, vi.fn().mockResolvedValue(json(200, TAGS)));
    expect(r.status).toBe("found");
    expect(r.status === "found" && r.models.map(m => m.id)).toEqual(["llama3.2:3b", "qwen3.5:9b"]);
  });
  it("reports unreachable (not running or blocked) without claiming which", async () => {
    expect((await scanTarget(ollama, vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))).status).toBe("unreachable");
  });
  it("reports a CORS refusal (403) as blocked", async () => {
    expect((await scanTarget(ollama, vi.fn().mockResolvedValue(new Response("", { status: 403 })))).status).toBe("blocked");
  });
  it("only targets loopback addresses", () => {
    for (const t of SCAN_TARGETS) expect(new URL(t.baseUrl).hostname).toBe("127.0.0.1");
  });
});
