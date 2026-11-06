// The queue is shared by every worker and every run, so each test finds its own
// suggestion by a name no one else has, made by a contributor account of its own.
import { request, type Browser, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { createFreshAccount, expect, signIn, test, uniqueUsername } from "./support/keycloakAccount";

test.describe.configure({ mode: "serial" });

const uniqueName = (prefix: string) => uniqueUsername(prefix).replace(/-/g, " ");

type Suggestion = { name: string; newBrewery?: string };

const suggest = async (browser: Browser, baseURL: string | undefined, { name, newBrewery }: Suggestion) => {
  const apiRequest = await request.newContext();
  const account = await createFreshAccount(apiRequest, "e2e-review").finally(() => apiRequest.dispose());
  const context = await browser.newContext({ baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/en/beers");
    await signIn(page, account);
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
  } finally {
    await context.close();
  }
};

const openSuggestion = async (page: Page, name: string) => {
  await page.goto("/en/admin");
  const queue = page.getByRole("list", { name: "Queue" });
  // The queue streams in below the title, after the document has loaded.
  await expect(queue).toBeVisible();
  const row = queue.getByRole("button", { name: new RegExp(name) });
  for (let attempt = 0; attempt < 20 && (await row.count()) === 0; attempt++) {
    await page.getByRole("link", { name: "Next" }).click();
  }
  await row.click();
  await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
};

const catalogShows = async (page: Page, name: string) => {
  await page.goto(`/en/beers?query=${encodeURIComponent(name)}`);
  // The results stream in after the document loads.
  await page.waitForLoadState("networkidle");
  return page.getByRole("heading", { name, exact: true }).count();
};

test.beforeEach(async ({ page, adminAccount }) => {
  await page.goto("/en");
  await signIn(page, adminAccount);
});

test("approves a suggestion that came with a new brewery, beer and brewery together", async ({ page, browser, baseURL }) => {
  const name = uniqueName("Zzz review approve");
  const brewery = uniqueName("Zzz review brewery");
  await suggest(browser, baseURL, { name, newBrewery: brewery });

  await openSuggestion(page, name);
  await expect(page.locator("dd", { hasText: brewery })).toBeVisible();
  await page.getByRole("button", { name: "Approve beer and brewery" }).click();

  await expect(page.getByText(`Approved. ${name} and ${brewery} are in the catalog.`)).toBeVisible();
  expect(await catalogShows(page, name), "the approved beer is in the catalog").toBe(1);
});

test("rejects a suggestion, asking first and for a reason", async ({ page, browser, baseURL }) => {
  const name = uniqueName("Zzz review reject");
  await suggest(browser, baseURL, { name });

  await openSuggestion(page, name);
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Do you really want to reject this suggestion?" });
  await expect(dialog.getByRole("button", { name: "Reject suggestion" })).toBeDisabled();
  await expectNoA11yViolations(page);
  await dialog.getByRole("radio", { name: "Not a real beer" }).check();
  await dialog.getByRole("button", { name: "Reject suggestion" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("Rejected: Not a real beer.")).toBeVisible();
  await expect(page.getByText(`Rejected ${name}.`, { exact: true })).toBeVisible();
  expect(await catalogShows(page, name), "a rejected beer is withheld").toBe(0);
});

test("edits a suggestion and approves it in one action", async ({ page, browser, baseURL }) => {
  const typo = uniqueName("Zzz review typo");
  const fixed = `${typo} fixed`;
  await suggest(browser, baseURL, { name: typo });

  await openSuggestion(page, typo);
  await page.getByRole("button", { name: "Edit and approve" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill(fixed);
  await expect(page.getByText(`Suggested: ${typo}`)).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Save and approve" }).click();

  await expect(page.getByText(`Approved as edited. The contributor sees “${fixed}”.`)).toBeVisible();
  expect(await catalogShows(page, fixed), "the corrected beer is in the catalog").toBe(1);
  expect(await catalogShows(page, typo + "$"), "the suggested spelling is not").toBe(0);
});

for (const locale of ["en", "fi"] as const) {
  for (const viewport of [
    { name: "phone", width: 375, height: 812 },
    { name: "desktop", width: 1280, height: 800 },
  ]) {
    test(`has no accessibility violations in ${locale} at ${viewport.name} width, in each state`, async ({ page, browser, baseURL }) => {
      await page.setViewportSize(viewport);
      const name = uniqueName(`Zzz review axe ${locale} ${viewport.name}`);
      await suggest(browser, baseURL, { name, newBrewery: uniqueName("Zzz review axe brewery") });
      const labels = locale === "en"
        ? { edit: "Edit and approve", reject: "Reject", approve: "Approve beer and brewery", back: "Back to the queue" }
        : { edit: "Muokkaa ja hyväksy", reject: "Hylkää", approve: "Hyväksy olut ja panimo", back: "Takaisin jonoon" };

      await page.goto(`/${locale}/admin`);
      await expect(page.getByRole("list", { name: locale === "en" ? "Queue" : "Jono" })).toBeVisible();
      const row = page.getByRole("button", { name: new RegExp(name) });
      for (let attempt = 0; attempt < 20 && (await row.count()) === 0; attempt++) {
        await page.getByRole("link", { name: locale === "en" ? "Next" : "Seuraava" }).click();
      }
      await row.click();
      await expect(page.getByRole("button", { name: labels.approve })).toBeVisible();
      await expectNoA11yViolations(page);

      await page.getByRole("button", { name: labels.reject, exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectNoA11yViolations(page);
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: labels.edit }).click();
      await expect(page.getByRole("button", { name: locale === "en" ? "Save and approve" : "Tallenna ja hyväksy" })).toBeVisible();
      await expectNoA11yViolations(page);
    });
  }
}
