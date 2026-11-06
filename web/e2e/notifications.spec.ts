// A contributor is told what became of a suggestion. Each test's contributor is a
// fresh account of its own, so the notifications it holds are exactly the ones its
// own journey caused; the queue is shared, so each suggestion has a unique name.
import { request, type Browser, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { tabTo } from "./support/keyboard";
import { createFreshAccount, expect, signIn, test, uniqueUsername, type KeycloakAccount } from "./support/keycloakAccount";

test.describe.configure({ mode: "serial" });

const uniqueName = (prefix: string) => uniqueUsername(prefix).replace(/-/g, " ");

const newContributor = async (): Promise<KeycloakAccount> => {
  const apiRequest = await request.newContext();
  return createFreshAccount(apiRequest, "e2e-notify").finally(() => apiRequest.dispose());
};

const suggest = async (page: Page, name: string, newBrewery?: string) => {
  await page.goto(`/en/beers?query=${encodeURIComponent(name)}`);
  await page.getByRole("main").getByRole("button", { name: "Add a beer" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Brewery" }).fill(newBrewery ?? "Põhjala");
  await dialog.getByRole("option", { name: newBrewery ? /as a new brewery$/ : /^Põhjala/ }).click();
  if (newBrewery) {
    const group = dialog.getByRole("group", { name: "New brewery" });
    await group.getByRole("combobox", { name: "Country" }).selectOption("FI");
    await group.getByRole("textbox", { name: "City (optional)" }).fill("Pori");
  }
  await dialog.getByRole("combobox", { name: "Style" }).selectOption("Porter");
  await dialog.getByRole("textbox", { name: "Strength (ABV %)" }).fill("6.5");
  await dialog.getByRole("button", { name: "Add beer" }).click();
  await expect(dialog).toBeHidden();
};

type Decision = { kind: "editAndApprove"; fixed: string } | { kind: "reject"; reason: string };

/** The admin finds the suggestion in the queue by its unique name and decides it, in a context of their own. */
const decide = async (browser: Browser, baseURL: string | undefined, admin: KeycloakAccount, name: string, decision: Decision) => {
  const context = await browser.newContext({ baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/en");
    await signIn(page, admin);
    await page.goto("/en/admin");
    const queue = page.getByRole("list", { name: "Queue" });
    await expect(queue).toBeVisible();
    const row = queue.getByRole("button", { name: new RegExp(name) });
    for (let attempt = 0; attempt < 20 && (await row.count()) === 0; attempt++) {
      await page.getByRole("link", { name: "Next" }).click();
    }
    await row.click();
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();

    if (decision.kind === "editAndApprove") {
      await page.getByRole("button", { name: "Edit and approve" }).click();
      await page.getByRole("textbox", { name: "Name", exact: true }).fill(decision.fixed);
      await page.getByRole("button", { name: "Save and approve" }).click();
      await expect(page.getByText(/^Approved as edited/)).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Reject", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Do you really want to reject this suggestion?" });
      await dialog.getByRole("radio", { name: decision.reason }).check();
      await dialog.getByRole("button", { name: "Reject suggestion" }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText(/^Rejected: /)).toBeVisible();
    }
  } finally {
    await context.close();
  }
};

const signal = (page: Page, count: number) =>
  page.getByRole("banner").getByRole("button", { name: count === 1 ? "1 unread notification" : `${count} unread notifications` });

test("a contributor sees an edited approval, acknowledges it, and it is gone after a reload", async ({ page, browser, baseURL, adminAccount }) => {
  const contributor = await newContributor();
  const typo = uniqueName("Zzz notify typo");
  const fixed = `${typo} fixed`;
  await page.goto("/en");
  await signIn(page, contributor);
  await expect(page.getByRole("banner").getByRole("button", { name: /unread/ }), "a new account has nothing unread").toHaveCount(0);
  await suggest(page, typo, uniqueName("Zzz notify brewery"));

  await decide(browser, baseURL, adminAccount, typo, { kind: "editAndApprove", fixed });

  await page.goto("/en");
  await signal(page, 1).click();
  const dialog = page.getByRole("dialog", { name: "Notifications" });
  await expect(dialog.getByText("Approved", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Edited", { exact: true })).toBeVisible();
  await expect(dialog.locator("s", { hasText: typo })).toBeVisible();
  await expect(dialog.getByText(fixed, { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "View beer" })).toHaveAttribute("href", /\/en\/beers\/.+/);

  await dialog.getByRole("button", { name: /^Got it/ }).click();
  await expect(dialog.getByText("Nothing new")).toBeVisible();

  await page.goto("/en");
  await expect(page.getByRole("banner").getByRole("button", { name: /unread/ })).toHaveCount(0);
});

test("a contributor sees a rejection with its reason in their own language", async ({ page, browser, baseURL, adminAccount }) => {
  const contributor = await newContributor();
  const name = uniqueName("Zzz notify reject");
  await page.goto("/en");
  await signIn(page, contributor);
  await suggest(page, name);

  await decide(browser, baseURL, adminAccount, name, { kind: "reject", reason: "Not a real beer" });

  // Moving to another page by the app's own links is not a new render of the layout, and the signal still appears.
  await page.getByRole("banner").getByRole("link", { name: "Home" }).first().click();
  await expect(signal(page, 1)).toBeVisible();

  await page.goto("/fi");
  await page.getByRole("banner").getByRole("button", { name: "1 lukematon ilmoitus" }).click();
  const dialog = page.getByRole("dialog", { name: "Ilmoitukset" });
  await expect(dialog.getByText("Ei hyväksytty", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Tämä ei ole oikea olut.")).toBeVisible();
  await expect(dialog.getByRole("link")).toHaveCount(0);

  await dialog.getByRole("button", { name: /^Selvä/ }).click();
  await expect(dialog.getByText("Ei uutta")).toBeVisible();

  await page.goto("/fi");
  await expect(page.getByRole("banner").getByRole("button", { name: /lukematon/ })).toHaveCount(0);
});

test.describe("one contributor holding an approval after an edit and a rejection", () => {
  let contributor: KeycloakAccount;

  test.beforeAll(async ({ browser, baseURL, adminAccount }) => {
    contributor = await newContributor();
    const context = await browser.newContext({ baseURL });
    try {
      const page = await context.newPage();
      await page.goto("/en");
      await signIn(page, contributor);
      const typo = uniqueName("Zzz notify axe typo");
      const rejected = uniqueName("Zzz notify axe reject");
      await suggest(page, typo);
      await suggest(page, rejected);
      await decide(browser, baseURL, adminAccount, typo, { kind: "editAndApprove", fixed: `${typo} fixed` });
      await decide(browser, baseURL, adminAccount, rejected, { kind: "reject", reason: "Not a real beer" });
    } finally {
      await context.close();
    }
  });

  for (const locale of ["en", "fi"] as const) {
    for (const viewport of [
      { name: "phone", width: 375, height: 812 },
      { name: "desktop", width: 1280, height: 800 },
    ]) {
      test(`has no accessibility violations in ${locale} at ${viewport.name} width, closed and open`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto("/en");
        await signIn(page, contributor);
        await page.goto(`/${locale}`);
        const button = page.getByRole("banner").getByRole("button", { name: locale === "en" ? /unread/ : /lukematon/ });
        await expect(button).toBeVisible();
        await expectNoA11yViolations(page);

        await button.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("listitem")).toHaveCount(2);
        await expectNoA11yViolations(page);
      });
    }
  }

  test("is read and closed by keyboard alone, with focus returning to the signal", async ({ page }) => {
    await page.goto("/en");
    await signIn(page, contributor);
    await page.goto("/en");
    const button = page.getByRole("banner").getByRole("button", { name: /unread/ });

    await tabTo(page, button);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Notifications" });
    await expect(dialog).toBeVisible();
    await tabTo(page, dialog.getByRole("button", { name: /^Got it/ }).first());
    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  });
});
