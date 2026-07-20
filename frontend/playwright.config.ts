import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  // Chromium only: architecture.md doesn't require cross-browser coverage
  // yet, and a single engine keeps CI runs fast.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Starts the full stack if nothing already answers at `url` (reused
    // otherwise). Verified: Playwright does not reliably stop this stack
    // after the run in every environment — harmless on CI's ephemeral
    // runner, but locally run `docker compose down` when done, same as any
    // other compose session (see frontend/README.md).
    command: "docker compose up --build",
    cwd: path.resolve(__dirname, ".."),
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 5 * 60 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
