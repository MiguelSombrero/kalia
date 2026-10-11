import { expect, type Page } from "@playwright/test";

const SAVED: Record<"Only me" | "Anyone with the link", string> = {
  "Only me": "Saved. Your cellar is private.",
  "Anyone with the link": "Saved. Your cellar is public.",
};

/**
 * Sets the signed-in visitor's cellar visibility from their profile page.
 * Idempotent: VisibilityControl saves nothing when the radio is already
 * checked, so this checks first rather than waiting on a save a no-op would
 * never make — real whenever a spec shares a per-worker account with others
 * that may have already left it in that state. The first click is retried:
 * one that lands before hydration toggles the native radio with no handler
 * attached, and nothing would ever be saved.
 */
export const setCellarVisibility = async (
  page: Page,
  option: "Only me" | "Anyone with the link",
): Promise<void> => {
  await page.getByRole("link", { name: /^Profile: / }).click();
  const radio = page.getByRole("radio", { name: option });
  await expect(page.getByRole("radiogroup", { name: "Who can see your cellar?" })).toBeVisible();

  if (await radio.isChecked()) {
    return;
  }

  // Going public is confirmed in the profile's own question; going private saves at once.
  const answered =
    option === "Anyone with the link"
      ? page.getByRole("button", { name: "Publish cellar" })
      : page.getByText(SAVED[option]).first();
  await expect(async () => {
    await radio.click();
    await expect(answered).toBeVisible({ timeout: 2_000 });
  }).toPass();
  if (option === "Anyone with the link") {
    await answered.click();
  }
  await expect(page.getByText(SAVED[option]).first()).toBeVisible();
  await expect(radio).toBeChecked();
};
