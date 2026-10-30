import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { STACK } from "./stackOrigins";

const EDGE_SPEC = /edge-limits\.spec\.ts$/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: STACK.web,
    trace: "on-first-retry",
  },
  // Chromium only: no cross-browser requirement yet (docs/architecture.md).
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: EDGE_SPEC,
    },
    // Exhausts the edge proxy's per-address limits, which every other spec
    // shares, so it waits for all of them. `--project=edge-limits` therefore
    // runs the whole suite first; add `--no-deps` to skip that.
    {
      name: "edge-limits",
      use: { ...devices["Desktop Chrome"] },
      testMatch: EDGE_SPEC,
      dependencies: ["chromium"],
    },
  ],
  webServer: {
    // Playwright does not reliably stop this stack after the run — harmless
    // on CI's ephemeral runner, but run `docker compose down` locally.
    command: "docker compose up --build",
    cwd: path.resolve(__dirname, ".."),
    url: STACK.web,
    reuseExistingServer: !process.env.CI,
    // A cold `docker compose up --build` on a CI runner has no BuildKit cache:
    // the web image's own `npm ci` alone runs 3–5 min on a slow-registry
    // day, before `next build` and five containers coming up healthy. 5 min
    // overran intermittently (see docs/ci-playbook.md).
    timeout: 12 * 60 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
