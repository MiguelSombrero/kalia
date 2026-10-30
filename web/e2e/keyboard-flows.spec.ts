// Three journeys driven by keyboard alone at the phone width in both locales
// (ADR-0075): every stop on the way must hold focus somewhere visible, never
// under the sticky header, the feed's "N new" control or a toast (WCAG 2.2,
// 2.4.11). Accounts are created per test, so each flow starts from an empty,
// private cellar of its own.
import { expectNoA11yViolations } from "./support/a11y";
import { copyFor, LOCALES } from "./support/copy";
import { expectFocusNotObscured, tabTo } from "./support/keyboard";
import { createFreshAccount, expect, signIn, test, uniqueUsername } from "./support/keycloakAccount";
import { KEYCLOAK_ORIGIN } from "./support/origins";
import { escapeRegExp } from "./support/text";
import { setCellarVisibility } from "./support/visibility";

test.use({ viewport: { width: 375, height: 812 }, screenshot: "off", trace: "off", video: "off" });

for (const locale of LOCALES) {
  const t = copyFor(locale);

  test.describe(`keyboard alone, ${locale}`, () => {
    // Public cellar links carry no locale (ADR-0050): the browser's language picks the page's.
    test.use({ locale: locale === "fi" ? "fi-FI" : "en-GB" });

    test("flow 1: search, open a beer, add it to the cellar, see it there, remove it", async ({
      page,
      request,
    }) => {
      const account = await createFreshAccount(request, `e2e-keys-1-${locale}`);
      await page.goto("/en");
      await signIn(page, account);
      await page.goto(`/${locale}/beers`);
      const beerName = (await page.getByRole("heading", { level: 2 }).nth(2).textContent())!.trim();
      await page.goto(`/${locale}`);

      await test.step("the phone menu leads to the catalog", async () => {
        const menu = page.getByRole("button", { name: t("nav.menu") });
        await tabTo(page, menu);
        await page.keyboard.press("Enter");
        await expect(page.getByRole("button", { name: t("nav.closeMenu") })).toHaveAttribute("aria-expanded", "true");
        await tabTo(page, page.getByRole("navigation", { name: t("nav.label") }).getByRole("link", { name: t("nav.catalog") }));
        await page.keyboard.press("Enter");
        await expect(page.getByRole("heading", { level: 1, name: t("catalog.title") })).toBeVisible();
      });

      await test.step("the filter fold opens from the keyboard", async () => {
        const fold = page.locator("summary", { hasText: t("catalog.filters.toggle") });
        await tabTo(page, fold);
        await page.keyboard.press("Enter");
        await expect(page.getByRole("textbox", { name: t("catalog.filters.styleLabel") })).toBeVisible();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("textbox", { name: t("catalog.filters.styleLabel") })).toBeHidden();
      });

      await test.step("search for the beer", async () => {
        await tabTo(page, page.getByRole("searchbox", { name: t("catalog.filters.searchLabel") }), { backwards: true });
        await page.keyboard.type(beerName);
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/query=/);
      });

      await test.step("open it", async () => {
        await tabTo(page, page.getByRole("link", { name: beerName, exact: true }));
        await page.keyboard.press("Enter");
        await expect(page.getByRole("heading", { level: 1, name: beerName })).toBeVisible();
      });

      await test.step("add it to the cellar", async () => {
        await tabTo(page, page.getByRole("button", { name: t("cellar.add.action"), exact: true }));
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expectNoA11yViolations(page);
        await tabTo(page, dialog.getByRole("button", { name: t("cellar.add.submit"), exact: true }));
        await page.keyboard.press("Enter");
        await expect(dialog).toBeHidden();
        await expectFocusNotObscured(page);
      });

      await test.step("see it in the cellar", async () => {
        await tabTo(page, page.getByRole("link", { name: t("beer.openInCellar") }));
        await page.keyboard.press("Enter");
        await expect(page.getByRole("heading", { level: 1, name: t("cellar.title") })).toBeVisible();
        await expect(page.getByRole("region", { name: beerName, exact: true })).toBeVisible();
      });

      await test.step("the cellar's sort changes from the keyboard", async () => {
        await tabTo(page, page.getByRole("combobox", { name: t("cellar.sort.label") }));
        // Chromium on macOS opens a native select's popup on ArrowDown instead
        // of moving the choice; typing the start of an option's name selects
        // it on every platform.
        await page.keyboard.type(t("cellar.sort.style").slice(0, 2));
        await expect(page).toHaveURL(/sort=style/);
      });

      await test.step("remove it", async () => {
        const bottle = t("cellar.bottle.number", { container: t("cellar.bottle.container.BOTTLE"), number: 1 });
        await tabTo(page, page.getByRole("button", { name: t("cellar.bottle.removeFor", { bottle, beer: beerName }) }));
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await tabTo(page, dialog.getByRole("button", { name: t("cellar.bottle.remove.confirm"), exact: true }));
        await page.keyboard.press("Enter");
        // Radix announces a toast through a second, visually hidden copy of its text.
        await expect(page.getByText(t("cellar.bottle.remove.toastLastBottle")).first()).toBeVisible();
        await expect(page.getByRole("region", { name: beerName, exact: true })).toBeHidden();
        await expectNoA11yViolations(page);
        await expectFocusNotObscured(page);
      });
    });

    test("flow 2: sign in, open the profile, make the cellar public, open it", async ({ page, request }) => {
      const account = await createFreshAccount(request, `e2e-keys-2-${locale}`);
      await page.goto(`/${locale}`);

      await test.step("sign in", async () => {
        await tabTo(page, page.getByRole("button", { name: t("auth.signIn") }));
        await page.keyboard.press("Enter");
        await page.waitForURL(`${KEYCLOAK_ORIGIN}/**`);
        await tabTo(page, page.locator("#username"));
        await page.keyboard.type(account.username);
        await tabTo(page, page.locator("#password"));
        await page.keyboard.type(account.password);
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      });

      await test.step("open the profile", async () => {
        await tabTo(page, page.getByRole("link", { name: t("auth.profileLink", { name: account.username }) }));
        await page.keyboard.press("Enter");
        await expect(page.getByRole("heading", { level: 1, name: account.username })).toBeVisible();
      });

      await test.step("make the cellar public", async () => {
        await tabTo(page, page.getByRole("radio", { name: t("profile.visibility.private") }));
        await page.keyboard.press("ArrowDown");
        await expect(page.getByRole("button", { name: t("profile.visibility.confirm.publish") })).toBeVisible();
        await expectFocusNotObscured(page);
        await tabTo(page, page.getByRole("button", { name: t("profile.visibility.confirm.publish") }));
        await page.keyboard.press("Enter");
        await expect(page.getByText(t("profile.visibility.saved.public")).first()).toBeVisible();
        const toast = await page.locator("[data-toast]").boundingBox();
        expect(toast?.x, "the toast starts off the left edge").toBeGreaterThanOrEqual(0);
        expect((toast?.x ?? 0) + (toast?.width ?? 0), "the toast ends off the right edge").toBeLessThanOrEqual(375);
        await expectNoA11yViolations(page);
      });

      await test.step("open the public cellar", async () => {
        await tabTo(page, page.getByRole("link", { name: t("profile.visibility.address.openLabel") }));
        await page.keyboard.press("Enter");
        await expect(
          page.getByRole("heading", { level: 1, name: t("cellar.public.heading", { username: account.username }) }),
        ).toBeVisible();
      });
    });

    test("flow 3: take in new entries on the front page, follow a username to that cellar", async ({
      page: watcher,
      browser,
      request,
    }) => {
      // Waits out at least one real poll (LIVE_POLL_INTERVAL_MS) for the control to appear.
      test.setTimeout(90_000);
      const actorAccount = await createFreshAccount(request, `e2e-keys-3-${locale}`);
      const actorContext = await browser.newContext();
      try {
        const actor = await actorContext.newPage();
        await actor.goto("/en");
        await signIn(actor, actorAccount);
        await setCellarVisibility(actor, "Anyone with the link");

        // One locale walks this with reduced motion asked for, so the new
        // entry's highlight is seen both running and held still.
        const reducedMotion = locale === "fi" ? "reduce" : "no-preference";
        await watcher.emulateMedia({ reducedMotion });
        await watcher.goto(`/${locale}`);
        const feed = watcher.getByRole("region", { name: t("feed.heading") });
        const feedLinks = feed.getByRole("link");

        await test.step("tab down into the feed", async () => {
          const depth = Math.min(await feedLinks.count(), 30);
          if (depth > 0) await tabTo(watcher, feedLinks.nth(depth - 1));
        });

        await actor.goto("/en/beers");
        const card = actor.getByRole("listitem").nth(4);
        const beerName = (await card.getByRole("heading").textContent())!.trim();
        await card.getByRole("button", { name: "Add to cellar" }).click();
        await actor.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
        await expect(actor.getByRole("dialog")).toBeHidden();

        // Other specs add to the same feed meanwhile, so the count is not known.
        const counted = [1, 2].map((count) =>
          escapeRegExp(t("feed.live.newEvents", { count })).replace(String(count), "\\d+"),
        );
        const control = watcher.getByRole("button", { name: new RegExp(`^(${counted.join("|")})$`) });
        await test.step("tab back up to the new-entries control", async () => {
          await expect(control).toBeVisible({ timeout: 45_000 });
          await tabTo(watcher, control, { backwards: true });
          await watcher.keyboard.press("Enter");
          await expect(control).toBeHidden();
          await expectFocusNotObscured(watcher);
        });

        await test.step("follow the username to that person's cellar", async () => {
          const line = feed
            .getByRole("listitem")
            .filter({ hasText: new RegExp(escapeRegExp(beerName)) })
            .filter({ hasText: actorAccount.username })
            .first();
          await expect(line).toBeVisible();
          expect(await line.evaluate((row) => getComputedStyle(row).animationName), reducedMotion).toBe(
            reducedMotion === "reduce" ? "none" : "feed-reveal",
          );
          await tabTo(watcher, line.getByRole("link", { name: actorAccount.username }));
          await watcher.keyboard.press("Enter");
          await expect(
            watcher.getByRole("heading", {
              level: 1,
              name: t("cellar.public.heading", { username: actorAccount.username }),
            }),
          ).toBeVisible();
        });
      } finally {
        await actorContext.close();
      }
    });
  });
}

test("tabbing back up a long list keeps each focused control out from under the sticky header", async ({ page }) => {
  const t = copyFor("en");
  await page.goto("/en/beers");
  const beers = page.getByRole("main").getByRole("listitem");
  await tabTo(page, page.getByRole("navigation", { name: t("catalog.pagination.label") }).getByRole("link").last(), {
    limit: 120,
  });
  await tabTo(page, beers.first().getByRole("link").first(), { backwards: true, limit: 120 });
});

for (const locale of LOCALES) {
  const t = copyFor(locale);

  test(`keyboard alone, ${locale}, flow 4: a search that found nothing adds the beer`, async ({ page, account }) => {
    const name = `Öö ${uniqueUsername("Zzz e2e keys").replace(/-/g, " ")}`;
    await page.goto("/en/beers");
    await signIn(page, account);
    await page.goto(`/${locale}/beers?query=${encodeURIComponent(name)}`);

    await test.step("open the dialog from the empty search", async () => {
      await tabTo(page, page.getByRole("main").getByRole("button", { name: t("catalog.add.action") }));
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog").getByRole("textbox", { name: t("catalog.add.name") })).toHaveValue(name);
    });

    const dialog = page.getByRole("dialog");
    await test.step("pick the brewery from its list", async () => {
      await tabTo(page, dialog.getByRole("combobox", { name: t("catalog.add.brewery") }));
      await page.keyboard.type("Põhjala");
      // Until the search answers, the one option is adding the typed name as a new brewery.
      await expect(dialog.getByRole("option").first()).toHaveAccessibleName(/^Põhjala/);
      await page.keyboard.press("Enter");
      await expect(
        dialog.getByRole("region", { name: t("catalog.add.similarHeading", { brewery: "Põhjala" }) }).getByRole("link").first(),
      ).toBeVisible();
    });

    await test.step("fill the rest and send it", async () => {
      await tabTo(page, dialog.getByRole("combobox", { name: t("catalog.add.style") }));
      await page.keyboard.type("Imperial S");
      await tabTo(page, dialog.getByRole("textbox", { name: t("catalog.add.abv") }));
      await page.keyboard.type(locale === "fi" ? "11,5" : "11.5");
      await tabTo(page, dialog.getByRole("button", { name: t("catalog.add.submit"), exact: true }));
      await page.keyboard.press("Enter");
      await expect(dialog).toBeHidden();
    });

    await test.step("land on the search finding it, focus still on the page", async () => {
      await expect(page.getByRole("main").getByRole("heading", { name, exact: true })).toBeVisible();
      await expectFocusNotObscured(page);
      await expectNoA11yViolations(page);
    });
  });
}
