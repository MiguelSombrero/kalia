// These specs live under frontend/ because that's where the Node/Playwright
// tooling lives, but the suite exercises the whole stack: the compose-run
// backend and Postgres are the fixture behind every page these tests visit.
// Assertions only ever check rendered DOM (headings, links, text) — the
// backend's own JSON contract is covered separately by CatalogApiIT.
// See docs/architecture.md §7 and §9 for the placement rationale and the
// trigger for revisiting it.
import { expect, test } from "@playwright/test";

test("root redirects to the English catalog by default", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kalia" })).toBeVisible();
});

test("search for a beer by name and open its detail page", async ({ page }) => {
  await page.goto("/en/beers");

  await page.getByLabel("Search").fill("Westvleteren");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/query=Westvleteren/);

  await expect(page.getByRole("link", { name: "Westvleteren 12", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Westvleteren 8", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Westvleteren 12", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/beers\/[0-9a-f-]+$/);

  await expect(page.getByRole("heading", { level: 1, name: "Westvleteren 12" })).toBeVisible();
  await expect(page.getByText("Brouwerij Westvleteren", { exact: false })).toBeVisible();
  await expect(page.getByText("Quadrupel", { exact: true })).toBeVisible();
  await expect(page.getByText("10.2 %")).toBeVisible();
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

  await page.getByRole("link", { name: "Rochefort 10", exact: true }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Rochefort 10" })).toBeVisible();
  await expect(page.getByText("11.3 %")).toBeVisible();
});

test("searches and opens a beer detail page in Finnish", async ({ page }) => {
  await page.goto("/fi/beers");

  await expect(page.getByRole("heading", { level: 1, name: "Oluttarjonta" })).toBeVisible();
  await page.getByLabel("Haku").fill("Westvleteren");
  await page.getByRole("button", { name: "Hae" }).click();
  await expect(page).toHaveURL(/query=Westvleteren/);

  await page.getByRole("link", { name: "Westvleteren 12", exact: true }).click();
  await expect(page).toHaveURL(/\/fi\/beers\/[0-9a-f-]+$/);

  await expect(page.getByRole("heading", { level: 1, name: "Westvleteren 12" })).toBeVisible();
  await expect(page.getByText("Tyyli")).toBeVisible();
  await expect(page.getByText("Alkoholi")).toBeVisible();
  await expect(page.getByText(/12,50\s€/)).toBeVisible();

  await page.getByRole("link", { name: "FI" }).waitFor();
  await page.getByRole("link", { name: "EN" }).click();
  await expect(page).toHaveURL(/\/en\/beers\/[0-9a-f-]+$/);
  await expect(page.getByText("Style")).toBeVisible();
});
