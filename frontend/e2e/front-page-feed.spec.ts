// The front page's whole journey: a cellar made public gets a bottle added,
// and that specific addition surfaces on the front page with a working link
// back to the cellar it names. Credentials are a per-worker account
// provisioned by ./support/keycloakAccount.ts.
import type { Page } from "@playwright/test";
import { createFreshAccount, expect, signIn, test } from "./support/keycloakAccount";
import { CATALOG_CARD } from "./support/catalog";
import { escapeRegExp } from "./support/text";
import { setCellarVisibility } from "./support/visibility";
import { expectNoA11yViolations } from "./support/a11y";

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

test("a public addition appears on the front page and links back to its cellar", async ({
  page,
  account,
}) => {
  await page.goto("/en");
  await signIn(page, account);
  await setCellarVisibility(page, "Anyone with the link");

  await page.goto("/en/beers");
  // Which card, and why it is not an arbitrary one: support/catalog.ts.
  const card = page.getByRole("listitem").nth(CATALOG_CARD.frontPageFeed);
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

  await expectNoA11yViolations(page);

  await line.getByRole("link", { name: account.username }).click();
  await expect(page).toHaveURL(new RegExp(`/en/cellars/${account.username}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: `${account.username}'s cellar` }),
  ).toBeVisible();
});

// One more line than the front page's first page holds (the feed's default size),
// so every line one page-sized read would see is private.
const PRIVATE_RUN = 21;

const addOneBottle = async (page: Page, card: number) => {
  await page.getByRole("listitem").nth(card).getByRole("button", { name: "Add to cellar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
};

test("the front page reaches a public addition past a full page of private ones", async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const publicAccount = await createFreshAccount(request, "e2e-feed-public");
  const privateAccount = await createFreshAccount(request, "e2e-feed-private");

  const publicContext = await browser.newContext();
  const privateContext = await browser.newContext();
  const visitorContext = await browser.newContext();
  try {
    const publicPage = await publicContext.newPage();
    await publicPage.goto("/en");
    await signIn(publicPage, publicAccount);
    await setCellarVisibility(publicPage, "Anyone with the link");
    await publicPage.goto("/en/beers");
    await addOneBottle(publicPage, CATALOG_CARD.frontPageFeed);

    // A fresh account's cellar starts private.
    const privatePage = await privateContext.newPage();
    await privatePage.goto("/en");
    await signIn(privatePage, privateAccount);
    await privatePage.goto("/en/beers");
    for (let added = 0; added < PRIVATE_RUN; added += 1) {
      await addOneBottle(privatePage, CATALOG_CARD.frontPageFeed);
    }

    const visitor = await visitorContext.newPage();
    // Recording is asynchronous (ADR-0058), so the line may land a moment
    // after the add that caused it has already answered.
    await expect(async () => {
      await visitor.goto("/en");
      await expect(visitor.getByRole("link", { name: publicAccount.username })).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    await expect(visitor.getByText("Nothing here yet.")).toBeHidden();
  } finally {
    await publicContext.close();
    await privateContext.close();
    await visitorContext.close();
  }
});
