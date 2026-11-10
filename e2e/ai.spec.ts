import { expect, test, type Page } from "@playwright/test";
import { freshAIPage, mockOllama, mockOpenAI, openManual } from "./aiMocks";

/**
 * Manual connection, privacy and the goal planner — all with SIMULATED providers
 * (page.route). These tests verify AstraFocus's behaviour, not that any real provider works.
 */

const SECRET = "sk-test-DO-NOT-STORE-1234567890";

async function connectOllama(page: Page, model = "llama3.2:3b") {
  const s = await openManual(page);
  await s.getByLabel("Model", { exact: true }).fill(model);
  await s.getByLabel(/Allow AstraFocus to send requests to 127\.0\.0\.1:11434/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("Connected");
  return s;
}

test("nothing is sent before consent; the connection check doesn't generate text", async ({ page }) => {
  const hits = await mockOllama(page);
  await freshAIPage(page);
  const s = await openManual(page);
  await s.getByLabel("Model", { exact: true }).fill("llama3.2:3b");
  await expect(s.getByRole("button", { name: "Test connection" })).toBeDisabled();
  await expect(s.getByRole("button", { name: "Load models" })).toBeDisabled();
  expect(hits.version + hits.tags + hits.show + hits.chat).toBe(0);

  await s.getByLabel(/Allow AstraFocus to send requests/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("“llama3.2:3b” on 127.0.0.1:11434 is ready");
  expect([hits.version, hits.tags, hits.show, hits.chat]).toEqual([1, 1, 1, 0]);
});

test("reports a model the server doesn't have, with the pull command", async ({ page }) => {
  await mockOllama(page, { models: [{ name: "qwen3:8b" }] });
  await freshAIPage(page);
  const s = await openManual(page);
  await s.getByLabel("Model", { exact: true }).fill("not-a-model");
  await s.getByLabel(/Allow AstraFocus/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("no model named “not-a-model”");
});

test("missing local server shows a meaningful error", async ({ page }) => {
  await page.route("http://127.0.0.1:11434/**", r => r.abort("connectionrefused"));
  await freshAIPage(page);
  const s = await openManual(page);
  await s.getByLabel("Model", { exact: true }).fill("llama3.2:3b");
  await s.getByLabel(/Allow AstraFocus/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("Couldn’t reach the server");
  await expect(s.getByRole("status")).toContainText("CORS");
});

test("API key stays in memory: survives navigation, never stored or exported, gone after reload", async ({ page }) => {
  const hits = await mockOpenAI(page, { models: ["gpt-test"] });
  await freshAIPage(page);
  const s = await openManual(page);
  await s.getByLabel("Provider", { exact: true }).selectOption("openai");
  await s.getByLabel(/^API key/).fill(SECRET);
  await expect(s.getByLabel(/^API key/)).toHaveAttribute("type", "password");
  await s.getByLabel("Model", { exact: true }).fill("gpt-test");
  await s.getByLabel(/Allow AstraFocus to send requests to api\.openai\.com/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("Connected");
  expect(hits.auth.filter(Boolean).every(a => a === `Bearer ${SECRET}`)).toBe(true);
  expect(page.url()).not.toContain(SECRET);

  // Navigate away and back: still connected (shared in-memory provider).
  await page.goto("./#/tasks");
  await page.goto("./#/ai");
  await expect(page.locator(".ai-dash__status").getByText("Connected", { exact: true })).toBeVisible();
  await expect((await openManual(page)).getByLabel(/^API key/)).toHaveValue(SECRET);

  // Not in any browser storage, and remote settings aren't remembered at all.
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
  await page.goto("./#/settings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export", exact: true }).click()]);
  const exported = await (await download.createReadStream()).toArray().then(chunks => Buffer.concat(chunks).toString("utf8"));
  expect(exported.length).toBeGreaterThan(50);
  expect(exported).not.toContain(SECRET);
  expect(exported).not.toContain("api.openai.com");

  // Reload clears it.
  await page.goto("./#/ai");
  await page.reload();
  await expect(page.getByRole("button", { name: /I already have a local AI/ })).toBeVisible();
  const after = await openManual(page);
  await expect(after.getByLabel("Provider", { exact: true })).toHaveValue("ollama");
  await expect(after.getByLabel(/^API key/)).toHaveValue("");
});

test("changing the destination clears key, consent and status", async ({ page }) => {
  await mockOpenAI(page, { models: ["gpt-test"] });
  await freshAIPage(page);
  const s = await openManual(page);
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
  await freshAIPage(page);
  const s = await openManual(page);
  await s.getByLabel("Provider", { exact: true }).selectOption("custom");
  const url = s.getByLabel("API base URL");
  for (const [value, msg] of [
    ["http://api.example.com/v1", /must use HTTPS/],
    ["http://192.168.1.20:11434", /must use HTTPS/],
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
  await mockOpenAI(page, { status: 401, errorBody: { error: { message: `Incorrect API key provided: ${SECRET}`, code: "invalid_api_key" } } });
  await freshAIPage(page);
  const s = await openManual(page);
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
      { title: '<img src=x onerror="window.__xss=1">Outline chapters', description: "<b>bold?</b> Plan the structure", minutes: 30, order: 1 },
      { title: "Draft chapter one", description: "Write the first draft", minutes: 90, order: 2 },
      { title: "Remove me", description: "", minutes: 15, order: 3 },
    ],
  });
  const hits = await mockOllama(page, { reply });
  await freshAIPage(page);
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
  const sent = hits.bodies[0] as { messages: { role: string; content: string }[]; model: string; format?: unknown; think?: boolean };
  expect(sent.model).toBe("llama3.2:3b");
  expect(sent.messages.at(-1)!.content).toBe("Goal: Write my thesis");
  expect(sent.format).toBeTruthy();
  expect(sent).not.toHaveProperty("think"); // llama3.2 has no thinking capability
  expect(JSON.stringify(sent)).not.toMatch(/task-tracker|astra\.workspace/);

  // Model output is shown as plain text, never as HTML.
  await expect(dialog.getByLabel("Task 1 title")).toHaveValue('<img src=x onerror="window.__xss=1">Outline chapters');
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  expect(await dialog.locator("img, b").count()).toBe(0);

  // Nothing created yet.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("astra.workspace.v2") ?? "{}").tasks?.length ?? 0)).toBe(0);

  await dialog.getByLabel("Task 1 title").fill("Outline chapters");
  await dialog.getByLabel("Task 2 duration in minutes").fill("60");
  await dialog.getByRole("button", { name: "Remove task 3" }).click();
  await dialog.getByRole("button", { name: "Add selected tasks (2)" }).dblclick();
  await expect(page.getByText("Added 2 tasks.")).toBeVisible();
  await expect(dialog).toHaveCount(0);
  const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem("astra.workspace.v2")!).tasks as { title: string; estimateMin: number }[]);
  expect(tasks.map(t => t.title).sort()).toEqual(["Draft chapter one", "Outline chapters"]);
  expect(tasks.find(t => t.title === "Draft chapter one")!.estimateMin).toBe(60);
  expect(hits.chat).toBe(1);
});

test("planner turns off thinking for models that support it", async ({ page }) => {
  const hits = await mockOllama(page, { reply: '{"tasks":[{"title":"A","description":"","minutes":10,"order":1}]}' });
  await freshAIPage(page);
  await connectOllama(page, "qwen3:8b");
  await page.goto("./#/goals");
  await page.getByRole("button", { name: "Break into tasks" }).click();
  const dialog = page.getByRole("dialog", { name: "Break a goal into tasks" });
  await dialog.getByLabel("What do you want to achieve?").fill("Learn Rust");
  await dialog.getByRole("button", { name: "Break into tasks" }).click();
  await expect(dialog.getByLabel("Task 1 title")).toHaveValue("A");
  expect(hits.bodies[0]).toMatchObject({ think: false });
});

test("goal planner without a connection explains how to connect", async ({ page }) => {
  await freshAIPage(page);
  await page.goto("./#/goals");
  await page.getByRole("button", { name: "Break into tasks" }).click();
  const dialog = page.getByRole("dialog", { name: "Break a goal into tasks" });
  await expect(dialog.getByText("No AI model is connected")).toBeVisible();
  await dialog.getByLabel("What do you want to achieve?").fill("Learn guitar");
  await expect(dialog.getByRole("button", { name: "Break into tasks" })).toBeDisabled();
  await dialog.getByRole("link", { name: /AI assistant page/ }).click();
  await expect(page).toHaveURL(/#\/ai$/);
});

test("handles an unreadable model reply without crashing", async ({ page }) => {
  await mockOllama(page, { reply: "Sorry, I can only chat." });
  await freshAIPage(page);
  await connectOllama(page);
  await page.goto("./#/goals");
  await page.getByRole("button", { name: "Break into tasks" }).click();
  const dialog = page.getByRole("dialog", { name: "Break a goal into tasks" });
  await dialog.getByLabel("What do you want to achieve?").fill("Run a 5k");
  await dialog.getByRole("button", { name: "Break into tasks" }).click();
  await expect(dialog.getByRole("alert")).toContainText("didn’t return the task list");
});

for (const width of [375, 430]) {
  test(`manual form and planner fit at ${width}px`, async ({ page }) => {
    await mockOllama(page, { reply: JSON.stringify({ tasks: [{ title: "A".repeat(110), description: "word ".repeat(70), minutes: 30, order: 1 }] }) });
    await page.setViewportSize({ width, height: 800 });
    await freshAIPage(page);
    const s = await openManual(page);
    await s.getByLabel("Provider", { exact: true }).selectOption("custom");
    await s.getByLabel("API base URL").fill("https://a-very-long-subdomain-name-for-testing.example-provider.com/openai/compat/v1/deployments/xyz");
    await s.getByLabel("API base URL").press("Enter");
    await s.getByLabel("Model", { exact: true }).fill("organization/some-extremely-long-model-identifier-name-v2-instruct-q4_K_M");
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);

    await s.getByLabel("Provider", { exact: true }).selectOption("ollama");
    await connectOllama(page);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.goto("./#/goals");
    await page.getByRole("button", { name: "Break into tasks" }).click();
    const dialog = page.getByRole("dialog", { name: "Break a goal into tasks" });
    await dialog.getByLabel("What do you want to achieve?").fill("x".repeat(300));
    await dialog.getByRole("button", { name: "Break into tasks" }).click();
    await expect(dialog.getByLabel("Task 1 title")).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    const box = await dialog.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  });
}
