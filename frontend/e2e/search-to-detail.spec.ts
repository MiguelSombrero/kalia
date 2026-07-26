// These specs live under frontend/ because that's where the Node/Playwright
// tooling lives, but the suite exercises the whole stack: the compose-run
// backend and Postgres are the fixture behind every page these tests visit.
// Assertions only ever check rendered DOM (headings, links, text) — the
// backend's own JSON contract is covered separately by CatalogApiIT.
// See docs/architecture.md §7 and §9 for the placement rationale and the
// trigger for revisiting it.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// WCAG 2.1 AA scan (iteration 2, task 7) — same tag scope on every call,
// scoped to A/AA per the roadmap task's literal target.
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

/**
 * Behavioural cover for pagination, which had no end-to-end test when it
 * broke (iteration 3 task 11).
 *
 * Deliberately NOT claimed as the regression guard for that bug: Playwright's
 * Chromium does not trigger the prefetch that caused it, and this test was
 * measured passing three times out of three against a build with the bug
 * present. The guard that does hold is in Pagination.test.tsx, which asserts
 * prefetching stays disabled. This test covers that paging works at all.
 */
test("pages forward and back through the catalog", async ({ page }) => {
  await page.goto("/en/beers");
  await expect(page.getByText("Page 1 of 3")).toBeVisible();
  const firstOnPageOne = await page.locator("main a[href^='/en/beers/']").first().innerText();

  await page.getByRole("link", { name: "Next" }).click();

  // The URL not changing was the reported symptom.
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
