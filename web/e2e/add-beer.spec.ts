// Exercises adding a beer from a search that found nothing (ADR-0082) against
// the compose stack; credentials are a per-worker account provisioned by
// ./support/keycloakAccount.ts.
import type { Page } from "@playwright/test";
import { expect, signIn, test, uniqueUsername } from "./support/keycloakAccount";
import { expectNoA11yViolations } from "./support/a11y";
import { approveContributionsOf } from "./support/moderation";

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

test.beforeAll(({ account }) => {
  approveContributionsOf(account.username);
});

// Every name starts past "Z" or with "Öö", so an added beer never lands among
// the first page's rows that CATALOG_CARD (./support/catalog.ts) indexes.
const uniqueName = (prefix: string) => uniqueUsername(prefix).replace(/-/g, " ");

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

// A full document reload would reset this, so reading it back afterwards is
// what proves the add never navigated away.
const markDocument = async (page: Page) => {
  await page.evaluate(() => {
    (window as unknown as { __sameDocument: boolean }).__sameDocument = true;
  });
  return () =>
    page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument === true);
};

const searchSignedIn = async (page: Page, account: Parameters<typeof signIn>[1], query: string, locale = "en") => {
  // Signed out, a search that found nothing has a second "Sign in" (AddBeerEntry),
  // so sign in on the unfiltered catalog first.
  await page.goto("/en/beers");
  await signIn(page, account);
  await page.goto(`/${locale}/beers?query=${encodeURIComponent(query)}`);
};

const pickBrewery = async (page: Page, typed: string, option: RegExp) => {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Brewery" }).fill(typed);
  await dialog.getByRole("option", { name: option }).click();
};

test("a search that found nothing adds the beer, lands on the search finding it, and goes on to a bottle", async ({
  page,
  account,
}) => {
  const name = `Öö ${uniqueName("Zzz e2e")}`;
  await searchSignedIn(page, account, name);

  const main = page.getByRole("main");
  await expect(main.getByText("Not in the catalog yet? You can add it from here.")).toBeVisible();
  await main.getByRole("button", { name: "Add a beer" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("textbox", { name: "Name" })).toHaveValue(name);

  await pickBrewery(page, "Põhjala", /^Põhjala/);
  // "Öö" shares a word with the name, so the brewery's own Öö is offered before submitting.
  const similar = dialog.getByRole("region", { name: "Põhjala already has" });
  await expect(similar.getByRole("link", { name: "Open Öö", exact: true })).toBeVisible();

  await dialog.getByRole("combobox", { name: "Style" }).selectOption("Imperial Stout");
  await dialog.getByRole("textbox", { name: "Strength (ABV %)" }).fill("11.5");

  const stillSameDocument = await markDocument(page);
  await dialog.getByRole("button", { name: "Add beer" }).click();
  await expect(dialog).toBeHidden();

  await expect(page).toHaveURL(new RegExp(`[?&]query=${encodeURIComponent(name).replace(/%20/g, "(\\+|%20)")}`));
  const row = main.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(row).toBeVisible();
  await expect(row.getByText("Just added")).toBeVisible();
  // exact: Radix also copies the toast's text into its own live-region announcer.
  await expect(page.getByText(`${name} is in the catalog.`, { exact: true })).toBeVisible();
  expect(await stillSameDocument(), "adding the beer reloaded the page").toBe(true);
  await expectNoA11yViolations(page);

  await row.getByRole("button", { name: `Add to cellar: ${name}` }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(row.getByText("1 in your cellar")).toBeVisible();

  await page.goto("/en/cellar");
  await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
});

test("a beer whose brewery the catalog lacks creates the brewery in the same dialog", async ({ page, account }) => {
  const name = uniqueName("Zzz e2e porter");
  const brewery = uniqueName("Zzz e2e brewery");
  await searchSignedIn(page, account, name);

  await page.getByRole("main").getByRole("button", { name: "Add a beer" }).click();
  await pickBrewery(page, brewery, /as a new brewery$/);

  const dialog = page.getByRole("dialog");
  const newBrewery = dialog.getByRole("group", { name: "New brewery" });
  await expect(newBrewery.getByRole("textbox", { name: "Brewery name" })).toHaveValue(brewery);
  await newBrewery.getByRole("combobox", { name: "Country" }).selectOption("FI");
  await newBrewery.getByRole("textbox", { name: "City (optional)" }).fill("Pori");
  await dialog.getByRole("combobox", { name: "Style" }).selectOption("Porter");
  await dialog.getByRole("textbox", { name: "Strength (ABV %)" }).fill("6.5");
  await dialog.getByRole("button", { name: "Add beer" }).click();
  await expect(dialog).toBeHidden();

  const row = page.getByRole("main").getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(row.getByText(brewery)).toBeVisible();

  await row.getByRole("heading").getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("Pori, Finland").first()).toBeVisible();
});

test("a beer whose name the search would bury past its first page lands on its own page", async ({ page, account }) => {
  const brewery = uniqueName("Zzz e2e brewery");
  await searchSignedIn(page, account, `${brewery} IPA`);

  await page.getByRole("main").getByRole("button", { name: "Add a beer" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Name" }).fill("IPA");
  await pickBrewery(page, brewery, /as a new brewery$/);
  await dialog.getByRole("group", { name: "New brewery" }).getByRole("combobox", { name: "Country" }).selectOption("FI");
  await dialog.getByRole("combobox", { name: "Style" }).selectOption("IPA");
  await dialog.getByRole("textbox", { name: "Strength (ABV %)" }).fill("6");
  const stillSameDocument = await markDocument(page);
  await dialog.getByRole("button", { name: "Add beer" }).click();

  await expect(page).toHaveURL(/\/en\/beers\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "IPA", exact: true })).toBeVisible();
  await expect(page.getByText(brewery).first()).toBeVisible();
  await expect(page.getByText("IPA is in the catalog.", { exact: true })).toBeVisible();
  await expect(page.getByRole("main")).toBeFocused();
  expect(await stillSameDocument(), "adding the beer reloaded the page").toBe(true);
  await expectNoA11yViolations(page);
});

test("a duplicate says the beer is already in the catalog and links to it", async ({ page, account }) => {
  await searchSignedIn(page, account, "öö");

  await page.getByRole("main").getByRole("button", { name: "Add a beer" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Name" }).fill("öö");
  await pickBrewery(page, "Põhjala", /^Põhjala/);
  await dialog.getByRole("combobox", { name: "Style" }).selectOption("Imperial Stout");
  await dialog.getByRole("textbox", { name: "Strength (ABV %)" }).fill("10.5");
  await dialog.getByRole("button", { name: "Add beer" }).click();

  const duplicate = dialog.getByRole("alert");
  await expect(duplicate).toContainText("Öö (Põhjala) is already in the catalog.");
  await duplicate.getByRole("link", { name: "Open Öö", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Öö", exact: true })).toBeVisible();
});

for (const viewport of VIEWPORTS) {
  test.describe(`adding a beer, ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("signed out, the empty search invites signing in and passes axe", async ({ page }) => {
      for (const locale of ["en", "fi"] as const) {
        await page.goto(`/${locale}/beers?query=${encodeURIComponent(uniqueName("Zzz e2e"))}`);
        await expect(
          page.getByRole("main").getByRole("button", { name: locale === "en" ? "Sign in" : "Kirjaudu sisään" }),
        ).toBeVisible();
        await expect(page.getByRole("main").getByRole("button", { name: locale === "en" ? "Add a beer" : "Lisää olut" })).toHaveCount(0);
        await expectNoA11yViolations(page);
      }
    });

    test("every state of the dialog passes axe in both locales", async ({ page, account }) => {
      await page.goto("/en/beers");
      await signIn(page, account);
      for (const locale of ["en", "fi"] as const) {
        const en = locale === "en";
        const name = `Öö ${uniqueName("Zzz e2e")}`;
        await page.goto(`/${locale}/beers?query=${encodeURIComponent(name)}`);
        await expectNoA11yViolations(page);

        await page.getByRole("main").getByRole("button", { name: en ? "Add a beer" : "Lisää olut" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("textbox", { name: en ? "Name" : "Nimi" })).toBeVisible();
        await expectNoA11yViolations(page);

        await dialog.getByRole("textbox", { name: en ? "Name" : "Nimi" }).fill("");
        await dialog.getByRole("button", { name: en ? "Add beer" : "Lisää olut" }).click();
        await expect(dialog.getByRole("textbox", { name: en ? "Name" : "Nimi" })).toHaveAttribute("aria-invalid", "true");
        await expectNoA11yViolations(page);

        await dialog.getByRole("textbox", { name: en ? "Name" : "Nimi" }).fill("Öö");
        await dialog.getByRole("combobox", { name: en ? "Brewery" : "Panimo" }).fill("Põhjala");
        await expect(dialog.getByRole("option").first()).toBeVisible();
        await expectNoA11yViolations(page);
        await dialog.getByRole("option", { name: /^Põhjala/ }).click();
        await expect(
          dialog.getByRole("region", { name: en ? "Põhjala already has" : "Panimolta Põhjala löytyy jo" }).getByRole("link").first(),
        ).toBeVisible();
        await expectNoA11yViolations(page);

        await dialog.getByRole("combobox", { name: en ? "Style" : "Tyyli" }).selectOption("Imperial Stout");
        await dialog.getByRole("textbox", { name: en ? "Strength (ABV %)" : "Alkoholipitoisuus (%)" }).fill(en ? "10.5" : "10,5");
        await dialog.getByRole("button", { name: en ? "Add beer" : "Lisää olut" }).click();
        await expect(dialog.getByRole("alert")).toBeVisible();
        await expectNoA11yViolations(page);

        await dialog.getByRole("textbox", { name: en ? "Name" : "Nimi" }).fill(name);
        await dialog.getByRole("button", { name: en ? "Add beer" : "Lisää olut" }).click();
        await expect(dialog).toBeHidden();
        await expect(page.getByRole("main").getByRole("heading", { name, exact: true })).toBeVisible();
        await expectNoA11yViolations(page);
      }
    });
  });
}
