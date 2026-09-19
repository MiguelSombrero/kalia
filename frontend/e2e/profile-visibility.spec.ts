// Exercises the visibility control itself against the compose stack; the
// journey through a stranger's view of a public cellar belongs to the public
// cellar page, once it exists. Credentials are a per-worker account
// provisioned by ./support/keycloakAccount.ts.
import type { Page } from "@playwright/test";
import { expect, signIn, test } from "./support/keycloakAccount";
import { expectNoA11yViolations } from "./support/a11y";

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

const openProfile = async (page: Page) => {
  await page.getByRole("link", { name: /^Profile: / }).click();
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
};

test("toggles cellar visibility, and the choice survives a reload", async ({ page, account }) => {
  await page.goto("/en");
  await signIn(page, account);
  await openProfile(page);

  // Start from a known state regardless of what earlier runs left behind.
  await page.getByRole("radio", { name: "Only me" }).check();
  await expect(page.getByText("Only you can see your cellar.")).toBeVisible();
  await expect(page.getByRole("link", { name: "View your public cellar" })).toHaveCount(0);

  await page.getByRole("radio", { name: "Anyone with the link" }).check();
  await expect(page.getByText("Anyone with the link can see your cellar, and your additions appear on Kalia's front page.")).toBeVisible();
  await expect(page.getByRole("link", { name: "View your public cellar" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("radio", { name: "Anyone with the link" })).toBeChecked();
  await expect(page.getByText("Anyone with the link can see your cellar, and your additions appear on Kalia's front page.")).toBeVisible();

  await page.getByRole("radio", { name: "Only me" }).check();
  await expect(page.getByText("Only you can see your cellar.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("radio", { name: "Only me" })).toBeChecked();

  await expectNoA11yViolations(page);
});
