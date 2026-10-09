import type { Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { expect, signIn, test } from "./support/keycloakAccount";

test.use({ screenshot: "off", trace: "off", video: "off" });

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const MIN_TARGET = 24;

// In the order the app writes a search back out, so the URLs compare as strings.
const FILTERED_PAGED_SEARCH = "minAbv=5&page=1&sort=abv%2Cdesc";

const visibleSubmitButtons = (page: Page) =>
  page.getByRole("search").locator("button[type=submit]").filter({ visible: true });

const controlsUnderTarget = (page: Page) =>
  page.evaluate((min) => {
    const controls = document.querySelectorAll<HTMLElement>("main a[href], main button, main summary");
    return [...controls]
      .map((control) => ({ control, box: control.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height > 0 && (box.width < min || box.height < min))
      .map(({ control, box }) => `${control.textContent?.trim()} ${Math.round(box.width)}×${Math.round(box.height)}`);
  }, MIN_TARGET);

const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const viewport of VIEWPORTS) {
  test.describe(`catalog, ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const locale of ["en", "fi"] as const) {
      test(`in ${locale}, the count comes before the results, the first beer is on the first screen and nothing scrolls sideways`, async ({
        page,
      }) => {
        await page.goto(`/${locale}/beers`);

        const count = page.getByText(locale === "en" ? "54 beers" : "54 olutta", { exact: true });
        const firstRow = page.getByRole("main").getByRole("listitem").first();
        await expect(count).toBeVisible();
        await expect(firstRow).toBeVisible();
        const countBox = await count.boundingBox();
        const rowBox = await firstRow.boundingBox();
        expect(countBox!.y).toBeLessThan(rowBox!.y);
        expect(rowBox!.y + rowBox!.height, "the filters push the first beer off the first screen").toBeLessThan(
          viewport.height,
        );
        expect(await sideways(page)).toBeLessThanOrEqual(0);
      });
    }

    // ADR-0069: one Search, after everything it sends, open filters or not.
    test("the search form shows exactly one button, before and after the filters are opened", async ({ page }) => {
      await page.goto("/en/beers");
      await expect(visibleSubmitButtons(page)).toHaveCount(1);
      await expect(visibleSubmitButtons(page)).toHaveText("Search");

      const filters = page.getByRole("search").locator("summary");
      if (viewport.name === "phone") {
        await expect(page.getByLabel("Style")).toBeHidden();
        await filters.click();
        await expect(page.getByLabel("Style")).toBeVisible();
        await expect(visibleSubmitButtons(page)).toHaveCount(1);
      } else {
        await expect(filters).toBeHidden();
        await expect(page.getByLabel("Style")).toBeVisible();
      }

      await page.getByLabel("Search").fill("abt");
      await page.getByLabel("Country").fill("Belgium");
      await visibleSubmitButtons(page).click();
      await expect(page).toHaveURL(/query=abt/);
      await expect(page).toHaveURL(/country=Belgium/);
      await expect(page.getByText("1 beer", { exact: true })).toBeVisible();
    });

    test("signed out, list and details keep every control at least 24×24 and pass axe", async ({ page }) => {
      await page.goto(`/en/beers?${FILTERED_PAGED_SEARCH}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await controlsUnderTarget(page), `list controls under ${MIN_TARGET}×${MIN_TARGET}`).toEqual([]);
      await expectNoA11yViolations(page);

      await page.getByRole("main").getByRole("listitem").first().getByRole("heading").getByRole("link").click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await controlsUnderTarget(page), `details controls under ${MIN_TARGET}×${MIN_TARGET}`).toEqual([]);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
      await expectNoA11yViolations(page);
    });

    test("a beer opened from a filtered, paged search leads back to that same search", async ({ page }) => {
      await page.goto(`/en/beers?${FILTERED_PAGED_SEARCH}`);
      const firstOnPage = page.getByRole("main").getByRole("listitem").first().getByRole("heading");
      const beerName = (await firstOnPage.textContent())!.trim();
      await firstOnPage.getByRole("link").click();
      await expect(page.getByRole("heading", { level: 1, name: beerName })).toBeVisible();

      await page.getByRole("link", { name: "← Back to results" }).click();

      await expect(page).toHaveURL(new RegExp(`/en/beers\\?${FILTERED_PAGED_SEARCH}$`));
      await expect(page.getByRole("main").getByRole("listitem").first().getByRole("heading")).toHaveText(beerName);
    });

    test("signed in, a row's Add is reached and used by keyboard without following the row's link, and axe passes", async ({
      page,
      account,
    }) => {
      await page.goto("/en/beers");
      await signIn(page, account);
      await page.goto("/en/beers");

      const row = page.getByRole("main").getByRole("listitem").first();
      const link = row.getByRole("heading").getByRole("link");
      const beerName = (await link.textContent())!.trim();
      await link.focus();

      await page.keyboard.press("Tab");
      const add = row.getByRole("button", { name: `Add to cellar: ${beerName}` });
      await expect(add).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page).toHaveURL(/\/en\/beers$/);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
      await expect(add).toBeFocused();

      await page.keyboard.press("Shift+Tab");
      await expect(link).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("heading", { level: 1, name: beerName })).toBeVisible();

      await expectNoA11yViolations(page);
    });
  });
}
