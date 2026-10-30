// Everything the redesign animates — a control's hover fade, the filter fold's
// icon, a new feed entry's highlight — stops when the visitor asks for reduced
// motion. Computed from the rendered page, since jsdom applies no stylesheet.
import type { Page } from "@playwright/test";
import { createFreshAccount, expect, signIn, test } from "./support/keycloakAccount";

test.use({ screenshot: "off", trace: "off", video: "off" });

const animating = (page: Page) =>
  page.evaluate(() => {
    const moves = (durations: string) => durations.split(",").some((d) => parseFloat(d) > 0);
    return [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        const style = getComputedStyle(element);
        return (style.animationName !== "none" && moves(style.animationDuration)) || moves(style.transitionDuration);
      })
      .map((element) => `<${element.tagName.toLowerCase()} class="${element.className}">`);
  });

const SIGNED_OUT = ["/en", "/en/beers", "/en/beers?query=zzzzqq", "/en/cellar", "/en/profile", "/en/sign-up"];

for (const viewport of [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const) {
  test.describe(`reduced motion, ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("with motion allowed, controls do animate", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("/en/beers");
      // Without this, a check that never finds anything would pass below too.
      expect(await animating(page)).not.toEqual([]);
    });

    test("with reduced motion, nothing on any surface animates", async ({ page, request }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const path of SIGNED_OUT) {
        await page.goto(path);
        expect(await animating(page), path).toEqual([]);
      }

      const account = await createFreshAccount(request, `e2e-motion-${viewport.name}`);
      await page.goto("/en");
      await signIn(page, account);
      await page.goto("/en/beers");
      await page.getByRole("listitem").first().getByRole("button", { name: "Add to cellar" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeHidden();

      const beer = (await page.getByRole("main").getByRole("heading", { level: 2 }).first().textContent())!.trim();
      await page.getByRole("link", { name: beer, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: beer })).toBeVisible();
      expect(await animating(page), "a beer's details").toEqual([]);

      for (const path of ["/en", "/en/cellar", "/en/profile"]) {
        await page.goto(path);
        expect(await animating(page), `${path}, signed in`).toEqual([]);
      }
    });
  });
}
