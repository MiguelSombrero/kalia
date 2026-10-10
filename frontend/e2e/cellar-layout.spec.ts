// The cellar as ADR-0070 lays it out, against the compose stack: every bottle
// a tile, the past-best-before mark judged on the visitor's own day, and the
// sort kept in the URL. Credentials are a per-worker account provisioned by
// ./support/keycloakAccount.ts; the beer it adds to is its own (support/catalog.ts).
import type { Page } from "@playwright/test";
import { CATALOG_CARD } from "./support/catalog";
import { expect, signIn, test } from "./support/keycloakAccount";

test.use({ screenshot: "off", trace: "off", video: "off" });

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

// UTC+14, so the visitor's day runs ahead of the UTC server's for most of
// every day: a mark judged on the server's day would land a day late here.
const TIMEZONE = "Pacific/Kiritimati";

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const localDay = (offsetDays: number) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

// As the tile writes it (features/cellar/bottleTime.ts).
const asWritten = (isoDate: string) =>
  new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(isoDate));

const addBottle = async (page: Page, bestBeforeDate: string) => {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Best before (optional)").fill(bestBeforeDate);
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toBeHidden();
};

// count() does not wait, so each pass first waits for the cellar to have
// rendered, and each removal for its outcome toast: a reload while the DELETE
// is still in flight would abandon it.
const removeEveryBottleOf = async (page: Page, beerName: string) => {
  const beer = page.getByRole("region", { name: beerName, exact: true });
  for (;;) {
    await page.goto("/en/cellar");
    await expect(page.getByText(/ beers? · |^Your cellar is empty\.$/).first()).toBeVisible();
    if ((await beer.count()) === 0) return;
    await beer.getByRole("button", { name: /^Remove / }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click();
    await expect(page.getByText(/^Bottle removed\./).first()).toBeVisible();
  }
};

for (const viewport of VIEWPORTS) {
  test.describe(`cellar, ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, timezoneId: TIMEZONE });

    test("marks a bottle past its best-before on the visitor's day, and not one on its best-before day", async ({
      page,
      account,
    }) => {
      await page.goto("/en/beers");
      await signIn(page, account);
      await page.goto("/en/beers");
      const card = page.getByRole("listitem").nth(CATALOG_CARD.cellarLayout);
      const beerName = (await card.getByRole("heading").textContent())!.trim();
      await removeEveryBottleOf(page, beerName);

      await page.goto("/en/beers");
      await card.getByRole("button", { name: "Add to cellar" }).click();
      await addBottle(page, localDay(-1));
      await page.goto("/en/cellar");
      await page.getByRole("button", { name: `Add bottle: ${beerName}` }).click();
      await addBottle(page, localDay(0));

      const beer = page.getByRole("region", { name: beerName, exact: true });
      const tile = (isoDate: string) =>
        beer.getByRole("listitem").filter({ hasText: `Best before ${asWritten(isoDate)}` });
      await expect(tile(localDay(-1)).getByText("Past best before")).toBeVisible();
      await expect(tile(localDay(0))).toBeVisible();
      await expect(tile(localDay(0)).getByText("Past best before")).toHaveCount(0);

      const escaping = await beer.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [...element.querySelectorAll<HTMLElement>("li, li button")]
          .filter((child) => {
            const box = child.getBoundingClientRect();
            return box.left < bounds.left - 1 || box.right > bounds.right + 1 || child.scrollWidth > child.clientWidth + 1;
          })
          .map((child) => child.textContent?.trim());
      });
      expect(escaping, "a tile or its buttons escape the beer").toEqual([]);

      await removeEveryBottleOf(page, beerName);
    });

    test("sorts by keyboard alone, and the order survives a reload through the URL", async ({ page, account }) => {
      await page.goto("/en/beers");
      await signIn(page, account);
      await page.goto("/en/beers");
      await page.getByRole("listitem").nth(CATALOG_CARD.cellarLayout).getByRole("button", { name: "Add to cellar" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeHidden();

      await page.goto("/en/cellar");
      const sort = page.getByRole("combobox", { name: "Sort by" });
      await expect(sort).toHaveValue("name");
      await sort.focus();
      await page.keyboard.type("Bottles");
      await expect(sort).toHaveValue("bottles");
      await expect(page).toHaveURL(/[?&]sort=bottles(&|$)/);
      await expect(sort).toBeFocused();

      const counts = async () =>
        (await page.getByRole("region").getByText(/^\d+ bottles?$/).allTextContents()).map((label) =>
          Number(/\d+/.exec(label)![0]),
        );
      const sorted = await counts();
      expect(sorted).toEqual([...sorted].sort((a, b) => b - a));

      await page.reload();
      await expect(page.getByRole("combobox", { name: "Sort by" })).toHaveValue("bottles");
      expect(await counts()).toEqual(sorted);

      await removeEveryBottleOf(page, await beerAt(page));
    });
  });
}

const beerAt = async (page: Page): Promise<string> => {
  await page.goto("/en/beers");
  return (await page.getByRole("listitem").nth(CATALOG_CARD.cellarLayout).getByRole("heading").textContent())!.trim();
};
