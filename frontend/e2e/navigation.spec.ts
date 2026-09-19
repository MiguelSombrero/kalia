// Exercises the whole stack against compose-run backend and Postgres
// (docs/architecture.md §7, §9).
import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";

// The nav's own accessible name, which is localised — every lookup goes
// through here so a spec cannot accidentally match some other navigation
// landmark on the page.
const NAV_NAME = { en: "Main navigation", fi: "Päänavigaatio" } as const;

const navLink = (page: Page, name: string, locale: keyof typeof NAV_NAME = "en") =>
  page.getByRole("navigation", { name: NAV_NAME[locale] }).getByRole("link", { name });

const NAV_LINKS = ["Home", "Catalog", "Cellar"] as const;

// Asserts the whole nav at once — exactly one link carries aria-current, and
// it is this one. Checking the others is the half that catches a stale
// indicator left behind on the page navigated away from.
const expectCurrentPage = async (page: Page, current: (typeof NAV_LINKS)[number]) => {
  for (const name of NAV_LINKS) {
    const link = navLink(page, name);
    if (name === current) {
      await expect(link, `${name} should be the current page`).toHaveAttribute(
        "aria-current",
        "page",
      );
    } else {
      await expect(link, `${name} should not be current`).not.toHaveAttribute("aria-current");
    }
  }
};

test("navigates between Home, Catalog and Cellar from every page", async ({ page }) => {
  await page.goto("/en");
  await expectCurrentPage(page, "Home");

  await navLink(page, "Catalog").click();
  await expect(page).toHaveURL(/\/en\/beers$/);
  await expect(page.getByRole("heading", { level: 1, name: "Beer catalog" })).toBeVisible();
  await expectCurrentPage(page, "Catalog");

  await navLink(page, "Cellar").click();
  await expect(page).toHaveURL(/\/en\/cellar$/);
  await expect(page.getByRole("heading", { level: 1, name: "My cellar" })).toBeVisible();
  await expectCurrentPage(page, "Cellar");

  await navLink(page, "Home").click();
  await expect(page).toHaveURL(/\/en$/);
  await expectCurrentPage(page, "Home");
});

// The Cellar link is always shown, signed in or not — clicking it as a
// signed-out visitor lands on the existing in-page sign-in prompt.
test("shows the Cellar link to signed-out visitors, landing on the sign-in prompt", async ({
  page,
}) => {
  await page.goto("/en");

  await navLink(page, "Cellar").click();

  await expect(page).toHaveURL(/\/en\/cellar$/);
  await expect(page.getByText("Sign in to see your cellar")).toBeVisible();
});

test("keeps the current page indicated on a nested catalog route", async ({ page }) => {
  await page.goto("/en/beers");
  await page.getByLabel("Search").fill("Westvleteren");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: "Westvleteren 12", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/beers\/[0-9a-f-]+$/);

  await expectCurrentPage(page, "Catalog");
});

test("navigation is keyboard-operable and passes an axe scan, in both locales", async ({
  page,
}) => {
  await page.goto("/en");

  // Real Tab traversal, not .focus() — proves the link sits in the natural
  // tab order, not just that it's focusable.
  const catalogLink = navLink(page, "Catalog");
  await expect(async () => {
    await page.keyboard.press("Tab");
    await expect(catalogLink).toBeFocused({ timeout: 200 });
  }).toPass({ timeout: 5_000 });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/beers$/);
  await expect(page.getByRole("heading", { level: 1, name: "Beer catalog" })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.goto("/fi");
  await expect(navLink(page, "Etusivu", "fi")).toHaveAttribute("aria-current", "page");
  await navLink(page, "Kellari", "fi").click();
  await expect(page).toHaveURL(/\/fi\/cellar$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kellari" })).toBeVisible();
  await expectNoA11yViolations(page);
});
