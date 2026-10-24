import { expect, test } from "@playwright/test";
import { expectFocusNotObscured } from "./keyboard";

test.describe("expectFocusNotObscured", () => {
  test("passes a focused list taller than ten viewports whose top is in view", async ({ page }) => {
    await page.setContent(`
      <div style="height: 300px"></div>
      <ul id="feed" tabindex="-1" style="margin: 0; height: 10000px">
        <li>entry</li>
      </ul>`);
    await page.locator("#feed").focus({ timeout: 1000 });
    const height = await page.evaluate(() => document.getElementById("feed")!.getBoundingClientRect().height);
    expect(height).toBeGreaterThan(10 * (page.viewportSize()?.height ?? 720));

    await expectFocusNotObscured(page);
  });

  test("fails a control covered entirely by a fixed bar", async ({ page }) => {
    await page.setContent(`
      <header style="position: fixed; z-index: 1; top: 0; left: 0; right: 0; height: 100px; background: white"></header>
      <button id="control" style="position: absolute; top: 20px; left: 20px">Covered</button>`);
    await page.locator("#control").focus();

    await expect(expectFocusNotObscured(page)).rejects.toThrow(/entirely hidden/);
  });

  test("fails a control entirely below the viewport", async ({ page }) => {
    await page.setContent(`<button id="control" style="position: absolute; top: 5000px">Below</button>`);
    await page.locator("#control").focus({ timeout: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));

    await expect(expectFocusNotObscured(page)).rejects.toThrow(/entirely hidden/);
  });
});
