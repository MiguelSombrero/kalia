// The catalog marks the beers the viewer holds from a read bounded to the
// beers on the page, not from the whole cellar; credentials are a per-worker
// account provisioned by ./support/keycloakAccount.ts.
import type { Page } from "@playwright/test";
import { expect, signIn, test } from "./support/keycloakAccount";
import { CATALOG_CARD } from "./support/catalog";
import { escapeRegExp } from "./support/text";

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

const heldMark = /(\d+) in your cellar/;

const heldBottles = async (card: ReturnType<Page["getByRole"]>): Promise<number> => {
  const mark = card.getByText(heldMark);
  return (await mark.count()) === 0 ? 0 : Number(heldMark.exec((await mark.textContent()) ?? "")?.[1]);
};

test("a search result marks the beers the visitor holds and only those", async ({ page, account }) => {
  await page.goto("/en/beers");
  await signIn(page, account);
  await page.goto("/en/beers");

  const cards = page.getByRole("listitem");
  const held = cards.nth(CATALOG_CARD.heldMarks);
  const unheld = cards.nth(CATALOG_CARD.heldMarksUnheld);
  const beerName = (await held.getByRole("heading").textContent())!.trim();
  const before = await heldBottles(held);

  await held.getByRole("button", { name: "Add to cellar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "One more" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.goto("/en/beers");
  await expect(held.getByText(`${before + 2} in your cellar`)).toBeVisible();
  await expect(unheld.getByText(heldMark)).toHaveCount(0);

  await page.getByLabel("Search", { exact: true }).fill(beerName);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/query=/);
  const result = page.getByRole("listitem").filter({
    has: page.getByRole("heading", { name: new RegExp(`^${escapeRegExp(beerName)}$`) }),
  });
  await expect(result.getByText(`${before + 2} in your cellar`)).toBeVisible();
});
