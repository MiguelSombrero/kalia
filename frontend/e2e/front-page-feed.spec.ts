// The front page's whole journey: a cellar made public gets a bottle added,
// and that specific addition surfaces on the front page with a working link
// back to the cellar it names. Credentials are a per-worker account
// provisioned by ./support/keycloakAccount.ts.
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, signIn, test } from "./support/keycloakAccount";
import { escapeRegExp } from "./support/text";
import { setCellarVisibility } from "./support/visibility";

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

const scanForA11yViolations = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("a public addition appears on the front page and links back to its cellar", async ({
  page,
  account,
}) => {
  await page.goto("/en");
  await signIn(page, account);
  await setCellarVisibility(page, "Anyone with the link");

  await page.goto("/en/beers");
  // Down the list, matching the other specs sharing this worker's account —
  // avoids the exact-delta assertions add-to-cellar.spec makes on the first
  // two cards and the fixed card public-cellar.spec uses.
  const card = page.getByRole("listitem").nth(12);
  const beerName = (await card.getByRole("heading").textContent())!.trim();
  await card.getByRole("button", { name: "Add to cellar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.goto("/en");
  // The feed is global shared state other specs add to concurrently, and a
  // rerun against a persisted local database can leave an earlier run's own
  // matching line behind too — .first() picks the newest, since the feed
  // renders newest-first, rather than asserting on the feed's length or
  // requiring the match to be unique.
  const line = page
    .getByRole("listitem")
    .filter({ hasText: new RegExp(escapeRegExp(beerName)) })
    .filter({ hasText: account.username })
    .first();
  await expect(line).toBeVisible();

  expect((await scanForA11yViolations(page)).violations).toEqual([]);

  await line.getByRole("link", { name: account.username }).click();
  await expect(page).toHaveURL(new RegExp(`/en/cellars/${account.username}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: `${account.username}'s cellar` }),
  ).toBeVisible();
});
