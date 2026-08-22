// Exercises the whole stack against compose-run backend and Postgres
// (docs/architecture.md §7, §9).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const scanForA11yViolations = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("navigates between Home, Catalog and Cellar from every page", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Catalog" }).click();
  await expect(page).toHaveURL(/\/en\/beers$/);
  await expect(page.getByRole("heading", { level: 1, name: "Beer catalog" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Catalog" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Cellar" }).click();
  await expect(page).toHaveURL(/\/en\/cellar$/);
  await expect(page.getByRole("heading", { level: 1, name: "My cellar" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Cellar" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Cellar" })).not.toHaveAttribute("aria-current");
});

// The Cellar link is always shown, signed in or not — clicking it as a
// signed-out visitor lands on the existing in-page sign-in prompt.
test("shows the Cellar link to signed-out visitors, landing on the sign-in prompt", async ({
  page,
}) => {
  await page.goto("/en");

  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Cellar" }).click();

  await expect(page).toHaveURL(/\/en\/cellar$/);
  await expect(page.getByText("Sign in to see your cellar")).toBeVisible();
});

test("keeps the current page indicated on a nested catalog route", async ({ page }) => {
  await page.goto("/en/beers");
  await page.getByLabel("Search").fill("Westvleteren");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Westvleteren 12", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/beers\/[0-9a-f-]+$/);

  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Catalog" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
});

test("navigation is keyboard-operable and passes an axe scan, in both locales", async ({
  page,
}) => {
  await page.goto("/en");

  // Real Tab traversal, not .focus() — proves the link sits in the natural
  // tab order, not just that it's focusable.
  const catalogLink = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Catalog" });
  await expect(async () => {
    await page.keyboard.press("Tab");
    await expect(catalogLink).toBeFocused({ timeout: 200 });
  }).toPass({ timeout: 5_000 });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/beers$/);
  await expect(page.getByRole("heading", { level: 1, name: "Beer catalog" })).toBeVisible();
  expect((await scanForA11yViolations(page)).violations).toEqual([]);

  await page.goto("/fi");
  await expect(page.getByRole("navigation", { name: "Päänavigaatio" }).getByRole("link", { name: "Etusivu" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("navigation", { name: "Päänavigaatio" }).getByRole("link", { name: "Kellari" }).click();
  await expect(page).toHaveURL(/\/fi\/cellar$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kellari" })).toBeVisible();
  expect((await scanForA11yViolations(page)).violations).toEqual([]);
});
