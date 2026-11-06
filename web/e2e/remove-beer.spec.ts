// An admin removes an approved beer from its own page and it is withheld
// (ADR-0091, ADR-0101) — against the compose stack, through the edge. The beer
// is made here: a contributor suggests it and the admin approves it through the
// admin API, so no imported beer, which other specs search for, is touched.
import { request, type Page } from "@playwright/test";
import Redis from "ioredis";
import { expectNoA11yViolations } from "./support/a11y";
import { BACKEND_ORIGIN } from "./support/origins";
import {
  createFreshAccount,
  expect,
  signIn,
  test as baseTest,
  uniqueUsername,
  type KeycloakAccount,
} from "./support/keycloakAccount";
import { VALKEY_URL } from "./support/valkey";

// A contributor of its own per run: the backend caps waiting suggestions per
// account (ADR-0102), and a worker account would carry them into the next run.
const test = baseTest.extend<object, { contributor: KeycloakAccount }>({
  contributor: [
    async ({}, use) => {
      const apiRequest = await request.newContext();
      let contributor: KeycloakAccount;
      try {
        contributor = await createFreshAccount(apiRequest, "e2e-remove-beer");
      } finally {
        await apiRequest.dispose();
      }
      await use(contributor);
    },
    { scope: "worker" },
  ],
});

test.describe.configure({ mode: "serial" });

const COPY = {
  en: {
    trigger: "Remove from catalog",
    title: "Remove this beer?",
    confirm: "Remove beer",
    notice: (name: string) => `${name} was removed from the catalog.`,
    notFound: "Beer not found",
    noMatches: "No beers match your search.",
  },
  fi: {
    trigger: "Poista luettelosta",
    title: "Poistetaanko tämä olut?",
    confirm: "Poista olut",
    notice: (name: string) => `${name} poistettiin luettelosta.`,
    notFound: "Olutta ei löytynyt",
    noMatches: "Hakuehdoilla ei löytynyt oluita.",
  },
} as const;

// The token the web holds for the signed-in page: it passes the backend's own
// checks, so a spec can act as that account without a second sign-in route.
const accessTokenOf = async (page: Page): Promise<string> => {
  const cookies = await page.context().cookies();
  const sessionToken = cookies.find((cookie) => cookie.name === "authjs.session-token")?.value;
  expect(sessionToken, "the page carries no Auth.js session cookie").toBeTruthy();
  const valkey = new Redis(VALKEY_URL);
  try {
    const stored = JSON.parse((await valkey.get(`auth:session-account:${sessionToken}`))!) as { access_token: string };
    return stored.access_token;
  } finally {
    await valkey.quit();
  }
};

const signedInPage = async (browser: import("@playwright/test").Browser, account: KeycloakAccount) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/en");
  await signIn(page, account);
  return { context, page };
};

test("an admin removes an approved beer from its page, and it is withheld from then on", async ({
  browser,
  request: api,
  contributor,
  adminAccount,
}) => {
  const name = `Zzz ${uniqueUsername("e2e remove").replace(/-/g, " ")}`;

  const { context: contributorContext, page: contributorPage } = await signedInPage(browser, contributor);
  const { context: adminContext, page } = await signedInPage(browser, adminAccount);
  try {
    const contributorHeaders = { Authorization: `Bearer ${await accessTokenOf(contributorPage)}` };
    const adminHeaders = { Authorization: `Bearer ${await accessTokenOf(page)}` };

    const breweries = await api.get(`${BACKEND_ORIGIN}/api/v1/breweries?size=1`);
    const [brewery] = ((await breweries.json()) as { content: { id: string }[] }).content;
    const styles = (await (await api.get(`${BACKEND_ORIGIN}/api/v1/styles`)).json()) as string[];
    const suggested = await api.post(`${BACKEND_ORIGIN}/api/v1/beers`, {
      headers: contributorHeaders,
      data: { name, style: styles[0], abv: 5.5, breweryId: brewery.id },
    });
    expect(suggested.status(), "the contributor could not suggest the beer").toBe(201);
    const { id } = (await suggested.json()) as { id: string };
    const approved = await api.post(`${BACKEND_ORIGIN}/api/v1/admin/suggestions/${id}/approval`, { headers: adminHeaders });
    expect(approved.status(), "the admin could not approve the suggestion").toBe(200);

    await contributorPage.goto(`/en/beers/${id}`);
    await expect(contributorPage.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(contributorPage.getByRole("button", { name: COPY.en.trigger })).toHaveCount(0);

    for (const locale of ["fi", "en"] as const) {
      const copy = COPY[locale];
      await page.goto(`/${locale}/beers/${id}`);
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expectNoA11yViolations(page);

      await page.getByRole("button", { name: copy.trigger }).click();
      const dialog = page.getByRole("alertdialog", { name: copy.title });
      await expect(dialog).toContainText(name);
      await expectNoA11yViolations(page);

      if (locale === "fi") {
        await dialog.getByRole("button", { name: "Peruuta" }).click();
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole("button", { name: copy.trigger })).toBeFocused();
      }
    }

    await page.getByRole("alertdialog", { name: COPY.en.title }).getByRole("button", { name: COPY.en.confirm }).click();

    await expect(page).toHaveURL(/\/en\/beers$/);
    await expect(page.getByText(COPY.en.notice(name), { exact: true })).toBeVisible();
    expect(page.url(), "the notice is not kept in the URL").not.toContain("removed");
    await expectNoA11yViolations(page);

    await page.goto(`/en/beers?query=${encodeURIComponent(name)}`);
    await expect(page.getByText(COPY.en.noMatches)).toBeVisible();
    await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);

    // The page streams behind its loading skeleton, so the not-found page it ends
    // on is sent with a 200, as it is for any unknown beer; the API answers the 404.
    expect((await api.get(`${BACKEND_ORIGIN}/api/v1/beers/${id}`)).status(), "the API still serves the beer").toBe(404);
    for (const locale of ["en", "fi"] as const) {
      await page.goto(`/${locale}/beers/${id}`);
      await expect(page.getByRole("heading", { level: 1, name: COPY[locale].notFound })).toBeVisible();
      await expectNoA11yViolations(page);
    }
  } finally {
    await Promise.all([contributorContext.close(), adminContext.close()]);
  }
});
