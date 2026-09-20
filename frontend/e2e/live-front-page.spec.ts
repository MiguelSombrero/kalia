// A visitor sitting on the front page sees a new event without reloading: one
// browser context watches the page while a second, signed-in one adds a
// bottle. Credentials are a per-worker account provisioned by
// ./support/keycloakAccount.ts.
import { CATALOG_CARD } from "./support/catalog";
import { expect, signIn, test } from "./support/keycloakAccount";
import { escapeRegExp } from "./support/text";
import { setCellarVisibility } from "./support/visibility";

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

test("a new event surfaces behind a control on a front page already open, without navigating", async ({
  browser,
  page: watcher,
  account,
}) => {
  // The poll interval is comfortably under the 60s latency budget (ADR-0060)
  // but still longer than Playwright's own default per-test timeout.
  test.setTimeout(60_000);

  await watcher.goto("/en");

  const actorContext = await browser.newContext();
  const actor = await actorContext.newPage();
  try {
    await actor.goto("/en");
    await signIn(actor, account);
    await setCellarVisibility(actor, "Anyone with the link");

    await actor.goto("/en/beers");
    const card = actor.getByRole("listitem").nth(CATALOG_CARD.liveFrontPage);
    const beerName = (await card.getByRole("heading").textContent())!.trim();
    await card.getByRole("button", { name: "Add to cellar" }).click();
    await expect(actor.getByRole("dialog")).toBeVisible();
    await actor.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
    await expect(actor.getByRole("dialog")).toBeHidden();

    const control = watcher.getByRole("button", { name: /new events?$/ });
    await expect(control).toBeVisible({ timeout: 30_000 });
    await control.click();

    // The feed is global shared state other specs add to concurrently, so
    // .first() picks the newest match rather than asserting uniqueness or
    // position.
    const line = watcher
      .getByRole("listitem")
      .filter({ hasText: new RegExp(escapeRegExp(beerName)) })
      .filter({ hasText: account.username })
      .first();
    await expect(line).toBeVisible();
    await expect(watcher).toHaveURL(/\/en$/);
  } finally {
    await actorContext.close();
  }
});
