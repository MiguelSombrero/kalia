// A public cellar past one page of beers: the page shows the first page, says
// what the whole cellar holds, and pages on. A fresh account of its own, since
// it fills a cellar with more beers than any other spec's shared account may
// hold (./support/keycloakAccount.ts).
import { request } from "@playwright/test";
import { createFreshAccount, expect, signIn, test } from "./support/keycloakAccount";
import { setCellarVisibility } from "./support/visibility";
import { expectNoA11yViolations } from "./support/a11y";

const PAGE_SIZE = 20;
const BEERS = PAGE_SIZE + 1;

test("a public cellar past one page of beers pages, and counts the whole cellar", async ({ page }) => {
  test.setTimeout(180_000);
  const apiRequest = await request.newContext();
  const account = await createFreshAccount(apiRequest, "e2e-paging");
  await apiRequest.dispose();

  await page.goto("/en");
  await signIn(page, account);

  // The catalog lists a page of 20 beers: the first page's cards, then the second page's first.
  for (const [route, cards] of [
    ["/en/beers", PAGE_SIZE],
    ["/en/beers?page=1", BEERS - PAGE_SIZE],
  ] as const) {
    await page.goto(route);
    for (let card = 0; card < cards; card += 1) {
      await page.getByRole("listitem").nth(card).getByRole("button", { name: "Add to cellar" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
    }
  }
  await setCellarVisibility(page, "Anyone with the link");

  await page.goto(`/en/cellars/${account.username}`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(PAGE_SIZE);
  await expect(page.getByText(`${BEERS} beers · ${BEERS} bottles`)).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expect(page.getByRole("link", { name: "← Previous" })).toHaveCount(0);
  await expectNoA11yViolations(page);

  await page.getByRole("link", { name: "Next →" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/cellars/${account.username}\\?page=1$`));
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(BEERS - PAGE_SIZE);
  await expect(page.getByText(`${BEERS} beers · ${BEERS} bottles`)).toBeVisible();
  await expect(page.getByRole("link", { name: "Next →" })).toHaveCount(0);
  await expectNoA11yViolations(page);

  await page.getByRole("link", { name: "← Previous" }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();

  await page.goto(`/en/cellars/${account.username}?page=2`);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
});
