// Exercises the visibility control itself against the compose stack; the
// journey through a stranger's view of a public cellar belongs to the public
// cellar page, once it exists. Credentials are a per-worker account
// provisioned by ./support/keycloakAccount.ts.
import { expect, signIn, test } from "./support/keycloakAccount";
import { expectNoA11yViolations } from "./support/a11y";
import { setCellarVisibility } from "./support/visibility";

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

test("toggles cellar visibility, and the choice survives a reload", async ({ page, account }) => {
  await page.goto("/en");
  await signIn(page, account);

  // Do not toggle with a bare radio.check() before a reload: the control
  // updates optimistically, so its confirmation shows before the save's POST
  // returns and the reload can read the old value. The helper waits for it.
  // Start from a known state regardless of what earlier runs left behind.
  await setCellarVisibility(page, "Only me");
  await expect(page.getByRole("link", { name: "View your public cellar" })).toHaveCount(0);

  await setCellarVisibility(page, "Anyone with the link");
  await expect(page.getByRole("link", { name: "View your public cellar" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("radio", { name: "Anyone with the link" })).toBeChecked();
  await expect(page.getByRole("main").getByText("Anyone with the link can see your cellar, and your additions appear on Kalia's front page.")).toBeVisible();

  await setCellarVisibility(page, "Only me");

  await page.reload();
  await expect(page.getByRole("radio", { name: "Only me" })).toBeChecked();

  await expectNoA11yViolations(page);
});
