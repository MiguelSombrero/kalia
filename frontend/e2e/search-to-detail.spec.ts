import { expect, test } from "@playwright/test";

test("search for a beer by name and open its detail page", async ({ page }) => {
  await page.goto("/beers");

  await page.getByLabel("Search").fill("Westvleteren");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/query=Westvleteren/);

  await expect(page.getByRole("link", { name: "Westvleteren 12", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Westvleteren 8", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Westvleteren 12", exact: true }).click();
  await expect(page).toHaveURL(/\/beers\/[0-9a-f-]+$/);

  await expect(page.getByRole("heading", { level: 1, name: "Westvleteren 12" })).toBeVisible();
  await expect(page.getByText("Brouwerij Westvleteren", { exact: false })).toBeVisible();
  await expect(page.getByText("Quadrupel", { exact: true })).toBeVisible();
  await expect(page.getByText("10.2 %")).toBeVisible();
});

test("filters Belgian quads between 9-12% ABV and opens one", async ({ page }) => {
  await page.goto("/beers");

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
