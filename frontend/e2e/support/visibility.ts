import { expect, type Page } from "@playwright/test";

const CONFIRMATION: Record<"Only me" | "Anyone with the link", string> = {
  "Only me": "Only you can see your cellar.",
  "Anyone with the link":
    "Anyone with the link can see your cellar, and your additions appear on Kalia's front page.",
};

/**
 * Sets the signed-in visitor's cellar visibility from their profile page.
 * Idempotent: VisibilityControl no-ops (no POST fires) when the radio is
 * already checked to the requested value, so this checks first rather than
 * waiting on a response a no-op toggle would never send — real whenever a
 * spec shares a per-worker account with others that may have already left
 * it in that state.
 */
export const setCellarVisibility = async (
  page: Page,
  option: "Only me" | "Anyone with the link",
): Promise<void> => {
  await page.getByRole("link", { name: /^Profile: / }).click();
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  const radio = page.getByRole("radio", { name: option });
  if (await radio.isChecked()) {
    await expect(page.getByText(CONFIRMATION[option])).toBeVisible();
    return;
  }

  const committed = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/profile") &&
      response.status() === 200,
  );
  await radio.check();
  await expect(page.getByText(CONFIRMATION[option])).toBeVisible();
  await committed;
};
