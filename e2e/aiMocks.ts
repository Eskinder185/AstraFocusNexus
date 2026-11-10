import type { Page, Route } from "@playwright/test";

/**
 * SIMULATED providers for Playwright. Every request to these URLs is intercepted by
 * page.route; nothing reaches a real model. Response shapes mirror a real Ollama 0.40.15.
 */

export const OLLAMA = "http://127.0.0.1:11434";
export const OPENAI = "https://api.openai.com/v1";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };

export interface OllamaModelSpec {
  name: string;
  size?: number;
  parameter_size?: string;
  capabilities?: string[];
}

export interface OllamaHits {
  version: number;
  tags: number;
  show: number;
  chat: number;
  bodies: Record<string, unknown>[];
}

export async function mockOllama(
  page: Page,
  opts: { models?: OllamaModelSpec[]; reply?: string; status?: number; hangChat?: boolean; capabilities?: string[] } = {}
): Promise<OllamaHits> {
  const hits: OllamaHits = { version: 0, tags: 0, show: 0, chat: 0, bodies: [] };
  const models = opts.models ?? [
    { name: "llama3.2:3b", size: 2019393189, parameter_size: "3.2B" },
    { name: "qwen3:8b", size: 5200000000, parameter_size: "8.2B", capabilities: ["completion", "tools", "thinking"] },
  ];
  await page.route(`${OLLAMA}/**`, async (route: Route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (opts.status) return route.fulfill({ status: opts.status, headers: CORS, body: "" });
    const path = new URL(req.url()).pathname;
    const send = (body: unknown) => route.fulfill({ status: 200, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (path === "/api/version") {
      hits.version++;
      return send({ version: "0.40.15" });
    }
    if (path === "/api/tags") {
      hits.tags++;
      return send({
        models: models.map(m => ({
          name: m.name,
          model: m.name,
          size: m.size ?? 1e9,
          details: { family: "test", parameter_size: m.parameter_size ?? "1B", quantization_level: "Q4_K_M" },
          ...(m.capabilities ? { capabilities: m.capabilities } : {}),
        })),
      });
    }
    if (path === "/api/show") {
      hits.show++;
      const name = (req.postDataJSON() as { model: string }).model;
      const m = models.find(x => x.name === name);
      if (!m) return route.fulfill({ status: 404, headers: CORS, body: JSON.stringify({ error: `model '${name}' not found` }) });
      return send({ capabilities: opts.capabilities ?? m.capabilities ?? ["completion"], details: { parameter_size: m.parameter_size ?? "1B", quantization_level: "Q4_K_M" }, model_info: { "general.architecture": "test", "test.context_length": 131072 } });
    }
    if (path === "/api/chat") {
      hits.chat++;
      hits.bodies.push(req.postDataJSON());
      if (opts.hangChat) return; // never answer: simulates a hung or very slow model
      const text = opts.reply ?? "Hello! I can help you plan your tasks.";
      // Like real Ollama: stream:false → one JSON object; stream:true → NDJSON chunks.
      if ((req.postDataJSON() as { stream?: boolean }).stream === false) {
        return send({ model: "m", message: { role: "assistant", content: text }, done: true, done_reason: "stop", eval_count: 42, eval_duration: 600_000_000 });
      }
      const parts = text.match(/.{1,12}/gs) ?? [text];
      const lines = parts.map(p => JSON.stringify({ model: "m", message: { role: "assistant", content: p }, done: false }));
      lines.push(JSON.stringify({ model: "m", message: { role: "assistant", content: "" }, done: true, done_reason: "stop", eval_count: 42, eval_duration: 600_000_000 }));
      return route.fulfill({ status: 200, headers: { ...CORS, "Content-Type": "application/x-ndjson" }, body: lines.join("\n") + "\n" });
    }
    return route.fulfill({ status: 404, headers: CORS, body: "{}" });
  });
  return hits;
}

/** Make the other scan targets behave like closed ports, so tests never touch real local services. */
export async function closePorts(page: Page, ports = [1234, 8080]) {
  for (const port of ports) await page.route(`http://127.0.0.1:${port}/**`, r => r.abort("connectionrefused"));
}

export interface OpenAIHits { models: number; chat: number; bodies: unknown[]; auth: (string | null)[] }

export async function mockOpenAI(page: Page, opts: { models?: string[]; status?: number; errorBody?: unknown; chatReply?: string } = {}): Promise<OpenAIHits> {
  const hits: OpenAIHits = { models: 0, chat: 0, bodies: [], auth: [] };
  await page.route(`${OPENAI}/**`, async route => {
    const req = route.request();
    hits.auth.push(req.headers()["authorization"] ?? null);
    const headers = { ...CORS, "Content-Type": "application/json" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (opts.status && opts.status >= 400) return route.fulfill({ status: opts.status, headers, body: JSON.stringify(opts.errorBody ?? {}) });
    if (req.url().endsWith("/models")) {
      hits.models++;
      return route.fulfill({ status: 200, headers, body: JSON.stringify({ object: "list", data: (opts.models ?? ["gpt-test"]).map(id => ({ id, object: "model" })) }) });
    }
    hits.chat++;
    hits.bodies.push(req.postDataJSON());
    return route.fulfill({ status: 200, headers, body: JSON.stringify({ choices: [{ message: { role: "assistant", content: opts.chatReply ?? "OK" } }] }) });
  });
  return hits;
}

export async function freshAIPage(page: Page) {
  await page.goto("./");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("./#/ai");
}

/** Opens the "Manual connection" disclosure on the AI page and returns the form. */
export async function openManual(page: Page) {
  const details = page.locator("details.ai-manual");
  if (!(await details.evaluate(d => (d as HTMLDetailsElement).open))) await details.locator(":scope > summary").click();
  return page.locator("#ai-connections");
}
