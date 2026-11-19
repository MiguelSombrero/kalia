import { expect } from "@playwright/test";

import { test } from "./support/traceIds";

test("throwaway: fails on purpose so CI uploads its telemetry", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "A heading that never appears" })).toBeVisible({ timeout: 3000 });
});
