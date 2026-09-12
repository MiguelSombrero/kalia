// The brewed-date picker's max is judged against the caller's local
// calendar day, not the browser's UTC date; the backend accepts it under
// its own one-day tolerance around the server's clock (Bottle.java).
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

  // Freezing the browser clock only affects the page's own Date — the real
  // backend keeps ticking on the actual wall clock, so this is anchored to
  // today's real UTC date rather than a fixed literal that would eventually
  // fall outside the backend's own one-day tolerance.
  const utcTodayMidnight = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  );
  const localTomorrowIso = new Date(utcTodayMidnight + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  // 20:00 UTC is already 01:30 the next day in Kolkata: local "today" is a
  // day past what a UTC-computed "today" would say.
  await page.clock.setFixedTime(new Date(utcTodayMidnight + 20 * 60 * 60 * 1000));

  await card.getByRole("button", { name: "Add to cellar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const brewedDateInput = page.getByLabel("Brewed (optional)");
  await expect(brewedDateInput).toHaveAttribute("max", localTomorrowIso);
  await brewedDateInput.fill(localTomorrowIso);
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("cellar.bottle.dateError.brewedInFuture")).toHaveCount(0);

  // Clean up: the shared per-worker account (keycloakAccount.ts) would
  // otherwise keep this bottle around indefinitely.
  await page.goto("/en/cellar");
  await page.getByRole("button", { name: beerNamePattern }).click();
  const bottleList = page.getByRole("list", { name: new RegExp(`Bottles of ${beerNamePattern.source}`) });
  await expect(bottleList).toBeVisible();
  await bottleList.getByRole("button", { name: "Remove" }).last().click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
