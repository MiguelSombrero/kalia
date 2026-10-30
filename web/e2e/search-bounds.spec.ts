import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";

const ignoredNote = "Part of this search wasn't valid, so it was ignored.";

test.describe("a hand-edited value the API would refuse", () => {
  for (const [what, search] of [
    ["an ABV over 100", "minAbv=150"],
    ["a non-numeric ABV", "maxAbv=strong"],
    ["an over-long query", `query=${"a".repeat(101)}`],
    ["a non-numeric page", "page=two"],
    ["a negative page", "page=-1"],
    ["a page beyond the offset bound", "page=600"],
    ["a size of zero", "size=0"],
    ["a size over the cap", "size=500"],
    ["a malformed country code", "countryCode=belgium"],
    ["a well-formed country code that is not listed", "countryCode=ZZ"],
  ] as const) {
    test(`drops ${what} and says so`, async ({ page }) => {
      await page.goto(`/en/beers?${search}`);

      await expect(page.getByRole("heading", { level: 1, name: "Beer catalog" })).toBeVisible();
      await expect(page.getByText(ignoredNote)).toBeVisible();
      await expect(page.getByText(/^\d+ beers$/)).toBeVisible();
      await expect(page.getByRole("link", { name: /^Remove filter/ })).toHaveCount(0);
    });
  }

  test("keeps the valid filters beside the one it drops", async ({ page }) => {
    await page.goto("/en/beers?query=Westvleteren&maxAbv=strong");

    await expect(page.getByText(ignoredNote)).toBeVisible();
    await expect(page.getByRole("link", { name: "Westvleteren 12", exact: true })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "Max ABV %" })).toHaveValue("");
    await expectNoA11yViolations(page);
  });

  test("says so in Finnish", async ({ page }) => {
    await page.goto("/fi/beers?minAbv=150");

    await expect(page.getByText("Virheellinen hakuehto jätettiin huomiotta.")).toBeVisible();
  });
});

test("swaps a minimum ABV above the maximum, without a note", async ({ page }) => {
  await page.goto("/en/beers");

  await page.getByLabel("Style").fill("Quadrupel");
  await page.getByLabel("Country").selectOption({ label: "Belgium" });
  await page.getByRole("spinbutton", { name: "Min ABV %" }).fill("12");
  await page.getByRole("spinbutton", { name: "Max ABV %" }).fill("11");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/minAbv=12/);

  await expect(page.getByRole("link", { name: "Rochefort 10", exact: true })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Min ABV %" })).toHaveValue("11");
  await expect(page.getByRole("spinbutton", { name: "Max ABV %" })).toHaveValue("12");
  await expect(page.getByText(ignoredNote)).toHaveCount(0);
});

test("the form cannot send an over-long query or an ABV over 100", async ({ page }) => {
  await page.goto("/en/beers");

  await expect(page.getByLabel("Search", { exact: true })).toHaveAttribute("maxlength", "100");
  await expect(page.getByRole("spinbutton", { name: "Min ABV %" })).toHaveAttribute("max", "100");
  await expect(page.getByRole("spinbutton", { name: "Max ABV %" })).toHaveAttribute("max", "100");
});

test("a page past the last shows an empty result that links back to page 1", async ({ page }) => {
  await page.goto("/en/beers?query=Westvleteren&page=40");

  await expect(page).toHaveURL(/page=40/);
  await expect(page.getByRole("heading", { name: "This search has no page 41." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Westvleteren 12", exact: true })).toHaveCount(0);
  await expectNoA11yViolations(page);

  await page.getByRole("link", { name: "Back to page 1" }).click();

  await expect(page).toHaveURL(/\/en\/beers\?query=Westvleteren$/);
  await expect(page.getByRole("link", { name: "Westvleteren 12", exact: true })).toBeVisible();
});
