import { expect, test, type Page } from "@playwright/test";

const LEGACY_TASKS = [
  { id: 1700000000001, text: "Legacy report", completed: false, createdAt: 1700000000001, dueAt: "2030-01-15T18:00", remind: true, notified: false, pomos: 3, priority: "UI", goalId: 42 },
  { id: 1700000000002, text: "Legacy done item", completed: true, createdAt: 1700000000002, priority: "NN", goalId: null },
];
const LEGACY_GOALS = [{ id: 42, title: "Graduate", emoji: "🎓" }];

/** Start each test from a clean origin. */
async function fresh(page: Page, seed?: Record<string, string>) {
  await page.goto("./");
  await page.evaluate(s => {
    localStorage.clear();
    sessionStorage.clear();
    for (const [k, v] of Object.entries(s ?? {})) localStorage.setItem(k, v);
  }, seed);
  await page.reload();
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => m.type() === "error" && errors.push(m.text()));
  return errors;
}

test("migrates v0.2 localStorage data without modifying it", async ({ page }) => {
  const tasksRaw = JSON.stringify(LEGACY_TASKS);
  const goalsRaw = JSON.stringify(LEGACY_GOALS);
  await fresh(page, { "task-tracker.tasks.v4": tasksRaw, "task-tracker.goals.v1": goalsRaw, "task-tracker.goalPref": "42" });

  await expect(page.getByText(/Imported 2 tasks and 1 goal/)).toBeVisible();

  await page.goto("./#/tasks");
  await page.getByRole("tab", { name: /All/ }).click();
  await expect(page.getByText("Legacy report")).toBeVisible();
  await expect(page.getByText("Legacy done item")).toBeVisible();
  const row = page.locator(".task-row", { hasText: "Legacy report" });
  await expect(row.getByText("Do first")).toBeVisible();
  await expect(row.getByText("Graduate")).toBeVisible();
  await expect(row.getByTitle("3 completed focus sessions")).toBeVisible(); // pomodoro count carried over

  const stored = await page.evaluate(() => ({
    tasks: localStorage.getItem("task-tracker.tasks.v4"),
    goals: localStorage.getItem("task-tracker.goals.v1"),
    backup: localStorage.getItem("astra.backup.legacy-v0"),
  }));
  expect(stored.tasks).toBe(tasksRaw);
  expect(stored.goals).toBe(goalsRaw);
  expect(stored.backup).toContain("Legacy report");

  // Second load must not import again.
  await page.reload();
  await expect(page.getByText(/Imported/)).toHaveCount(0);
  await page.goto("./#/goals");
  await expect(page.getByRole("heading", { name: "Graduate" })).toBeVisible();
  await expect(page.getByText("0 of 1 linked task done")).toBeVisible();
});

test("capture with natural language, edit, complete, persist, and undo delete", async ({ page }) => {
  const errors = collectErrors(page);
  await fresh(page);
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)|Working late/ })).toBeVisible();

  await page.keyboard.press("c");
  const title = page.getByRole("textbox", { name: "Task name" });
  await expect(title).toBeFocused();
  await title.fill("Write essay tomorrow 6pm !1");
  await expect(page.locator(".qa-chips").getByText(/Tomorrow · 6:00\s?PM/)).toBeVisible();
  await expect(page.locator(".qa-chips").getByText("Do first")).toBeVisible();
  await title.press("Enter");

  await page.goto("./#/tasks");
  const row = page.locator(".task-row", { hasText: "Write essay" });
  await expect(row).toBeVisible();
  await expect(row.getByText("Do first")).toBeVisible();
  await expect(row.getByText(/Tomorrow · 6:00/)).toBeVisible();
  await expect(row.getByText("tomorrow 6pm")).toHaveCount(0);

  // Edit notes in the detail panel.
  await row.locator(".task-row__main").click();
  const panel = page.getByRole("dialog", { name: "Task details" });
  await panel.getByLabel("Notes").fill("Outline first");
  await panel.getByRole("button", { name: "Close" }).click();
  await expect(panel).toHaveCount(0);

  // Complete it; it should persist across reload.
  await row.getByRole("checkbox").check();
  await expect(page.getByText(/Completed “Write essay”/)).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: /Completed/ }).click();
  const doneRow = page.locator(".task-row", { hasText: "Write essay" });
  await expect(doneRow.getByRole("checkbox")).toBeChecked();

  // Delete and undo.
  await doneRow.locator(".task-row__main").click();
  await expect(page.getByRole("dialog", { name: "Task details" }).getByLabel("Notes")).toHaveValue("Outline first");
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator(".task-row", { hasText: "Write essay" })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".task-row", { hasText: "Write essay" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("focus timer keeps running across navigation and reload", async ({ page }) => {
  await fresh(page);
  await page.goto("./#/tasks");
  await page.getByRole("textbox", { name: "Add a task" }).fill("Deep work block");
  await page.keyboard.press("Enter");
  await page.locator(".task-row", { hasText: "Deep work block" }).hover();
  await page.getByRole("button", { name: "Focus on “Deep work block”" }).click();

  await expect(page).toHaveURL(/#\/focus$/);
  await expect(page.locator(".focus-stage__task-title")).toHaveText("Deep work block");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

  const timer = page.locator(".focus-orbit__time");
  const t1 = await timer.textContent();
  await page.waitForTimeout(1500);
  expect(await timer.textContent()).not.toBe(t1);

  await page.goto("./#/");
  const pill = page.locator(".timer-pill");
  await expect(pill).toBeVisible();

  await page.reload();
  await expect(page.locator(".timer-pill")).toBeVisible();
  await page.getByRole("button", { name: "Pause timer" }).click();
  await expect(page.getByRole("button", { name: "Resume timer" })).toBeVisible();
});

test("command palette navigates and creates tasks", async ({ page }) => {
  await fresh(page);
  await page.keyboard.press("Control+k");
  const input = page.getByRole("combobox", { name: "Command" });
  await expect(input).toBeFocused();
  await input.fill("matrix");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  // First result is "Create task", the matrix page follows.
  await page.getByRole("option", { name: /Priority Matrix/ }).click();
  await expect(page).toHaveURL(/#\/matrix$/);

  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Command" }).fill("Call the bank !2");
  await page.keyboard.press("Enter");
  const quadrant = page.getByRole("region", { name: /^Schedule/ });
  await expect(quadrant.locator(".task-row__title", { hasText: "Call the bank" })).toBeVisible();
});

const ROUTES = ["", "#/tasks", "#/focus", "#/matrix", "#/goals", "#/wellness", "#/settings", "#/help"];

for (const width of [320, 390, 768, 1280]) {
  test(`no horizontal overflow or console errors at ${width}px`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width, height: 800 });
    await fresh(page, { "task-tracker.tasks.v4": JSON.stringify(LEGACY_TASKS), "task-tracker.goals.v1": JSON.stringify(LEGACY_GOALS) });
    for (const r of ROUTES) {
      await page.goto(`./${r}`);
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `overflow on ${r || "/"} at ${width}px`).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
}

test("the viewport allows zoom", async ({ page }) => {
  await page.goto("./");
  const content = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(content).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\D|$)/);
});
