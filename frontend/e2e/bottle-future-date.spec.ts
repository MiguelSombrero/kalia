// The brewed-date picker's max and the backend's "not in the future" check
// are both judged against the caller's local calendar day, not the server's
// or the browser's own UTC date.
import { expect, signIn, test } from "./support/keycloakAccount";
import { escapeRegExp } from "./support/text";

test.describe.configure({ mode: "serial" });

// Asia/Kolkata (UTC+5:30, no DST) keeps a fixed offset year-round, unlike a
// zone with summer time, so the boundary below reproduces reliably.
test.use({ timezoneId: "Asia/Kolkata" });

test("a bottle brewed on the local today is accepted while the UTC calendar date is still yesterday", async ({
  page,
  account,
}) => {
  await page.goto("/en/beers");
  await signIn(page, account);
  await page.goto("/en/beers");

  const card = page.getByRole("listitem").first();
  const beerName = (await card.getByRole("heading").textContent())!.trim();
  const beerNamePattern = new RegExp(escapeRegExp(beerName));

  // 20:00 UTC on the 14th is already 01:30 local on the 15th: local "today"
  // is a day past what a UTC-computed "today" would say.
  await page.clock.setFixedTime(new Date("2030-06-14T20:00:00Z"));

  await card.getByRole("button", { name: "Add to cellar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const brewedDateInput = page.getByLabel("Brewed (optional)");
  await expect(brewedDateInput).toHaveAttribute("max", "2030-06-15");
  await brewedDateInput.fill("2030-06-15");
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("cellar.bottle.dateError.brewedInFuture")).toHaveCount(0);

  // Clean up: the shared per-worker account (keycloakAccount.ts) would
  // otherwise keep a bottle dated years out indefinitely.
  await page.goto("/en/cellar");
  await page.getByRole("button", { name: beerNamePattern }).click();
  const bottleList = page.getByRole("list", { name: new RegExp(`Bottles of ${beerNamePattern.source}`) });
  await expect(bottleList).toBeVisible();
  await bottleList.getByRole("button", { name: "Remove" }).last().click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
