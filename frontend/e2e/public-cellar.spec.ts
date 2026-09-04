// The full journey in one spec: a cellar made public is readable by a
// signed-out visitor from its link, and made private again it reveals
// nothing. Credentials are the dev-only account in keycloak/realm-export.json.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const USERNAME = "testuser";
const PASSWORD = "testuser123";
const SHARE_URL = `/cellars/${USERNAME}`;
const LOCALE_CELLAR_URL = `/en/cellars/${USERNAME}`;

// Shares the one realm user with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

const scanForA11yViolations = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

const signIn = async (page: Page) => {
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.locator("#username").waitFor();
  await page.locator("#username").fill(USERNAME);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("link", { name: "Profile: Test User" })).toBeVisible();
};

const signOut = async (page: Page) => {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile: Test User" })).toHaveCount(0);
};

// Puts at least one beer in the cellar so the public page has something to
// show, and returns its name. Uses a beer well down the list because
// add-to-cellar.spec asserts exact bottle deltas on the first two catalog
// cards; the suite still shares this one Keycloak account.
const ensureABeerInCellar = async (page: Page): Promise<string> => {
  await page.goto("/en/beers");
  const card = page.getByRole("listitem").nth(6);
  const beerName = (await card.getByRole("heading").textContent())!.trim();

  await card.getByRole("button", { name: "Add to cellar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  return beerName;
};

const setVisibility = async (page: Page, option: "Only me" | "Anyone with the link") => {
  await page.getByRole("link", { name: /^Profile: / }).click();
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  // The toggle is optimistic; wait for the Server Action POST to commit before
  // the test navigates to a page that reads the new value.
  const committed = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/profile") &&
      response.status() === 200,
  );
  await page.getByRole("radio", { name: option }).check();
  const confirmation =
    option === "Anyone with the link"
      ? "Anyone with the link can see your cellar."
      : "Only you can see your cellar.";
  await expect(page.getByText(confirmation)).toBeVisible();
  await committed;
};

test("a public cellar is readable signed-out from its link, and private reveals nothing", async ({
  page,
}) => {
  await page.goto("/en");
  await signIn(page);
  const beerName = await ensureABeerInCellar(page);
  await setVisibility(page, "Anyone with the link");

  // The owner reaches their public cellar from the profile, and is the only
  // caller who sees the "this is how others see it" banner.
  await page.getByRole("link", { name: "View your public cellar" }).click();
  await expect(page).toHaveURL(new RegExp(`${LOCALE_CELLAR_URL}$`));
  await expect(page.getByRole("heading", { level: 1, name: "testuser's cellar" })).toBeVisible();
  await expect(page.getByText("This is how others see your cellar.")).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(beerName) })).toBeVisible();
  expect((await scanForA11yViolations(page)).violations).toEqual([]);

  // A genuine sign-out — not a cleared cookie — then the locale-less share URL
  // with no session: it lands in the reader's own language and shows the
  // beers, with no owner banner.
  await page.goto("/en");
  await signOut(page);
  await page.goto(SHARE_URL);
  await expect(page).toHaveURL(new RegExp(`${LOCALE_CELLAR_URL}$`));
  await expect(page.getByRole("heading", { level: 1, name: "testuser's cellar" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(beerName) })).toBeVisible();
  await expect(page.getByText("This is how others see your cellar.")).toHaveCount(0);
  expect((await scanForA11yViolations(page)).violations).toEqual([]);

  // Back in, back to private: the same URL now answers only "not found", and
  // the beer is gone from the DOM.
  await page.goto("/en");
  await signIn(page);
  await setVisibility(page, "Only me");

  await page.goto(LOCALE_CELLAR_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByText(beerName)).toHaveCount(0);

  // And the same for a signed-out visitor arriving on the share URL.
  await page.goto("/en");
  await signOut(page);
  await page.goto(SHARE_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByText(beerName)).toHaveCount(0);
});
