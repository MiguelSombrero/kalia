// Exercises add-to-cellar against the compose stack, from both places the
// affordance appears; credentials are the dev-only account in
// keycloak/realm-export.json.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const USERNAME = "testuser";
const PASSWORD = "testuser123";

// Shares the one realm user with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

const signIn = async (page: Page) => {
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.locator("#username").waitFor();
  await page.locator("#username").fill(USERNAME);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("link", { name: "Profile: Test User" })).toBeVisible();
};

// 0 when the beer is not in the cellar at all, so the spec is a delta against
// whatever earlier runs left behind rather than an absolute count.
const bottleCount = async (page: Page, beerName: string): Promise<number> => {
  await page.goto("/en/cellar");
  await expect(page.getByRole("heading", { name: "My cellar" })).toBeVisible();
  const row = page.getByRole("button", { name: new RegExp(escapeRegExp(beerName)) });
  if ((await row.count()) === 0) {
    return 0;
  }
  const label = (await row.first().textContent()) ?? "";
  return Number(/(\d+)\s+bottles?/.exec(label)?.[1] ?? 0);
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A full document reload would reset this, so reading it back afterwards is
// what proves the add never navigated away.
const markDocument = async (page: Page) => {
  await page.evaluate(() => {
    (window as unknown as { __sameDocument: boolean }).__sameDocument = true;
  });
  return () =>
    page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument === true);
};

const addBottles = async (page: Page, quantity: number) => {
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let added = 1; added < quantity; added += 1) {
    await page.getByRole("button", { name: "One more" }).click();
  }
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
};

test("signs in, adds bottles from the list and the detail page, and sees both in the cellar", async ({
  page,
}) => {
  await page.goto("/en/beers");
  await signIn(page);
  await page.goto("/en/beers");

  const cards = page.getByRole("listitem");
  const listBeer = (await cards.nth(0).getByRole("heading").textContent())!.trim();
  const detailBeer = (await cards.nth(1).getByRole("heading").textContent())!.trim();
  expect(listBeer).not.toEqual(detailBeer);

  const listBefore = await bottleCount(page, listBeer);
  const detailBefore = await bottleCount(page, detailBeer);

  await page.goto("/en/beers");
  const stillSameDocument = await markDocument(page);
  await cards.nth(0).getByRole("button", { name: "Add to cellar" }).click();
  await addBottles(page, 2);
  expect(await stillSameDocument(), "adding from the list reloaded the page").toBe(true);

  await cards.nth(1).getByRole("heading").getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name: detailBeer })).toBeVisible();
  await page.getByRole("button", { name: "Add to cellar" }).click();
  await addBottles(page, 1);

  expect(await bottleCount(page, listBeer)).toBe(listBefore + 2);
  expect(await bottleCount(page, detailBeer)).toBe(detailBefore + 1);

  // Edit one of the bottles just added, then remove another — continuing
  // the same signed-in session rather than a separate spec.
  await page.goto("/en/cellar");
  await page.getByRole("button", { name: new RegExp(escapeRegExp(listBeer)) }).click();
  const bottleList = page.getByRole("list", {
    name: new RegExp(`Bottles of ${escapeRegExp(listBeer)}`),
  });
  await expect(bottleList).toBeVisible();

  await bottleList.getByRole("button", { name: "Edit" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Container").selectOption("CAN");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(bottleList.getByText("Can")).toBeVisible();

  // bottleCount() navigates to /en/cellar itself, collapsing the row again.
  const beforeRemove = await bottleCount(page, listBeer);
  await page.getByRole("button", { name: new RegExp(escapeRegExp(listBeer)) }).click();
  await expect(bottleList).toBeVisible();
  await bottleList.getByRole("button", { name: "Remove" }).first().click();
  // exact: true — Radix Toast also mirrors the text into an off-screen
  // role="status" region ("Notification Bottle removed.Undo"), which a
  // substring match picks up as a second element once it populates.
  await expect(page.getByText("Bottle removed.", { exact: true })).toBeVisible();
  // No shorter way to prove the DELETE only fires once the undo window
  // (~5s) genuinely elapses rather than firing immediately.
  await page.waitForTimeout(5500);
  await expect(page.getByText("Bottle removed.", { exact: true })).toBeHidden();
  expect(await bottleCount(page, listBeer)).toBe(beforeRemove - 1);

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("the open add-to-cellar dialog has no accessibility violations", async ({ page }) => {
  await page.goto("/en/beers");
  await signIn(page);
  await page.goto("/en/beers");

  await page.getByRole("listitem").first().getByRole("button", { name: "Add to cellar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);

  // Every enabled control reachable by Tab, and focus never escaping the
  // dialog — the half of the modal contract jsdom cannot exercise.
  const focusedControl = () =>
    page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      // `||`, not `??`: a button's `id` is "" rather than null, which would
      // swallow the textContent that actually names it.
      const label =
        active?.getAttribute("aria-label") || active?.id || active?.textContent?.trim() || "";
      return { label, insideDialog: Boolean(active?.closest('[role="dialog"]')) };
    });

  // Opening focuses the first field rather than the dialog box itself, so the
  // container select is reached without a Tab and the loop starts past it.
  const reached = new Set<string>([(await focusedControl()).label]);
  // A date input is several native tab stops (day, month, year), so this many
  // presses is what it takes to walk one dialog end to end.
  for (let press = 0; press < 12; press += 1) {
    await page.keyboard.press("Tab");
    const focused = await focusedControl();
    expect(focused.insideDialog, "Tab moved focus out of the open dialog").toBe(true);
    reached.add(focused.label);
  }

  const labels = [...reached];
  for (const control of ["containerType", "brewedDate", "bestBeforeDate", "quantity"]) {
    expect(labels.some((label) => label.endsWith(control)), `${control} was never focused`).toBe(
      true,
    );
  }
  // "One fewer" is deliberately absent: it is disabled at quantity 1, and a
  // disabled control is correctly not a tab stop.
  expect(labels).toEqual(expect.arrayContaining(["One more", "Cancel", "Add"]));

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

// The catalog stays public, so the button is shown signed-out too: clicking it
// has to reach Keycloak and come back to the beer it was clicked on.
test("a signed-out visitor is sent through sign-in and returns to the same beer", async ({
  page,
}) => {
  await page.goto("/en/beers");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

  const card = page.getByRole("listitem").first();
  const beerName = (await card.getByRole("heading").textContent())!.trim();
  await card.getByRole("button", { name: "Add to cellar" }).click();

  await page.locator("#username").fill(USERNAME);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/en\/beers\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: beerName })).toBeVisible();
});
