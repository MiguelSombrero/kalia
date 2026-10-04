import type { Locator, Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import {
  createKeycloakUser,
  expect,
  keycloakAdminToken,
  signIn,
  test,
  type KeycloakAccount,
} from "./support/keycloakAccount";
import { KEYCLOAK_ORIGIN } from "./support/origins";
import { expectShellTargetsReachable } from "./support/shell";
import { escapeRegExp } from "./support/text";
import { setCellarVisibility } from "./support/visibility";

// playwright.config.ts records a trace on the first retry, and a trace embeds
// screencast frames; this spec must leave no image behind, even in ignored
// output (CLAUDE.md).
test.use({ screenshot: "off", trace: "off", video: "off" });

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const expectRendered = async (
  page: Page,
  heading: string | RegExp,
  { scan = true }: { scan?: boolean } = {},
) => {
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  if (scan) await expectNoA11yViolations(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "the page scrolls sideways").toBeLessThanOrEqual(0);
};

const expectContained = async (row: Locator) => {
  const escaping = await row.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return [...element.querySelectorAll<HTMLElement>("*")]
      .filter((child) => {
        const box = child.getBoundingClientRect();
        const overflowsItself = child.scrollWidth > child.clientWidth + 1 && getComputedStyle(child).display !== "inline";
        return box.left < bounds.left - 1 || box.right > bounds.right + 1 || overflowsItself;
      })
      .map((child) => child.textContent?.trim() || child.tagName);
  });
  expect(escaping, "content escapes the row or overflows its own box").toEqual([]);
};

const SIGNED_OUT_SURFACES = [
  { surface: "front page", path: "/en", heading: "Craft beer management for enthusiasts." },
  { surface: "catalog list", path: "/en/beers", heading: "Beer catalog" },
  { surface: "beer not found", path: "/en/beers/00000000-0000-0000-0000-000000000000", heading: "Beer not found" },
  { surface: "signed-out cellar", path: "/en/cellar", heading: "My cellar" },
  { surface: "signed-out profile", path: "/en/profile", heading: "Profile" },
  { surface: "missing public cellar", path: "/en/cellars/no-such-cellar-here", heading: "Page not found" },
  { surface: "sign-up", path: "/en/sign-up", heading: "Create your account" },
] as const;

const addFirstCatalogBeerToCellar = async (page: Page): Promise<string> => {
  await page.goto("/en/beers");
  const card = page.getByRole("listitem").first();
  const beerName = (await card.getByRole("heading").textContent())!.trim();
  await card.getByRole("button", { name: "Add to cellar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  return beerName;
};

for (const viewport of VIEWPORTS) {
  test.describe(`surface tour, ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("every surface a signed-out visitor can reach renders", async ({ page }) => {
      for (const { surface, path, heading } of SIGNED_OUT_SURFACES) {
        await test.step(surface, async () => {
          await page.goto(path);
          await expectRendered(page, heading);
        });
      }

      await test.step("catalog list: filters, results and pagination", async () => {
        await page.goto("/en/beers");
        await expect(page.getByRole("search")).toBeVisible();
        await expect(page.getByRole("button", { name: "Add to cellar" }).first()).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Pagination" })).toBeVisible();
      });

      await test.step("catalog list: no results", async () => {
        await page.goto("/en/beers?query=zzzzqq");
        await expect(page.getByText("No beers match your search.")).toBeVisible();
      });

      await test.step("a beer's details", async () => {
        await page.goto("/en/beers");
        const beerName = (await page.getByRole("heading", { level: 2 }).first().textContent())!.trim();
        await page.getByRole("link", { name: beerName, exact: true }).click();
        await expectRendered(page, beerName);
        await expect(page.getByRole("link", { name: /Back to catalog/ })).toBeVisible();
      });

      await test.step("sign-up leads to Keycloak's registration page", async () => {
        await page.goto("/en/sign-up");
        await page.getByRole("checkbox").check();
        await page.getByRole("button", { name: "Continue to sign-up" }).click();
        await page.waitForURL(`${KEYCLOAK_ORIGIN}/**`);
        await expectRendered(page, "Register", { scan: false });
      });

      await test.step("Keycloak's login page", async () => {
        await page.goto("/en");
        await page.getByRole("button", { name: "Sign in" }).click();
        await page.waitForURL(`${KEYCLOAK_ORIGIN}/**`);
        await expectRendered(page, "Sign in to your account", { scan: false });
      });

      await test.step("a route that matches nothing", async () => {
        await page.goto("/en/no-such-page");
        await expectRendered(page, "Page not found");
      });

      await test.step("the error page", async () => {
        // A non-numeric page reaches the backend as NaN and is rejected, which
        // is the only way to raise the error boundary without stopping the
        // backend.
        await page.goto("/en/beers?page=abc");
        await expectRendered(page, "Something went wrong");
        await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
      });
    });

    test("every surface a signed-in visitor can reach renders, empty and populated", async ({
      page,
      request,
      browser,
      baseURL,
    }) => {
      const account: KeycloakAccount = {
        username: `e2e-tour-${viewport.name}-${Date.now()}`,
        password: "testuser123",
      };
      const created = await createKeycloakUser(request, await keycloakAdminToken(request), account);
      expect(created, `could not create Keycloak user ${account.username}`).toBeTruthy();

      await page.goto("/en");
      await signIn(page, account);

      await test.step("front page, signed in", async () => {
        await page.goto("/en");
        await expectRendered(page, "Kalia");
        await expectShellTargetsReachable(page);
      });

      await test.step("an empty cellar", async () => {
        await page.goto("/en/cellar");
        await expectRendered(page, "My cellar");
        await expect(page.getByText("Your cellar is empty.")).toBeVisible();
      });

      await test.step("profile", async () => {
        await page.goto("/en/profile");
        await expectRendered(page, "Profile");
        await expect(page.getByRole("radio", { name: "Only me" })).toBeChecked();
        await expect(page.getByRole("radio", { name: "Anyone with the link" })).toBeVisible();
      });

      const beerName = await addFirstCatalogBeerToCellar(page);

      await test.step("a populated cellar", async () => {
        await page.goto("/en/cellar");
        await expectRendered(page, "My cellar");
        const row = page.getByRole("button", { name: new RegExp(escapeRegExp(beerName)) });
        await expect(row).toBeVisible();
        await expectContained(row);
        await row.click();
        await expect(page.getByRole("button", { name: "Edit" }).first()).toBeVisible();
        await expect(page.getByRole("button", { name: "Remove" }).first()).toBeVisible();
      });

      await setCellarVisibility(page, "Anyone with the link");

      await test.step("the front page feed", async () => {
        await page.goto("/en");
        await expect(
          page
            .getByRole("listitem")
            .filter({ hasText: new RegExp(escapeRegExp(beerName)) })
            .filter({ hasText: account.username })
            .first(),
        ).toBeVisible();
      });

      await test.step("a public cellar, as its owner", async () => {
        await page.goto(`/en/cellars/${account.username}`);
        await expectRendered(page, `${account.username}'s cellar`);
        await expect(page.getByText("This is how others see your cellar.")).toBeVisible();
      });

      await test.step("a public cellar, as a stranger", async () => {
        const stranger = await browser.newContext({
          baseURL,
          viewport: { width: viewport.width, height: viewport.height },
        });
        try {
          const strangerPage = await stranger.newPage();
          await strangerPage.goto(`/en/cellars/${account.username}`);
          await expectRendered(strangerPage, `${account.username}'s cellar`);
          await expect(
            strangerPage.getByRole("button", { name: new RegExp(escapeRegExp(beerName)) }),
          ).toBeVisible();
        } finally {
          await stranger.close();
        }
      });

      await setCellarVisibility(page, "Only me");
    });
  });
}
