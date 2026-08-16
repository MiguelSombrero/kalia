// Exercises the whole stack against compose-run backend and Postgres
// (docs/architecture.md §7, §9).
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Same A/AA tag scope on every call.
const scanForA11yViolations = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("root redirects to the English catalog by default", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kalia" })).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

  expect((await scanForA11yViolations(page)).violations).toEqual([]);
});

test("search for a beer by name and open its detail page", async ({ page }) => {
  await page.goto("/en/beers");

  await page.getByLabel("Search").fill("Westvleteren");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/query=Westvleteren/);

  await expect(page.getByRole("link", { name: "Westvleteren 12", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Westvleteren 8", exact: true })).toBeVisible();
  expect((await scanForA11yViolations(page)).violations).toEqual([]);

  await page.getByRole("link", { name: "Westvleteren 12", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/beers\/[0-9a-f-]+$/);

  await expect(page.getByRole("heading", { level: 1, name: "Westvleteren 12" })).toBeVisible();
  await expect(page.getByText("Brouwerij Westvleteren", { exact: false })).toBeVisible();
  await expect(page.getByText("Quadrupel", { exact: true })).toBeVisible();
  await expect(page.getByText("10.2 %")).toBeVisible();
  expect((await scanForA11yViolations(page)).violations).toEqual([]);
});

test("filters Belgian quads between 9-12% ABV and opens one", async ({ page }) => {
  await page.goto("/en/beers");

  await page.getByLabel("Style").fill("Quadrupel");
  await page.getByLabel("Country").fill("Belgium");
  await page.getByLabel("Min ABV %").fill("9");
  await page.getByLabel("Max ABV %").fill("12");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByRole("link", { name: "Westvleteren 12", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Rochefort 10", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "St. Bernardus Abt 12", exact: true })).toBeVisible();
  // Out of range / wrong style / wrong country must not appear.
  await expect(page.getByRole("link", { name: "Duvel", exact: true })).toHaveCount(0);
  expect((await scanForA11yViolations(page)).violations).toEqual([]);

  await page.getByRole("link", { name: "Rochefort 10", exact: true }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Rochefort 10" })).toBeVisible();
  await expect(page.getByText("11.3 %")).toBeVisible();
});

test("searches and opens a beer detail page in Finnish", async ({ page }) => {
  await page.goto("/fi/beers");

  await expect(page.getByRole("heading", { level: 1, name: "Oluet" })).toBeVisible();
  expect((await scanForA11yViolations(page)).violations).toEqual([]);
  await page.getByLabel("Haku").fill("Westvleteren");
  await page.getByRole("button", { name: "Hae" }).click();
  await expect(page).toHaveURL(/query=Westvleteren/);

  await page.getByRole("link", { name: "Westvleteren 12", exact: true }).click();
  await expect(page).toHaveURL(/\/fi\/beers\/[0-9a-f-]+$/);

  await expect(page.getByRole("heading", { level: 1, name: "Westvleteren 12" })).toBeVisible();
  await expect(page.getByText("Tyyli")).toBeVisible();
  await expect(page.getByText("Alkoholi")).toBeVisible();
  await expect(page.getByText(/12,50\s€/)).toBeVisible();

  await page.getByRole("link", { name: "Suomi" }).waitFor();
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/beers\/[0-9a-f-]+$/);
  await expect(page.getByText("Style")).toBeVisible();
});

// Covers that paging works, not a regression guard: Playwright's Chromium
// doesn't trigger the prefetch that caused the bug (guard is Pagination.test.tsx).
test("pages forward and back through the catalog", async ({ page }) => {
  await page.goto("/en/beers");
  await expect(page.getByText("Page 1 of 3")).toBeVisible();
  const firstOnPageOne = await page.locator("main a[href^='/en/beers/']").first().innerText();

  await page.getByRole("link", { name: "Next" }).click();

  await expect(page).toHaveURL(/[?&]page=1\b/);
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
  const firstOnPageTwo = await page.locator("main a[href^='/en/beers/']").first().innerText();
  expect(firstOnPageTwo).not.toEqual(firstOnPageOne);

  await page.getByRole("link", { name: "Previous" }).click();

  await expect(page).toHaveURL(/[?&]page=0\b/);
  await expect(page.getByText("Page 1 of 3")).toBeVisible();
  expect(await page.locator("main a[href^='/en/beers/']").first().innerText()).toEqual(
    firstOnPageOne,
  );
});
