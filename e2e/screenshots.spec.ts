import { test, type Page } from "@playwright/test";

/**
 * Visual capture for review: `SCREENSHOTS=1 npx playwright test screenshots`.
 * Seeds sample data into the test browser profile only.
 */
test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to capture");

function sample() {
  const now = new Date();
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const day = (n: number) => key(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
  const t = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
    id, title, notes: "", status: "todo", priority: "NI", dueDate: null, dueTime: null, remind: false, reminderSentAt: null,
    goalId: null, pomodoros: 0, createdAt: Date.now() - 86_400_000, updatedAt: Date.now(), completedAt: null, ...extra,
  });
  const ago = (min: number) => Date.now() - min * 60_000;
  return {
    version: 1,
    goals: [
      { id: "g1", title: "Pass the CCNA exam", emoji: "🎓", targetDate: day(40), createdAt: 1, updatedAt: 1 },
      { id: "g2", title: "Ship portfolio site", emoji: "💻", targetDate: null, createdAt: 1, updatedAt: 1 },
    ],
    tasks: [
      t("t1", "Finish subnetting practice set", { priority: "UI", dueDate: day(0), dueTime: "16:00", goalId: "g1", pomodoros: 2 }),
      t("t2", "Draft case-study for the analytics project", { priority: "NI", dueDate: day(1), goalId: "g2", notes: "Lead with the outcome" }),
      t("t3", "Reply to internship recruiter", { priority: "UN", dueDate: day(-1) }),
      t("t4", "Review OSPF lecture notes", { priority: "NI", dueDate: day(0), goalId: "g1" }),
      t("t5", "Book dentist appointment", { priority: "NN", dueDate: day(3) }),
      t("t6", "Set up portfolio deploy pipeline", { priority: "NI", goalId: "g2" }),
      t("t7", "Lab 4: VLAN configuration", { status: "done", priority: "UI", goalId: "g1", completedAt: ago(90), pomodoros: 3 }),
      t("t8", "Pick a domain name", { status: "done", priority: "NN", goalId: "g2", completedAt: ago(60 * 26) }),
    ],
    focusSessions: [
      { id: "s1", taskId: "t7", endedAt: ago(150), focusedMs: 25 * 60_000, completed: true },
      { id: "s2", taskId: "t7", endedAt: ago(115), focusedMs: 25 * 60_000, completed: true },
      { id: "s3", taskId: "t1", endedAt: ago(40), focusedMs: 25 * 60_000, completed: true },
      { id: "s4", taskId: "t2", endedAt: ago(60 * 24), focusedMs: 50 * 60_000, completed: true },
      { id: "s5", taskId: "t1", endedAt: ago(60 * 48), focusedMs: 25 * 60_000, completed: true },
      { id: "s6", taskId: null, endedAt: ago(60 * 72), focusedMs: 75 * 60_000, completed: true },
    ],
    prefs: { defaultGoalId: null, defaultPriority: "NI", activeTaskId: "t1", wellnessEnabled: true },
    migrations: [],
  };
}

async function seed(page: Page, theme: "dark" | "light") {
  await page.goto("./");
  await page.evaluate(([data, th]) => {
    localStorage.clear();
    localStorage.setItem("astra.workspace.v1", JSON.stringify(data));
    localStorage.setItem("task-tracker.theme", th as string);
  }, [sample(), theme] as const);
}

const SHOTS: Array<[string, string]> = [
  ["overview", ""],
  ["tasks", "#/tasks"],
  ["focus", "#/focus"],
  ["matrix", "#/matrix"],
  ["goals", "#/goals"],
  ["wellness", "#/wellness"],
  ["settings", "#/settings"],
];

for (const theme of ["dark", "light"] as const) {
  test(`desktop ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page, theme);
    for (const [name, route] of SHOTS) {
      await page.goto(`./${route}`);
      await page.waitForTimeout(450);
      await page.screenshot({ path: `docs/screenshots/${name}-desktop-${theme}.png` });
    }
    await page.goto("./#/tasks");
    await page.keyboard.press("Control+k");
    await page.keyboard.type("ospf");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `docs/screenshots/palette-desktop-${theme}.png` });
    await page.keyboard.press("Escape");
    await page.keyboard.press("c");
    await page.keyboard.type("Essay outline fri 5pm !1");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `docs/screenshots/composer-desktop-${theme}.png` });
  });

  test(`mobile ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, theme);
    for (const [name, route] of SHOTS.slice(0, 4)) {
      await page.goto(`./${route}`);
      await page.waitForTimeout(450);
      await page.screenshot({ path: `docs/screenshots/${name}-mobile-${theme}.png` });
    }
  });
}
