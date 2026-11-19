import type { Page } from "@playwright/test";

export const loaded = async (page: Page) => {
  await page.waitForLoadState("networkidle");
};
