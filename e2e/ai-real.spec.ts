import { expect, test } from "@playwright/test";

/**
 * REAL integration test against a running Ollama at http://127.0.0.1:11434 — no mocks.
 * Skipped unless REAL_OLLAMA=1, so CI never needs a model:
 *   REAL_OLLAMA=1 REAL_OLLAMA_MODEL=qwen3.5:9b npx playwright test ai-real
 * Other scan ports (1234, 8080) are left alone and are expected to be closed.
 */
const MODEL = process.env.REAL_OLLAMA_MODEL ?? "";

test.skip(!process.env.REAL_OLLAMA, "set REAL_OLLAMA=1 to run against a real local Ollama");
test.setTimeout(300_000);

test("real Ollama: scan, connect, stream a reply, break a goal into tasks", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => localStorage.clear());
  await page.goto("./#/ai");
  await page.getByRole("button", { name: /I already have a local AI/ }).click();
  await page.getByRole("button", { name: "Scan this computer" }).click();
  const found = page.locator(".ai-scan__item.is-found", { hasText: "Ollama" });
  await expect(found).toBeVisible({ timeout: 15_000 });
  await found.getByRole("button", { name: "Use this" }).click();
  await page.getByLabel(/Allow AstraFocus to send requests to 127\.0\.0\.1:11434 when I ask/).check();
  await page.getByRole("button", { name: "Next" }).click();

  const models = page.getByRole("radiogroup", { name: "Installed models" });
  if (MODEL) await models.getByText(MODEL, { exact: true }).click();
  else await models.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByRole("button", { name: "Run connection test" }).click();
  const checks = page.getByRole("list", { name: "Connection checks" });
  await expect(checks).toContainText(/Ollama \d+\.\d+/, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Next" })).toBeEnabled({ timeout: 30_000 });

  await page.getByRole("button", { name: "Send a test prompt" }).click();
  await expect(checks).toContainText("tokens/s", { timeout: 180_000 });
  const reply = (await page.locator(".ai-reply__text").textContent())?.trim() ?? "";
  expect(reply.length).toBeGreaterThan(5);
  console.log("[real] diagnostics:", (await checks.innerText()).replace(/\s+/g, " "));
  console.log("[real] reply:", reply.slice(0, 200));

  await page.goto("./#/goals");
  await page.getByRole("button", { name: "Break into tasks" }).click();
  const dialog = page.getByRole("dialog", { name: "Break a goal into tasks" });
  await dialog.getByLabel("What do you want to achieve?").fill("Pass the CCNA exam in six weeks");
  const t0 = Date.now();
  await dialog.getByRole("button", { name: "Break into tasks" }).click();
  await expect(dialog.getByRole("list", { name: "Suggested tasks" })).toBeVisible({ timeout: 200_000 });
  const count = await dialog.locator(".ai-suggestion").count();
  console.log(`[real] goal breakdown: ${count} tasks in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  expect(count).toBeGreaterThan(0);
  await dialog.getByRole("button", { name: /Add selected tasks/ }).click();
  const added = await page.evaluate(() => JSON.parse(localStorage.getItem("astra.workspace.v2")!).tasks.length as number);
  expect(added).toBe(count);
});
