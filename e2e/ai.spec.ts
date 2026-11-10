import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * AI connections with MOCKED providers. Every request to the provider URLs below is
 * intercepted by page.route; nothing reaches a real model or API. These tests
 * verify AstraFocus's behaviour, not that any real provider works.
 */

const OLLAMA = "http://127.0.0.1:11434/v1";
const OPENAI = "https://api.openai.com/v1";
const SECRET = "sk-test-DO-NOT-STORE-1234567890";

interface Hits { models: number; chat: number; bodies: unknown[]; auth: (string | null)[] }

async function mockProvider(page: Page, base: string, opts: { models?: string[]; status?: number; errorBody?: unknown; chatReply?: string } = {}): Promise<Hits> {
  const hits: Hits = { models: 0, chat: 0, bodies: [], auth: [] };
  await page.route(`${base}/**`, async (route: Route) => {
    const req = route.request();
    hits.auth.push(req.headers()["authorization"] ?? null);
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Content-Type": "application/json" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (opts.status && opts.status >= 400) return route.fulfill({ status: opts.status, headers: cors, body: JSON.stringify(opts.errorBody ?? {}) });
    if (req.url().endsWith("/models")) {
      hits.models++;
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ object: "list", data: (opts.models ?? ["llama3.2:3b"]).map(id => ({ id, object: "model" })) }) });
    }
    hits.chat++;
    hits.bodies.push(req.postDataJSON());
    return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ choices: [{ message: { role: "assistant", content: opts.chatReply ?? "OK" } }] }) });
  });
  return hits;
}

async function freshSettings(page: Page) {
  await page.goto("./");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto("./#/settings");
}

const section = (page: Page) => page.locator("#ai-connections");

async function connectOllama(page: Page, model = "llama3.2:3b") {
  const s = section(page);
  await s.getByLabel("Model", { exact: true }).fill(model);
  await s.getByLabel(/Allow AstraFocus to send requests to 127\.0\.0\.1:11434/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("Connected");
}

test("nothing is sent before consent; test connection uses the model list", async ({ page }) => {
  const hits = await mockProvider(page, OLLAMA);
  await freshSettings(page);
  const s = section(page);
  await expect(s.getByText("Not connected")).toBeVisible();
  await s.getByLabel("Model", { exact: true }).fill("llama3.2:3b");
  await expect(s.getByRole("button", { name: "Test connection" })).toBeDisabled();
  await expect(s.getByRole("button", { name: "Load models" })).toBeDisabled();
  expect(hits.models + hits.chat).toBe(0);

  await s.getByLabel(/Allow AstraFocus to send requests/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("Found “llama3.2:3b”");
  await expect(s.getByText("Connected", { exact: true })).toBeVisible();
  expect(hits.models).toBe(1);
  expect(hits.chat).toBe(0); // verified without generating text
});

test("reports a model the server doesn't have", async ({ page }) => {
  await mockProvider(page, OLLAMA, { models: ["qwen2.5:7b"] });
  await freshSettings(page);
  const s = section(page);
  await s.getByLabel("Model", { exact: true }).fill("not-a-model");
  await s.getByLabel(/Allow AstraFocus/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("no model named “not-a-model”");
});

test("API key stays in memory: survives navigation, never stored or exported, gone after reload", async ({ page }) => {
  const hits = await mockProvider(page, OPENAI, { models: ["gpt-test"] });
  await freshSettings(page);
  const s = section(page);
  await s.getByLabel("Provider", { exact: true }).selectOption("openai");
  await s.getByLabel(/^API key/).fill(SECRET);
  await expect(s.getByLabel(/^API key/)).toHaveAttribute("type", "password");
  await s.getByLabel("Model", { exact: true }).fill("gpt-test");
  await s.getByLabel(/Allow AstraFocus to send requests to api\.openai\.com/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("Connected");
  expect(hits.auth.filter(Boolean)).toEqual([`Bearer ${SECRET}`]);
  expect(page.url()).not.toContain(SECRET);

  // Navigate away and back: still connected (shared in-memory provider).
  await page.goto("./#/tasks");
  await page.goto("./#/settings");
  await expect(section(page).getByText("Connected", { exact: true })).toBeVisible();
  await expect(section(page).getByLabel(/^API key/)).toHaveValue(SECRET);

  // Not in any browser storage.
  const stored = await page.evaluate(async () => {
    const all: string[] = [];
    for (const st of [localStorage, sessionStorage]) for (let i = 0; i < st.length; i++) all.push(st.key(i)!, st.getItem(st.key(i)!) ?? "");
    const dbs = (await indexedDB.databases?.()) ?? [];
    return { all: all.join("\n"), dbs: dbs.map(d => d.name) };
  });
  expect(stored.all).not.toContain(SECRET);
  expect(stored.all).not.toContain("api.openai.com");
  expect(stored.dbs).toEqual([]);

  // Not in the workspace export.
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export", exact: true }).click()]);
  const exported = await (await download.createReadStream()).toArray().then(chunks => Buffer.concat(chunks).toString("utf8"));
  expect(exported.length).toBeGreaterThan(50);
  expect(exported).not.toContain(SECRET);
  expect(exported).not.toContain("api.openai.com");

  // Reload clears it.
  await page.reload();
  await expect(section(page).getByText("Not connected")).toBeVisible();
  await expect(section(page).getByLabel("Provider", { exact: true })).toHaveValue("ollama");
  await expect(section(page).getByLabel(/^API key/)).toHaveValue("");
});

test("changing the destination clears key, consent and status", async ({ page }) => {
  await mockProvider(page, OPENAI, { models: ["gpt-test"] });
  await freshSettings(page);
  const s = section(page);
  await s.getByLabel("Provider", { exact: true }).selectOption("openai");
  await s.getByLabel(/^API key/).fill(SECRET);
  await s.getByLabel("Model", { exact: true }).fill("gpt-test");
  await s.getByLabel(/Allow AstraFocus/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("Connected");

  const url = s.getByLabel("API base URL");
  await url.fill("https://other.example.com/v1");
  await url.press("Enter");
  await expect(s.getByLabel(/^API key/)).toHaveValue("");
  await expect(s.getByLabel(/Allow AstraFocus to send requests to other\.example\.com/)).not.toBeChecked();
  await expect(s.getByText("Not connected")).toBeVisible();
  await expect(s.getByRole("button", { name: "Test connection" })).toBeDisabled();
});

test("rejects unsafe endpoints", async ({ page }) => {
  await freshSettings(page);
  const s = section(page);
  await s.getByLabel("Provider", { exact: true }).selectOption("custom");
  const url = s.getByLabel("API base URL");
  for (const [value, msg] of [
    ["http://api.example.com/v1", /must use HTTPS/],
    ["https://user:pw@api.example.com/v1", /username or password/],
    ["ftp://example.com", /Only http/],
  ] as const) {
    await url.fill(value);
    await url.press("Enter");
    await expect(s.getByText(msg)).toBeVisible();
    await expect(s.getByLabel(/Allow AstraFocus/)).toHaveCount(0);
  }
});

test("shows a clear auth error", async ({ page }) => {
  await mockProvider(page, OPENAI, { status: 401, errorBody: { error: { message: `Incorrect API key provided: ${SECRET}`, code: "invalid_api_key" } } });
  await freshSettings(page);
  const s = section(page);
  await s.getByLabel("Provider", { exact: true }).selectOption("openai");
  await s.getByLabel(/^API key/).fill(SECRET);
  await s.getByLabel("Model", { exact: true }).fill("gpt-test");
  await s.getByLabel(/Allow AstraFocus/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("rejected the API key");
  await expect(s.getByRole("status")).not.toContainText(SECRET);
});

test("goal planner: preview, safe rendering, review, explicit add, no duplicates", async ({ page }) => {
  const reply = JSON.stringify({
    tasks: [
      { title: "<img src=x onerror=\"window.__xss=1\">Outline chapters", description: "<b>bold?</b> Plan the structure", minutes: 30, order: 1 },
      { title: "Draft chapter one", description: "Write the first draft", minutes: 90, order: 2 },
      { title: "Remove me", description: "", minutes: 15, order: 3 },
    ],
  });
  const hits = await mockProvider(page, OLLAMA, { chatReply: reply });
  await freshSettings(page);
  await connectOllama(page);

  await page.goto("./#/goals");
  await page.getByRole("button", { name: "Break into tasks" }).click();
  const dialog = page.getByRole("dialog", { name: "Break a goal into tasks" });
  await dialog.getByLabel("What do you want to achieve?").fill("Write my thesis");
  await expect(dialog.getByRole("region", { name: "What will be sent" })).toContainText("Goal: Write my thesis");
  expect(hits.chat).toBe(0);

  await dialog.getByRole("button", { name: "Break into tasks" }).click();
  await expect(dialog.getByRole("list", { name: "Suggested tasks" })).toBeVisible();
  expect(hits.chat).toBe(1);
  const sent = hits.bodies[0] as { messages: { role: string; content: string }[]; model: string };
  expect(sent.model).toBe("llama3.2:3b");
  expect(sent.messages.at(-1)!.content).toBe("Goal: Write my thesis");
  expect(JSON.stringify(sent)).not.toMatch(/task-tracker|astra\.workspace/);

  // Model output is shown as plain text, never as HTML.
  await expect(dialog.getByLabel("Task 1 title")).toHaveValue('<img src=x onerror="window.__xss=1">Outline chapters');
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  expect(await dialog.locator("img, b").count()).toBe(0);

  // Nothing created yet.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("astra.workspace.v2") ?? "{}").tasks?.length ?? 0)).toBe(0);

  // Edit, remove, deselect.
  await dialog.getByLabel("Task 1 title").fill("Outline chapters");
  await dialog.getByLabel("Task 2 duration in minutes").fill("60");
  await dialog.getByRole("button", { name: "Remove task 3" }).click();
  await expect(dialog.getByRole("button", { name: "Add selected tasks (2)" })).toBeEnabled();

  // Double click must add each task exactly once.
  await dialog.getByRole("button", { name: "Add selected tasks (2)" }).dblclick();
  await expect(page.getByText("Added 2 tasks.")).toBeVisible();
  await expect(dialog).toHaveCount(0);
  const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem("astra.workspace.v2")!).tasks as { title: string; estimateMin: number; notes: string }[]);
  expect(tasks.map(t => t.title).sort()).toEqual(["Draft chapter one", "Outline chapters"]);
  expect(tasks.find(t => t.title === "Draft chapter one")!.estimateMin).toBe(60);
  expect(hits.chat).toBe(1);
});

test("goal planner without a connection explains how to connect", async ({ page }) => {
  await freshSettings(page);
  await page.goto("./#/goals");
  await page.getByRole("button", { name: "Break into tasks" }).click();
  const dialog = page.getByRole("dialog", { name: "Break a goal into tasks" });
  await expect(dialog.getByText("No AI model is connected")).toBeVisible();
  await dialog.getByLabel("What do you want to achieve?").fill("Learn guitar");
  await expect(dialog.getByRole("button", { name: "Break into tasks" })).toBeDisabled();
  await dialog.getByRole("link", { name: /Settings → AI connections/ }).click();
  await expect(page).toHaveURL(/#\/settings\?section=ai/);
});

test("handles an unreadable model reply without crashing", async ({ page }) => {
  await mockProvider(page, OLLAMA, { chatReply: "Sorry, I can only chat." });
  await freshSettings(page);
  await connectOllama(page);
  await page.goto("./#/goals");
  await page.getByRole("button", { name: "Break into tasks" }).click();
  const dialog = page.getByRole("dialog", { name: "Break a goal into tasks" });
  await dialog.getByLabel("What do you want to achieve?").fill("Run a 5k");
  await dialog.getByRole("button", { name: "Break into tasks" }).click();
  await expect(dialog.getByRole("alert")).toContainText("didn’t return the task list");
});

for (const width of [375, 430]) {
  test(`AI screens fit at ${width}px`, async ({ page }) => {
    await mockProvider(page, OLLAMA, { chatReply: JSON.stringify({ tasks: [{ title: "A".repeat(110), description: "word ".repeat(70), minutes: 30, order: 1 }] }) });
    await page.setViewportSize({ width, height: 800 });
    await freshSettings(page);
    const s = section(page);
    await s.getByLabel("Provider", { exact: true }).selectOption("custom");
    await s.getByLabel("API base URL").fill(`https://a-very-long-subdomain-name-for-testing.example-provider.com/openai/compat/v1/deployments/xyz`);
    await s.getByLabel("API base URL").press("Enter");
    await s.getByLabel("Model", { exact: true }).fill("organization/some-extremely-long-model-identifier-name-v2-instruct-q4_K_M");
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);

    await s.getByLabel("Provider", { exact: true }).selectOption("ollama");
    await connectOllama(page);
    await page.goto("./#/goals");
    await page.getByRole("button", { name: "Break into tasks" }).click();
    const dialog = page.getByRole("dialog", { name: "Break a goal into tasks" });
    await dialog.getByLabel("What do you want to achieve?").fill("x".repeat(300));
    expect(await overflow()).toBeLessThanOrEqual(0);
    await dialog.getByRole("button", { name: "Break into tasks" }).click();
    await expect(dialog.getByLabel("Task 1 title")).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  });
}
