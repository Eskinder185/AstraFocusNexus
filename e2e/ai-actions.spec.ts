import { expect, test, type Page } from "@playwright/test";
import { mockOllama, mockOpenAI, openManual } from "./aiMocks";

/** BYOAI actions and setup paths with SIMULATED providers (page.route). No real model is used. */

const pad = (n: number) => String(n).padStart(2, "0");
const keyFor = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const at = (key: string, hh: number, mm = 0) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
};
const base = { notes: "", status: "todo", priority: "NI", dueDate: null, dueTime: null, remind: false, reminderSentAt: null, goalId: null, pomodoros: 0, createdAt: 1, updatedAt: 1, completedAt: null };

async function seed(page: Page, tasks: Record<string, unknown>[], goals: Record<string, unknown>[] = []) {
  await page.goto("./");
  await page.evaluate(ws => {
    localStorage.clear();
    localStorage.setItem("astra.workspace.v2", JSON.stringify(ws));
  }, { version: 2, tasks: tasks.map((t, i) => ({ ...base, id: `t${i}`, ...t })), goals, projects: [], focusSessions: [], prefs: { defaultGoalId: null, defaultPriority: "NI", activeTaskId: null, wellnessEnabled: true }, migrations: [] });
  await page.reload();
}
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("astra.workspace.v2")!).tasks as Record<string, unknown>[]);

async function connectOllama(page: Page, model = "llama3.2:3b") {
  await page.goto("./#/ai");
  const s = await openManual(page);
  await s.getByLabel("Model", { exact: true }).fill(model);
  await s.getByLabel(/Allow AstraFocus to send requests to 127\.0\.0\.1:11434/).check();
  await s.getByRole("button", { name: "Test connection" }).click();
  await expect(s.getByRole("status")).toContainText("Connected");
}

async function openTask(page: Page, title: string) {
  await page.goto("./#/tasks");
  await page.getByRole("tab", { name: /All/ }).click();
  await page.locator(".task-row", { hasText: title }).locator(".task-row__main").click();
  return page.getByRole("dialog", { name: "Task details" });
}

test("improve a task: preview, notes opt-in, review, apply once", async ({ page }) => {
  const reply = JSON.stringify({ title: "Email Dr. Lee to book the lab slot", description: "Send the request with two date options.", estimateMin: 15, subtasks: [{ title: "Check free dates", minutes: 5 }, { title: "Draft the email", minutes: 10 }] });
  const hits = await mockOllama(page, { reply });
  await seed(page, [{ title: "lab thing", notes: "secret note about grades", goalId: "g1", priority: "UI" }], [{ id: "g1", title: "Graduate", emoji: "🎓", targetDate: null, createdAt: 1, updatedAt: 1 }]);
  await connectOllama(page);

  const panel = await openTask(page, "lab thing");
  await panel.getByRole("button", { name: "Improve with AI" }).click();
  const dlg = page.getByRole("dialog", { name: "Improve this task" });
  await expect(dlg.getByText(/Using llama3\.2:3b/)).toBeVisible();
  const preview = dlg.getByRole("region", { name: /What will be sent/ });
  await expect(preview).toContainText("lab thing");
  await expect(preview).not.toContainText("secret note");
  await dlg.getByLabel(/Include this task’s notes/).check();
  await expect(preview).toContainText("secret note about grades");
  await dlg.getByLabel(/Include this task’s notes/).uncheck();
  expect(hits.chat).toBe(0);

  await dlg.getByRole("button", { name: "Suggest improvements" }).click();
  await expect(dlg.getByRole("list", { name: "Suggested subtasks" })).toBeVisible();
  expect(hits.chat).toBe(1);
  expect(JSON.stringify(hits.bodies[0])).not.toContain("secret note");
  expect(JSON.stringify(hits.bodies[0])).toContain("Task: lab thing");
  expect((await stored(page))[0].title).toBe("lab thing"); // nothing applied yet

  await expect(dlg.getByLabel("Use the new title")).toBeChecked();
  await expect(dlg.getByLabel("Set the estimate")).toBeChecked(); // task had no estimate
  await expect(dlg.getByLabel("Add the description to the notes")).not.toBeChecked();
  await dlg.getByLabel("Include subtask 1").uncheck();
  await dlg.getByRole("button", { name: "Apply selected (3)" }).dblclick();
  await expect(page.getByText("Applied 3 changes.")).toBeVisible();

  const tasks = await stored(page);
  expect(tasks).toHaveLength(2);
  expect(tasks.find(t => t.id === "t0")).toMatchObject({ title: "Email Dr. Lee to book the lab slot", estimateMin: 15, notes: "secret note about grades" });
  expect(tasks.find(t => t.title === "Draft the email")).toMatchObject({ estimateMin: 10, goalId: "g1", priority: "UI" });
  expect(hits.chat).toBe(1);
});

test("improve without a connection explains how to connect; malformed replies are rejected", async ({ page }) => {
  await seed(page, [{ title: "vague task" }]);
  let panel = await openTask(page, "vague task");
  await panel.getByRole("button", { name: "Improve with AI" }).click();
  let dlg = page.getByRole("dialog", { name: "Improve this task" });
  await expect(dlg.getByText("No AI model is connected")).toBeVisible();
  await expect(dlg.getByRole("button", { name: "Suggest improvements" })).toBeDisabled();
  await dlg.getByRole("button", { name: "Close" }).first().click();
  await page.keyboard.press("Escape");

  await mockOllama(page, { reply: "I'd rather chat about the weather." });
  await connectOllama(page);
  panel = await openTask(page, "vague task");
  await panel.getByRole("button", { name: "Improve with AI" }).click();
  dlg = page.getByRole("dialog", { name: "Improve this task" });
  await dlg.getByRole("button", { name: "Suggest improvements" }).click();
  await expect(dlg.getByRole("alert")).toContainText("didn’t return a suggestion");
  expect((await stored(page))[0].title).toBe("vague task");
});

test("plan my day: selected tasks only, local conflict checks, apply only valid blocks", async ({ page }) => {
  const day = keyFor(1);
  const reply = JSON.stringify({
    blocks: [
      { task: "T1", start: "09:00", minutes: 60, reason: "Due at noon, so first." },
      { task: "T2", start: "10:30", minutes: 30, reason: "Fits after the report." },
    ],
    unscheduled: [],
  });
  const hits = await mockOllama(page, { reply });
  await seed(page, [
    { title: "Write report", estimateMin: 60, dueDate: day, dueTime: "12:00", priority: "UI" },
    { title: "Review notes", estimateMin: 30, startDate: day, startTime: "13:00" },
    { title: "Gym session", estimateMin: 60, scheduledAt: at(day, 10) },
    { title: "Unrelated idea", notes: "do not send" },
  ]);
  await connectOllama(page);
  await page.goto("./#/calendar");
  await page.getByRole("button", { name: "Plan my day" }).click();
  const dlg = page.getByRole("dialog", { name: "Plan my day" });
  await dlg.getByLabel("Day").fill(day);
  await expect(dlg.getByRole("button", { name: "Suggest a plan" })).toBeDisabled(); // nothing selected yet
  await dlg.getByRole("checkbox", { name: /Write report/ }).focus();
  await page.keyboard.press("Space"); // keyboard selection
  await dlg.getByRole("checkbox", { name: /Review notes/ }).check();
  const preview = dlg.getByRole("region", { name: /What will be sent/ });
  await expect(preview).toContainText("Busy (already planned): 10:00-11:00");
  await expect(preview).not.toContainText("Gym");
  await expect(preview).not.toContainText("Unrelated idea");
  expect(hits.chat).toBe(0);

  await dlg.getByRole("button", { name: "Suggest a plan" }).click();
  const blocks = dlg.getByRole("list", { name: "Suggested work blocks" });
  await expect(blocks).toBeVisible();
  const sent = JSON.stringify(hits.bodies[0]);
  expect(sent).toContain("T1: \\\"Write report\\\"");
  expect(sent).not.toContain("Gym");
  expect(sent).not.toContain("do not send");

  // T1 is valid and preselected; T2 conflicts (busy overlap + before its start) and can't be applied.
  await expect(dlg.getByRole("checkbox", { name: "Include Write report" })).toBeChecked();
  const t2 = dlg.getByRole("checkbox", { name: "Include Review notes" });
  await expect(t2).toBeDisabled();
  const conflicts = dlg.getByRole("list", { name: "Conflicts for Review notes" });
  await expect(conflicts).toContainText("Overlaps something already planned");
  await expect(conflicts).toContainText("Starts before the task does");
  await expect(dlg.getByRole("button", { name: "Apply selected (1)" })).toBeEnabled();

  // Fix T2 by editing its time; AstraFocus re-checks it.
  await dlg.getByLabel("Review notes start time").fill("13:00");
  await expect(conflicts).toHaveCount(0);
  await t2.check();
  await dlg.getByRole("button", { name: "Apply selected (2)" }).dblclick();
  await expect(page.getByText(/Planned 2 work blocks/)).toBeVisible();

  const tasks = await stored(page);
  const report = tasks.find(t => t.title === "Write report")!;
  const reviewT = tasks.find(t => t.title === "Review notes")!;
  expect(report).toMatchObject({ scheduledAt: at(day, 9), dueDate: day, dueTime: "12:00", estimateMin: 60 });
  expect(reviewT).toMatchObject({ scheduledAt: at(day, 13), startDate: day, startTime: "13:00", estimateMin: 30 });
  expect(tasks.find(t => t.title === "Gym session")!.scheduledAt).toBe(at(day, 10));
  expect(hits.chat).toBe(1);
});

test("plan my day: cancelling a request changes nothing", async ({ page }) => {
  const hits = await mockOllama(page, { hangChat: true });
  await seed(page, [{ title: "Write report", estimateMin: 60 }]);
  await connectOllama(page);
  await page.goto("./#/calendar");
  await page.getByRole("button", { name: "Plan my day" }).click();
  const dlg = page.getByRole("dialog", { name: "Plan my day" });
  await dlg.getByLabel("Day").fill(keyFor(1));
  await dlg.getByRole("checkbox", { name: /Write report/ }).check();
  await dlg.getByRole("button", { name: "Suggest a plan" }).click();
  await expect(dlg.getByRole("status")).toContainText("Waiting for the model");
  await dlg.getByRole("button", { name: "Cancel" }).click();
  await expect(dlg.getByRole("button", { name: "Suggest a plan" })).toBeEnabled();
  expect(hits.chat).toBe(1);
  expect((await stored(page))[0].scheduledAt ?? null).toBeNull();
});

test("cloud path: provider cards, plain-language fields, charges note, mocked test", async ({ page }) => {
  await mockOpenAI(page, { models: ["gpt-test"] });
  await page.goto("./");
  await page.evaluate(() => localStorage.clear());
  await page.goto("./#/ai");
  await page.getByRole("button", { name: /Connect a cloud provider/ }).click();
  await page.locator(".ai-cloud .ai-tier", { hasText: /^OpenAI/ }).click();
  await expect(page.getByRole("radio", { name: /^OpenAI/ })).toBeChecked();
  const form = page.locator("#ai-connections");
  await expect(form.getByLabel("Provider", { exact: true })).toHaveCount(0); // cards replace the picker
  await expect(form.getByLabel("API base URL")).toHaveValue("https://api.openai.com/v1");
  await expect(page.getByText(/may bill every request, including connection tests/)).toBeVisible();
  await form.getByLabel(/^API key/).fill("sk-test-cloud-0000000000");
  await expect(form.getByLabel(/^API key/)).toHaveAttribute("type", "password");
  await form.getByLabel(/Allow AstraFocus to send requests to api\.openai\.com/).check();
  await form.getByRole("button", { name: "Load models" }).click();
  await form.getByLabel("Model", { exact: true }).fill("gpt-test");
  await form.getByRole("button", { name: "Test connection" }).click();
  await expect(form.getByRole("status")).toContainText("Connected");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".ai-dash__status")).toContainText("OpenAI");
  await expect(page.locator(".ai-dash__status")).toContainText("gpt-test");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("sk-test-cloud");
});

test("Settings has a Bring Your Own AI entry; local path explains localhost", async ({ page }) => {
  await page.goto("./#/settings");
  const card = page.getByRole("region", { name: "Bring Your Own AI" });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "Set up AI" }).click();
  await expect(page).toHaveURL(/#\/ai$/);
  await page.getByRole("button", { name: /Use AI on this computer/ }).click();
  await expect(page.getByText(/On a phone that points at the phone/)).toBeVisible();
});

for (const width of [375, 430]) {
  test(`action dialogs fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const day = keyFor(1);
    await mockOllama(page, { reply: JSON.stringify({ blocks: [{ task: "T1", start: "09:00", minutes: 60, reason: "A long explanation ".repeat(8) }], unscheduled: [], title: "A".repeat(110), description: "word ".repeat(60), estimateMin: 30, subtasks: [{ title: "B".repeat(100), minutes: 10 }] }) });
    await seed(page, [{ title: "A task with a long title that needs to wrap on phones", estimateMin: 60 }]);
    await connectOllama(page);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

    await page.goto("./#/calendar");
    await page.getByRole("button", { name: "Plan my day" }).click();
    const plan = page.getByRole("dialog", { name: "Plan my day" });
    await plan.getByLabel("Day").fill(day);
    await plan.getByRole("checkbox", { name: /long title/ }).check();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await plan.getByRole("button", { name: "Suggest a plan" }).click();
    await expect(plan.getByRole("list", { name: "Suggested work blocks" })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    expect((await plan.boundingBox())!.width).toBeLessThanOrEqual(width);
    await plan.getByRole("button", { name: "Back" }).click();
    await plan.getByRole("button", { name: "Close" }).last().click();

    const panel = await openTask(page, "long title");
    await panel.getByRole("button", { name: "Improve with AI" }).click();
    const imp = page.getByRole("dialog", { name: "Improve this task" });
    await imp.getByRole("button", { name: "Suggest improvements" }).click();
    await expect(imp.getByRole("list", { name: "Suggested subtasks" })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    expect((await imp.boundingBox())!.width).toBeLessThanOrEqual(width);
  });
}
