import { defineConfig, devices } from "@playwright/test";

// Bind and probe the same explicit IPv4 address. With `localhost`, Vite may bind
// [::1] on Windows while Playwright's readiness probe lands on 127.0.0.1 — if any
// other process owns 127.0.0.1:<port> the probe never sees our app and times out.
// A dedicated port (not Vite's default 4173) avoids colliding with other projects'
// preview servers, and --strictPort makes a genuine conflict fail fast and loudly.
const HOST = "127.0.0.1";
const PORT = Number(process.env.E2E_PORT ?? 4317);
const BASE_URL = `http://${HOST}:${PORT}/AstraFocusNexus/`;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx vite preview --host ${HOST} --port ${PORT} --strictPort`,
    url: BASE_URL,
    // Never attach to a stale/foreign server in CI; locally, reuse an AstraFocus preview you started.
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 60_000,
  },
});
