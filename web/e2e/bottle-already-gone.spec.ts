// A bottle another tab or the phone already removed is not a failure to remove
// again (ADR-0023): the stale page ends with the bottle gone and no error.
import { type Browser } from "@playwright/test";

import { expect, type KeycloakAccount, signIn, test } from "./support/keycloakAccount";
import { escapeRegExp } from "./support/text";

test.describe.configure({ mode: "serial" });

const signedInPage = async (browser: Browser, account: KeycloakAccount) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/en");
  await signIn(page, account);
  return { context, page };
};

test("removing a bottle that another context already removed leaves it gone, with no error", async ({
  browser,
  account,
}) => {
  const stale = await signedInPage(browser, account);
  const other = await signedInPage(browser, account);
  try {
    await stale.page.goto("/en/beers");
    const card = stale.page.getByRole("listitem").first();
    const beerName = (await card.getByRole("heading").textContent())!.trim();
    await card.getByRole("button", { name: "Add to cellar" }).click();
    await stale.page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
    await expect(stale.page.getByRole("dialog")).toBeHidden();

    const bottles = (page: typeof stale.page) =>
      page.getByRole("list", { name: new RegExp(`Bottles of ${escapeRegExp(beerName)}`) });
    const removeLast = async (page: typeof stale.page) => {
      await bottles(page).getByRole("button", { name: /^Remove / }).last().click();
      await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click();
    };

    await stale.page.goto("/en/cellar");
    const before = await bottles(stale.page).getByRole("button", { name: /^Remove / }).count();

    await other.page.goto("/en/cellar");
    await removeLast(other.page);
    await expect(other.page.getByText(/Bottle removed\./)).toBeVisible();

    // The stale page still shows the bottle the other context removed.
    await expect(bottles(stale.page).getByRole("button", { name: /^Remove / })).toHaveCount(before);
    await removeLast(stale.page);

    await expect(stale.page.getByText(/Bottle removed\./)).toBeVisible();
    await expect(stale.page.getByText("Could not remove the bottle. Please try again.")).toHaveCount(0);
    await stale.page.reload();
    await expect(
      stale.page.getByRole("list", { name: new RegExp(`Bottles of ${escapeRegExp(beerName)}`) }).getByRole("button", {
        name: /^Remove /,
      }),
    ).toHaveCount(before - 1);
  } finally {
    await stale.context.close();
    await other.context.close();
  }
});
