import { expect, test, type Page } from "@playwright/test";

/** Start + due scheduling: forms, validation, persistence, import/export, calendar, overdue. */

const pad = (n: number) => String(n).padStart(2, "0");
const keyFor = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const baseTask = { notes: "", status: "todo", priority: "NI", dueDate: null, dueTime: null, remind: false, reminderSentAt: null, goalId: null, pomodoros: 0, createdAt: 1, updatedAt: 1, completedAt: null };

async function seed(page: Page, tasks: Record<string, unknown>[]) {
  await page.goto("./");
  await page.evaluate(ws => {
    localStorage.clear();
    localStorage.setItem("astra.workspace.v2", JSON.stringify(ws));
  }, { version: 2, tasks: tasks.map((t, i) => ({ ...baseTask, id: `t${i}`, ...t })), goals: [], projects: [], focusSessions: [], prefs: { defaultGoalId: null, defaultPriority: "NI", activeTaskId: null, wellnessEnabled: true }, migrations: [] });
  await page.reload();
}

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("astra.workspace.v2")!).tasks as Record<string, unknown>[]);
const composer = (page: Page) => page.getByRole("dialog", { name: "New task" });

async function openComposer(page: Page, title: string) {
  await page.keyboard.press("c");
  await page.getByRole("textbox", { name: "Task name" }).fill(title);
  return composer(page);
}

test("create and edit a task with start and due; invalid edits aren't saved", async ({ page }) => {
  await seed(page, []);
  const dlg = await openComposer(page, "Prepare slides");
  await dlg.getByLabel("Start date", { exact: true }).fill("2030-01-15");
  await dlg.getByLabel("Start time", { exact: true }).fill("09:00");
  await dlg.getByLabel("Due date", { exact: true }).fill("2030-01-15");
  await dlg.getByLabel("Due time", { exact: true }).fill("10:30");
  await dlg.getByRole("button", { name: "Add task" }).click();
  await expect(dlg).toHaveCount(0);

  await page.goto("./#/tasks");
  const row = page.locator(".task-row", { hasText: "Prepare slides" });
  await expect(row.locator(".task-row__schedule")).toHaveAttribute("title", "Starts Jan 15, 2030, 9:00 AM · Due Jan 15, 2030, 10:30 AM");
  await expect(row.locator(".task-row__schedule")).toContainText("9:00 AM – 10:30 AM");
  expect((await stored(page))[0]).toMatchObject({ startDate: "2030-01-15", startTime: "09:00", dueDate: "2030-01-15", dueTime: "10:30" });

  // Edit in the panel: an earlier due time is explained and NOT saved; the typed value stays.
  await row.locator(".task-row__main").click();
  const panel = page.getByRole("dialog", { name: "Task details" });
  await expect(panel.getByLabel("Start time", { exact: true })).toHaveValue("09:00");
  await panel.getByLabel("Start time", { exact: true }).fill("11:00");
  await expect(panel.getByText(/due time can’t be earlier than the start time \(11:00 AM\)/)).toBeVisible();
  await expect(panel.getByLabel("Due time", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(panel.getByLabel("Start time", { exact: true })).toHaveValue("11:00");
  await expect(panel.getByText("Not saved yet")).toBeVisible();
  expect((await stored(page))[0]).toMatchObject({ startTime: "09:00", dueTime: "10:30" });

  // Fixing it saves both.
  await panel.getByLabel("Due time", { exact: true }).fill("12:15");
  await expect(panel.getByText("Not saved yet")).toHaveCount(0);
  expect((await stored(page))[0]).toMatchObject({ startTime: "11:00", dueTime: "12:15" });

  // Cross-day: move the due date later; an earlier clock time is fine on a later day.
  await panel.getByLabel("Due date", { exact: true }).fill("2030-01-17");
  await panel.getByLabel("Due time", { exact: true }).fill("08:00");
  expect((await stored(page))[0]).toMatchObject({ startDate: "2030-01-15", startTime: "11:00", dueDate: "2030-01-17", dueTime: "08:00" });

  await page.reload();
  await expect(page.locator(".task-row", { hasText: "Prepare slides" }).locator(".task-row__schedule")).toHaveAttribute("title", "Starts Jan 15, 2030, 11:00 AM · Due Jan 17, 2030, 8:00 AM");
});

test("New task form rejects a due date before the start, keeping what was typed", async ({ page }) => {
  await seed(page, []);
  const dlg = await openComposer(page, "Book venue");
  await dlg.getByLabel("Start date", { exact: true }).fill("2030-03-10");
  await dlg.getByLabel("Due date", { exact: true }).fill("2030-03-08");
  const err = dlg.getByText(/due date can’t be before the start date \(Mar 10, 2030\)/);
  await expect(err).toBeVisible();
  await expect(dlg.getByLabel("Due date", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(dlg.getByLabel("Due date", { exact: true })).toHaveAccessibleDescription(/can’t be before the start date/);
  await expect(dlg.getByRole("button", { name: "Add task" })).toBeDisabled();
  await expect(dlg.getByLabel("Start date", { exact: true })).toHaveValue("2030-03-10");
  await expect(dlg.getByLabel("Due date", { exact: true })).toHaveValue("2030-03-08");
  await dlg.getByLabel("Due date", { exact: true }).fill("2030-03-12");
  await expect(err).toHaveCount(0);
  await expect(dlg.getByRole("button", { name: "Add task" })).toBeEnabled();
});

test("times are optional: start-only, date-only and due-only tasks", async ({ page }) => {
  await seed(page, []);
  let dlg = await openComposer(page, "Read chapter");
  await expect(dlg.getByLabel("Start time", { exact: true })).toBeDisabled(); // needs a date first
  await dlg.getByLabel("Start date", { exact: true }).fill("2030-02-01");
  await expect(dlg.getByLabel("Start time", { exact: true })).toBeEnabled();
  await dlg.getByRole("button", { name: "Add task" }).click();

  dlg = await openComposer(page, "Trip");
  await dlg.getByLabel("Start date", { exact: true }).fill("2030-02-03");
  await dlg.getByLabel("Due date", { exact: true }).fill("2030-02-05");
  await dlg.getByRole("button", { name: "Add task" }).click();

  await page.goto("./#/tasks");
  await page.getByRole("textbox", { name: "Add a task" }).fill("Pay rent tomorrow 6pm");
  await page.keyboard.press("Enter");

  const tasks = await stored(page);
  expect(tasks.find(t => t.title === "Read chapter")).toMatchObject({ startDate: "2030-02-01", startTime: null, dueDate: null, dueTime: null });
  expect(tasks.find(t => t.title === "Trip")).toMatchObject({ startDate: "2030-02-03", startTime: null, dueDate: "2030-02-05", dueTime: null });
  expect(tasks.find(t => t.title === "Pay rent")).toMatchObject({ startDate: null, startTime: null, dueTime: "18:00" });
  await page.getByRole("tab", { name: /All/ }).click();
  await expect(page.locator(".task-row", { hasText: "Read chapter" }).locator(".task-row__schedule")).toHaveAttribute("title", "Starts Feb 1, 2030");
  await expect(page.locator(".task-row", { hasText: "Trip" }).locator(".task-row__schedule")).toHaveAttribute("title", "Starts Feb 3, 2030 · Due Feb 5, 2030");
  await expect(page.locator(".task-row", { hasText: "Pay rent" })).toContainText(/Tomorrow · 6:00\s?PM/); // unchanged due chip
});

test("older tasks load unchanged, and start/due survive export and import", async ({ page }) => {
  // A task saved before start dates existed: no startDate/startTime keys at all.
  await seed(page, [{ title: "Legacy essay", dueDate: "2030-04-02", dueTime: "17:00" }]);
  await page.goto("./#/tasks");
  const row = page.locator(".task-row", { hasText: "Legacy essay" });
  await expect(row).toContainText(/5:00\s?PM/);
  await row.locator(".task-row__main").click();
  const panel = page.getByRole("dialog", { name: "Task details" });
  await expect(panel.getByLabel("Start date", { exact: true })).toHaveValue("");
  await expect(panel.getByLabel("Due date", { exact: true })).toHaveValue("2030-04-02");
  await expect(panel.getByLabel("Due time", { exact: true })).toHaveValue("17:00");
  await panel.getByLabel("Start date", { exact: true }).fill("2030-04-01");
  await panel.getByLabel("Start time", { exact: true }).fill("08:30");
  await panel.getByRole("button", { name: "Close" }).click();

  await page.goto("./#/settings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export", exact: true }).click()]);
  const file = Buffer.concat(await (await download.createReadStream()).toArray());
  expect(JSON.parse(file.toString("utf8")).workspace.tasks[0]).toMatchObject({ startDate: "2030-04-01", startTime: "08:30", dueDate: "2030-04-02", dueTime: "17:00" });

  // Change it, then restore the export.
  await page.goto("./#/tasks");
  await page.locator(".task-row", { hasText: "Legacy essay" }).locator(".task-row__main").click();
  await page.getByRole("dialog", { name: "Task details" }).getByLabel("Start date", { exact: true }).fill("");
  expect((await stored(page))[0]).toMatchObject({ startDate: null, startTime: null });
  await page.getByRole("dialog", { name: "Task details" }).getByRole("button", { name: "Close" }).click();
  await page.goto("./#/settings");
  await page.locator('input[type="file"]').setInputFiles({ name: "export.json", mimeType: "application/json", buffer: file });
  page.once("dialog", d => d.accept());
  await page.getByRole("button", { name: /^Restore/ }).click();
  await expect(page.getByText(/Workspace restored/)).toBeVisible();
  expect((await stored(page))[0]).toMatchObject({ startDate: "2030-04-01", startTime: "08:30", dueDate: "2030-04-02", dueTime: "17:00" });
});

test("calendar shows start→due spans and never invents a duration", async ({ page }) => {
  const today = keyFor(0);
  await seed(page, [
    { title: "Standup prep", startDate: today, startTime: "09:00", dueDate: today, dueTime: "10:30", estimateMin: 25 },
    { title: "Conference", startDate: keyFor(-1), dueDate: keyFor(1) },
    { title: "Start only", startDate: today, startTime: "11:00" },
    { title: "Due only", dueDate: today, dueTime: "15:00" },
  ]);
  await page.goto("./#/calendar");
  await page.getByRole("button", { name: "Day", exact: true }).click();
  const grid = page.locator(".calendar-grid");
  const prep = grid.locator(".calendar-span", { hasText: "Standup prep" });
  await expect(prep).toContainText("9:00 AM – 10:30 AM");
  // It sits in the 9 AM row: the slot right after the "9:00 AM" hour label.
  await expect(grid.locator(".calendar-grid__hour", { hasText: /^9:00\s?AM$/ }).locator("xpath=following-sibling::div[1]")).toContainText("Standup prep");
  await expect(grid.locator(".calendar-grid__allday .calendar-span", { hasText: "Conference" })).toContainText("Continues");
  await expect(page.locator(".calendar-content")).not.toContainText("Start only");
  await expect(page.locator(".calendar-content")).not.toContainText("Due only");

  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  const todaySection = page.locator(".calendar-agenda section").filter({ has: page.getByRole("heading", { name: new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) }) });
  await expect(todaySection).toContainText("Standup prep");
  await expect(todaySection).toContainText("Conference");

  // Clicking a span opens the task; the estimate is untouched by the 90-minute span.
  await todaySection.locator(".calendar-span", { hasText: "Standup prep" }).click();
  await expect(page.getByRole("dialog", { name: "Task details" }).getByLabel("Estimated minutes")).toHaveValue("25");
});

test("overdue comes from the due value, not the start", async ({ page }) => {
  await seed(page, [
    { title: "Started, due later", startDate: keyFor(-3), dueDate: keyFor(2) },
    { title: "Past due", startDate: keyFor(-3), dueDate: keyFor(-1) },
    { title: "Started, no due", startDate: keyFor(-3) },
  ]);
  await page.goto("./#/tasks");
  const overdueLabel = (title: string) => page.locator(".task-row", { hasText: title }).locator(".visually-hidden", { hasText: "Overdue" });
  await expect(overdueLabel("Past due")).toHaveCount(1);
  await expect(overdueLabel("Started, due later")).toHaveCount(0);
  await expect(overdueLabel("Started, no due")).toHaveCount(0);
  await page.getByRole("tab", { name: /Today/ }).click();
  await expect(page.locator(".task-row", { hasText: "Started, no due" })).toBeVisible(); // in progress → Today
});

test("schedule fields work from the keyboard; quick add opens the full form", async ({ page }) => {
  await seed(page, []);
  await page.goto("./#/tasks");
  const quick = page.getByRole("textbox", { name: "Add a task" });
  await quick.fill("Plan launch");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Schedule" })).toBeFocused();
  await page.keyboard.press("Enter");
  const dlg = composer(page);
  await expect(dlg.getByRole("textbox", { name: "Task name" })).toHaveValue("Plan launch");

  // Native date/time inputs: Tab first moves between their segments (month/day/year), then on.
  const tabTo = async (target: ReturnType<typeof dlg.getByLabel>, backwards = false) => {
    for (let i = 0; i < 25 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
    await expect(target).toBeFocused();
  };
  const field = (name: string) => dlg.getByLabel(name, { exact: true });
  await tabTo(field("Start date"));
  await page.keyboard.type("01152030");
  await tabTo(field("Start time"));
  await page.keyboard.type("0900AM");
  await tabTo(field("Due date"));
  await page.keyboard.type("01152030");
  await tabTo(field("Due time"));
  await page.keyboard.type("0800AM");
  await expect(dlg.getByRole("alert")).toContainText("can’t be earlier than the start time");
  // Still in Due time, on its AM/PM segment: ArrowUp switches 8:00 AM → 8:00 PM, which is valid.
  await expect(field("Due time")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(field("Due time")).toHaveValue("20:00");
  await expect(dlg.getByRole("alert")).toHaveCount(0);
  await dlg.getByRole("button", { name: "Add task" }).focus();
  await page.keyboard.press("Enter");
  await expect(dlg).toHaveCount(0);
  expect((await stored(page))[0]).toMatchObject({ title: "Plan launch", startDate: "2030-01-15", startTime: "09:00", dueDate: "2030-01-15", dueTime: "20:00" });
});

for (const width of [320, 375, 430]) {
  test(`schedule UI fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const today = keyFor(0);
    await seed(page, [
      { title: "A task with a fairly long title for the narrow layout", startDate: keyFor(1), startTime: "09:00", dueDate: keyFor(4), dueTime: "17:30" },
      { title: "Standup", startDate: today, startTime: "09:00", dueDate: today, dueTime: "09:30" },
    ]);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.goto("./#/tasks");
    await expect(page.locator(".task-row__schedule").first()).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.locator(".task-row", { hasText: "fairly long title" }).locator(".task-row__main").click();
    const panel = page.getByRole("dialog", { name: "Task details" });
    await panel.getByLabel("Due date", { exact: true }).fill(keyFor(0));
    await expect(panel.getByRole("alert")).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await panel.getByRole("button", { name: "Close" }).click();
    await page.goto("./#/matrix");
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.goto("./#/calendar");
    await page.getByRole("button", { name: "Day", exact: true }).click();
    await expect(page.locator(".calendar-span", { hasText: "Standup" })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
}
