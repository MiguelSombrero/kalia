// Exercises the visibility control itself against the compose stack; the
// journey through a stranger's view of a public cellar belongs to the public
// cellar page. Credentials are a per-worker account provisioned by
// ./support/keycloakAccount.ts.
import { expect, signIn, test } from "./support/keycloakAccount";
import { expectNoA11yViolations } from "./support/a11y";
import { setCellarVisibility } from "./support/visibility";

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

test("asks before publishing, keeps the choice across a reload, and unpublishes without asking", async ({
  page,
  account,
}) => {
  await page.goto("/en");
  await signIn(page, account);

  // Start from a known state regardless of what earlier runs left behind.
  await setCellarVisibility(page, "Only me");
  await expect(page.getByRole("link", { name: "Open your public cellar" })).toHaveCount(0);

  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.getByRole("radio", { name: "Anyone with the link" }).click();
  await expect(page.getByText("Publish your cellar?")).toBeFocused();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Keep private" }).click();
  await expect(page.getByText("Publish your cellar?")).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Only me" })).toBeChecked();
  expect(posts, "keeping the cellar private still saved something").toEqual([]);

  await setCellarVisibility(page, "Anyone with the link");
  await expect(page.getByRole("link", { name: "Open your public cellar" })).toBeVisible();
  await expect(page.getByText(`/cellars/${account.username}`)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("radio", { name: "Anyone with the link" })).toBeChecked();
  await expect(page.getByRole("link", { name: "Open your public cellar" })).toBeVisible();

  await setCellarVisibility(page, "Only me");
  await expect(page.getByText("Publish your cellar?")).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("radio", { name: "Only me" })).toBeChecked();

  await expectNoA11yViolations(page);
});
