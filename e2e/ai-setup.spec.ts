import { expect, test, type Page } from "@playwright/test";
import { closePorts, freshAIPage, mockOllama, OLLAMA } from "./aiMocks";

/** Setup wizard and AI dashboard with SIMULATED local servers (page.route). */

const next = (page: Page) => page.getByRole("button", { name: "Next" });
const heading = (page: Page) => page.locator(".ai-wizard__title");

async function startExisting(page: Page) {
  await freshAIPage(page);
  await page.getByRole("button", { name: /I already have a local AI/ }).click();
  await expect(heading(page)).toHaveText("Find your local AI");
}

async function scanAndUseOllama(page: Page) {
  await page.getByRole("button", { name: "Scan this computer" }).click();
  const results = page.getByRole("list", { name: "Scan results" });
  await expect(results.locator(".ai-scan__item.is-found")).toContainText("Ollama");
  await results.locator(".ai-scan__item.is-found").getByRole("button", { name: "Use this" }).click();
  await page.getByLabel(/Allow AstraFocus to send requests to 127\.0\.0\.1:11434 when I ask/).check();
}

test("existing local AI: scan, pick, test, stream a reply, finish", async ({ page }) => {
  const hits = await mockOllama(page);
  await closePorts(page);
  await startExisting(page);
  expect(hits.version + hits.tags + hits.chat).toBe(0); // nothing before the user scans

  await expect(next(page)).toBeDisabled();
  await scanAndUseOllama(page);
  const results = page.getByRole("list", { name: "Scan results" });
  await expect(results).toContainText("Found · 2 models");
  await expect(results).toContainText("Not reachable from this page"); // closed LM Studio / 8080 ports
  await next(page).click();

  await expect(heading(page)).toHaveText("Pick a model");
  const models = page.getByRole("radiogroup", { name: "Installed models" });
  await expect(models).toContainText("qwen3:8b");
  await expect(models).toContainText("8.2B parameters");
  await expect(next(page)).toBeDisabled();
  await models.getByText("qwen3:8b", { exact: false }).first().click();
  await next(page).click();

  await expect(heading(page)).toHaveText("Test the connection");
  await expect(next(page)).toBeDisabled();
  await page.getByRole("button", { name: "Run connection test" }).click();
  const checks = page.getByRole("list", { name: "Connection checks" });
  await expect(checks).toContainText("Ollama 0.40.15 answered");
  await expect(checks).toContainText("“qwen3:8b” is installed");
  await expect(checks).toContainText("Capabilities read from the server");
  expect(hits.chat).toBe(0); // the connection test doesn't generate

  await page.getByRole("button", { name: "Send a test prompt" }).click();
  await expect(page.locator(".ai-reply__text")).toHaveText("Hello! I can help you plan your tasks.");
  await expect(checks).toContainText("70 tokens/s"); // 42 tokens / 0.6 s from the mocked final chunk
  expect(hits.chat).toBe(1);
  expect(hits.bodies[0]).toMatchObject({ model: "qwen3:8b", stream: true, think: false });

  await next(page).click();
  await expect(heading(page)).toHaveText("You’re all set");
  await expect(page.getByText("The test prompt worked.")).toBeVisible();
  await page.getByRole("button", { name: "Go to AI dashboard" }).click();
  await expect(page.locator(".ai-dash__status").getByText("Connected", { exact: true })).toBeVisible();
  await expect(page.locator(".ai-dash__model")).toContainText("Reasoning");
});

test("no local server: scan explains what to check", async ({ page }) => {
  await closePorts(page, [11434, 1234, 8080]);
  await startExisting(page);
  await page.getByRole("button", { name: "Scan this computer" }).click();
  await expect(page.getByText("Nothing answered.")).toBeVisible();
  await expect(page.getByText(/can’t tell whether the app isn’t running or is blocking/)).toBeVisible();
  await expect(next(page)).toBeDisabled();
});

test("CORS refusal is reported as blocked, with instructions", async ({ page }) => {
  await mockOllama(page, { status: 403 });
  await closePorts(page);
  await startExisting(page);
  await page.getByRole("button", { name: "Scan this computer" }).click();
  await expect(page.getByRole("list", { name: "Scan results" })).toContainText("Running, but blocked this website");
});

test("missing model: test fails with the pull command", async ({ page }) => {
  await mockOllama(page);
  await closePorts(page);
  await startExisting(page);
  await scanAndUseOllama(page);
  await next(page).click();
  await page.getByLabel("Or type a model name").fill("gemma3:4b");
  await next(page).click();
  await page.getByRole("button", { name: "Run connection test" }).click();
  const checks = page.getByRole("list", { name: "Connection checks" });
  await expect(checks).toContainText("no model named “gemma3:4b”");
  await expect(checks).toContainText("ollama pull gemma3:4b");
  await expect(next(page)).toBeDisabled();
});

async function reachTest(page: Page) {
  await startExisting(page);
  await scanAndUseOllama(page);
  await next(page).click();
  await page.getByRole("radiogroup", { name: "Installed models" }).getByText("llama3.2:3b").click();
  await next(page).click();
  await page.getByRole("button", { name: "Run connection test" }).click();
  await expect(page.getByRole("list", { name: "Connection checks" })).toContainText("is installed");
}

test("cancelling a streaming test prompt", async ({ page }) => {
  await mockOllama(page, { hangChat: true });
  await closePorts(page);
  await reachTest(page);
  await page.getByRole("button", { name: "Send a test prompt" }).click();
  await expect(page.getByRole("list", { name: "Connection checks" })).toContainText("Waiting for the first words");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("list", { name: "Connection checks" })).toContainText("Cancelled.");
  await expect(page.getByRole("button", { name: "Send a test prompt" })).toBeEnabled();
});

test("inference timeout", async ({ page }) => {
  await page.clock.install();
  await mockOllama(page, { hangChat: true });
  await closePorts(page);
  await reachTest(page);
  await page.getByRole("button", { name: "Send a test prompt" }).click();
  await expect(page.getByRole("list", { name: "Connection checks" })).toContainText("Waiting for the first words");
  await page.clock.runFor(121_000);
  await expect(page.getByRole("list", { name: "Connection checks" })).toContainText("No response after 120 seconds");
});

test("install path: hardware, recommendations, OS instructions, copy, pull command", async ({ page, context, browserName }) => {
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await freshAIPage(page);
  await page.getByRole("button", { name: /Help me install my first AI/ }).click();
  await expect(heading(page)).toHaveText("About your computer");

  // Values the browser exposes are labelled Detected; others are Unknown until entered.
  const ram = page.getByLabel(/Memory \(RAM\), GB/);
  await ram.fill("32");
  await expect(page.locator(".field", { has: ram }).getByText("You entered")).toBeVisible();
  const vramLabel = page.locator(".field", { has: page.getByLabel(/Graphics memory \(VRAM\), GB/) });
  await expect(vramLabel.getByText("Unknown")).toBeVisible();
  await page.getByLabel(/Graphics \(GPU\)/).selectOption("nvidia");
  await page.getByLabel(/Graphics memory \(VRAM\), GB/).fill("8");
  await page.getByLabel(/Operating system/).selectOption("linux");
  await next(page).click();

  await expect(heading(page)).toHaveText("Choose a model");
  const tiers = page.getByRole("radiogroup", { name: "Recommended models" });
  await expect(tiers.locator(".ai-tier")).toHaveCount(3);
  await expect(tiers).toContainText("Lightweight");
  await expect(tiers).toContainText("Higher quality");
  await expect(page.getByText(/estimates, not benchmarks/)).toBeVisible();
  await expect(tiers.locator(".ai-tier.is-selected")).toContainText("qwen3:4b"); // balanced is preselected
  await tiers.getByText("qwen3:8b").click();
  await next(page).click();

  await expect(heading(page)).toHaveText("Install Ollama");
  await expect(page.getByRole("radio", { name: "Linux" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("curl -fsSL https://ollama.com/install.sh | sh")).toBeVisible();
  await page.getByRole("radio", { name: "Windows" }).click();
  await expect(page.getByRole("link", { name: "Download OllamaSetup.exe" })).toHaveAttribute("href", "https://ollama.com/download/OllamaSetup.exe");
  await page.getByRole("radio", { name: "macOS" }).click();
  await expect(page.getByRole("link", { name: "Download Ollama.dmg" })).toHaveAttribute("href", "https://ollama.com/download/Ollama.dmg");
  await next(page).click();

  await expect(heading(page)).toHaveText("Download your model");
  await expect(page.locator(".ai-cmd__text").first()).toHaveText("ollama pull qwen3:8b");
  const copy = page.getByRole("button", { name: "Copy: ollama pull qwen3:8b" });
  await copy.click();
  await expect(copy).toHaveText(/Copied/);
  if (browserName === "chromium") expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ollama pull qwen3:8b");
  await next(page).click();

  // The test server runs on 127.0.0.1, which Ollama already allows.
  await expect(heading(page)).toHaveText("Let AstraFocus connect");
  await expect(page.getByText(/nothing to change/)).toBeVisible();
  await next(page).click();
  await expect(heading(page)).toHaveText("Find your local AI");
});

test("wizard is keyboard accessible and moves focus to each step", async ({ page }) => {
  await mockOllama(page);
  await closePorts(page);
  await freshAIPage(page);
  await page.getByRole("button", { name: /I already have a local AI/ }).focus();
  await page.keyboard.press("Enter");
  await expect(heading(page)).toHaveText("Find your local AI");
  await page.getByRole("button", { name: "Scan this computer" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Use this" }).focus();
  await page.keyboard.press("Enter");
  await page.getByLabel(/Allow AstraFocus to send requests to 127\.0\.0\.1:11434 when I ask/).focus();
  await page.keyboard.press("Space");
  await next(page).focus();
  await page.keyboard.press("Enter");
  await expect(heading(page)).toHaveText("Pick a model");
  await expect(heading(page)).toBeFocused();
  // Radio cards can be chosen with the keyboard.
  await page.getByRole("radiogroup", { name: "Installed models" }).getByRole("radio").first().focus();
  await page.keyboard.press("Space");
  await expect(next(page)).toBeEnabled();
});

test("local setup is remembered without the key or any automatic request", async ({ page }) => {
  const hits = await mockOllama(page);
  await closePorts(page);
  await reachTest(page);
  const before = hits.version + hits.tags + hits.show + hits.chat;
  await page.reload();
  await expect(page.locator(".ai-dash__status")).toContainText("Saved, not checked yet");
  await expect(page.locator(".ai-dash__status")).toContainText("llama3.2:3b");
  await page.waitForTimeout(300);
  expect(hits.version + hits.tags + hits.show + hits.chat).toBe(before); // no request on load
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("astra.ai.config.v1")!));
  expect(saved).toEqual({ v: 1, provider: "ollama", baseUrl: OLLAMA, model: "llama3.2:3b", consentFor: OLLAMA });

  await page.getByRole("button", { name: "Run connection test" }).click();
  await expect(page.locator(".ai-dash__status").getByText("Connected", { exact: true })).toBeVisible();

  page.once("dialog", d => d.accept());
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("button", { name: /I already have a local AI/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("astra.ai.config.v1"))).toBeNull();
});

test("Settings links to the AI page", async ({ page }) => {
  await freshAIPage(page);
  await page.goto("./#/settings");
  await page.getByRole("link", { name: "Set up AI" }).click();
  await expect(page).toHaveURL(/#\/ai$/);
});

for (const width of [375, 430]) {
  test(`wizard and dashboard fit at ${width}px`, async ({ page }) => {
    await mockOllama(page, { models: [{ name: "organization/some-extremely-long-model-identifier-name-v2-instruct:q4_K_M", parameter_size: "8B" }] });
    await closePorts(page);
    await page.setViewportSize({ width, height: 800 });
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await freshAIPage(page);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: /Help me install my first AI/ }).click();
    for (let i = 0; i < 5; i++) {
      expect(await overflow(), `step ${i + 1}`).toBeLessThanOrEqual(0);
      await next(page).click();
    }
    await scanAndUseOllama(page);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await next(page).click();
    await page.getByRole("radiogroup", { name: "Installed models" }).getByRole("radio").first().check();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await next(page).click();
    await page.getByRole("button", { name: "Run connection test" }).click();
    await expect(page.getByRole("list", { name: "Connection checks" })).toContainText("is installed");
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Exit setup" }).click();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
}
