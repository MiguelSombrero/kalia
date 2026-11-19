import type { Page } from "@playwright/test";

export const loaded = async (page: Page) => {
  await page.waitForTimeout(1_000);
};
