import type { Locator, Page } from "@playwright/test";
import { expectCoherentHeadings, expectNoA11yViolations } from "./support/a11y";
import { copyFor, LOCALES, type Locale } from "./support/copy";
import { expectNoSidewaysScroll } from "./support/layout";
import { createFreshAccount, expect, signIn, test, uniqueUsername } from "./support/keycloakAccount";
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

const expectRendered = async (page: Page, heading: string | RegExp) => {
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expectCoherentHeadings(page);
  await expectNoA11yViolations(page);
  await expectNoSidewaysScroll(page);
};

const expectContained = async (row: Locator) => {
  const escaping = await row.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return [...element.querySelectorAll<HTMLElement>("*")]
      // sr-only text is clipped to a 1px box on purpose, so it always "overflows";
      // an element hidden at this width has no box at all and sits at 0,0.
      .filter((child) => !child.classList.contains("sr-only") && child.getClientRects().length > 0)
      .filter((child) => {
        const box = child.getBoundingClientRect();
        const overflowsItself = child.scrollWidth > child.clientWidth + 1 && getComputedStyle(child).display !== "inline";
        return box.left < bounds.left - 1 || box.right > bounds.right + 1 || overflowsItself;
      })
      .map((child) => child.textContent?.trim() || child.tagName);
  });
  expect(escaping, "content escapes the row or overflows its own box").toEqual([]);
};

const signedOutSurfaces = (locale: Locale) => {
  const t = copyFor(locale);
  return [
    { surface: "front page", path: `/${locale}`, heading: t("app.tagline") },
    { surface: "catalog list", path: `/${locale}/beers`, heading: t("catalog.title") },
    { surface: "beer not found", path: `/${locale}/beers/00000000-0000-0000-0000-000000000000`, heading: t("notFound.title") },
    { surface: "signed-out cellar", path: `/${locale}/cellar`, heading: t("cellar.title") },
    { surface: "signed-out profile", path: `/${locale}/profile`, heading: t("profile.title") },
    { surface: "missing public cellar", path: `/${locale}/cellars/no-such-cellar-here`, heading: t("notFound.generic.title") },
    { surface: "sign-up", path: `/${locale}/sign-up`, heading: t("signUp.title") },
  ];
};

// Keycloak translates its own pages (ADR-0056), so their wording is not in the app's messages.
const KEYCLOAK_HEADINGS: Record<Locale, { register: string; signIn: string }> = {
  en: { register: "Register", signIn: "Sign in to your account" },
  fi: { register: "Rekisteröidy", signIn: "Kirjaudu sisään" },
};

const withoutArrow = (label: string) => new RegExp(escapeRegExp(label.replace(/^← /, "")));

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
  for (const locale of LOCALES) {
    const t = copyFor(locale);

    test.describe(`surface tour, ${locale}, ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test("every surface a signed-out visitor can reach renders", async ({ page }) => {
        for (const { surface, path, heading } of signedOutSurfaces(locale)) {
          await test.step(surface, async () => {
            await page.goto(path);
            await expectRendered(page, heading);
          });
        }

        await test.step("catalog list: filters, results and pagination", async () => {
          await page.goto(`/${locale}/beers`);
          await expect(page.getByRole("search")).toBeVisible();
          await expect(page.getByRole("button", { name: t("cellar.add.action") }).first()).toBeVisible();
          await expect(page.getByRole("navigation", { name: t("catalog.pagination.label") })).toBeVisible();
        });

        await test.step("catalog list: no results", async () => {
          await page.goto(`/${locale}/beers?query=zzzzqq`);
          await expect(page.getByText(t("catalog.empty.title"))).toBeVisible();
          await expectCoherentHeadings(page);
          await expectNoA11yViolations(page);
        });

        await test.step("a beer's details", async () => {
          await page.goto(`/${locale}/beers`);
          const beerName = (await page.getByRole("heading", { level: 2 }).first().textContent())!.trim();
          await page.getByRole("link", { name: beerName, exact: true }).click();
          await expectRendered(page, beerName);
          await expect(page.getByRole("link", { name: withoutArrow(t("beer.backToCatalog")) })).toBeVisible();
        });

        await test.step("sign-up leads to Keycloak's registration page", async () => {
          await page.goto(`/${locale}/sign-up`);
          await page.getByRole("checkbox").check();
          await page.getByRole("button", { name: t("signUp.action") }).click();
          await page.waitForURL(`${KEYCLOAK_ORIGIN}/**`);
          await page.locator("#kc-register-form").waitFor();
          await expectRendered(page, KEYCLOAK_HEADINGS[locale].register);
        });

        await test.step("Keycloak's login page", async () => {
          await page.goto(`/${locale}`);
          await page.getByRole("button", { name: t("auth.signIn") }).click();
          await page.waitForURL(`${KEYCLOAK_ORIGIN}/**`);
          await page.locator("#kc-form-login").waitFor();
          await expectRendered(page, KEYCLOAK_HEADINGS[locale].signIn);
        });

        await test.step("a route that matches nothing", async () => {
          await page.goto(`/${locale}/no-such-page`);
          await expectRendered(page, t("notFound.generic.title"));
        });

        await test.step("the error page", async () => {
          // A non-numeric page reaches the backend as NaN and is rejected, which
          // is the only way to raise the error boundary without stopping the
          // backend.
          await page.goto(`/${locale}/beers?page=abc`);
          await expectRendered(page, t("error.title"));
          await expect(page.getByRole("button", { name: t("error.retry") })).toBeVisible();
        });
      });

      test("every surface a signed-in visitor can reach renders, empty and populated", async ({
        page,
        request,
        browser,
        baseURL,
      }) => {
        // No hyphens: each is a break opportunity, and only an unbroken
        // username shows whether a title holding it can push the page sideways.
        const prefix = `e2e-tour-${locale}-${viewport.name}`;
        const account = await createFreshAccount(request, prefix, uniqueUsername(prefix).replaceAll("-", ""));

        await page.goto("/en");
        await signIn(page, account);

        await test.step("front page, signed in", async () => {
          await page.goto(`/${locale}`);
          await expectRendered(page, t("app.name"));
          await expectShellTargetsReachable(page);
        });

        await test.step("an empty cellar", async () => {
          await page.goto(`/${locale}/cellar`);
          await expectRendered(page, t("cellar.title"));
          await expect(page.getByText(t("cellar.empty.title"))).toBeVisible();
        });

        await test.step("profile", async () => {
          await page.goto(`/${locale}/profile`);
          await expectRendered(page, account.username);
          await expect(page.getByRole("radio", { name: t("profile.visibility.private") })).toBeChecked();
          await expect(page.getByRole("radio", { name: t("profile.visibility.public") })).toBeVisible();
        });

        // The setup below drives the English pages, whose helpers the other specs share.
        const beerName = await addFirstCatalogBeerToCellar(page);

        await test.step("a populated cellar", async () => {
          await page.goto(`/${locale}/cellar`);
          await expectRendered(page, t("cellar.title"));
          const beer = page.getByRole("region", { name: beerName, exact: true });
          await expect(beer).toBeVisible();
          await expectContained(beer);
          const bottle = t("cellar.bottle.number", { container: t("cellar.bottle.container.BOTTLE"), number: 1 });
          await expect(beer.getByRole("button", { name: t("cellar.bottle.editFor", { bottle, beer: beerName }) })).toBeVisible();
          await expect(beer.getByRole("button", { name: t("cellar.bottle.removeFor", { bottle, beer: beerName }) })).toBeVisible();
        });

        await page.goto("/en");
        await setCellarVisibility(page, "Anyone with the link");

        await test.step("the front page feed", async () => {
          await page.goto(`/${locale}`);
          await expect(
            page
              .getByRole("listitem")
              .filter({ hasText: new RegExp(escapeRegExp(beerName)) })
              .filter({ hasText: account.username })
              .first(),
          ).toBeVisible();
          await expectCoherentHeadings(page);
          await expectNoA11yViolations(page);
        });

        await test.step("a public cellar, as its owner", async () => {
          await page.goto(`/${locale}/cellars/${account.username}`);
          await expectRendered(page, t("cellar.public.heading", { username: account.username }));
          await expect(page.getByText(t("cellar.public.ownerBanner"))).toBeVisible();
        });

        await test.step("a public cellar, as a stranger", async () => {
          const stranger = await browser.newContext({
            baseURL,
            viewport: { width: viewport.width, height: viewport.height },
          });
          try {
            const strangerPage = await stranger.newPage();
            await strangerPage.goto(`/${locale}/cellars/${account.username}`);
            await expectRendered(strangerPage, t("cellar.public.heading", { username: account.username }));
            await expect(strangerPage.getByRole("heading", { level: 2, name: beerName })).toBeVisible();
          } finally {
            await stranger.close();
          }
        });

        await page.goto("/en");
        await setCellarVisibility(page, "Only me");
      });
    });
  }
}
