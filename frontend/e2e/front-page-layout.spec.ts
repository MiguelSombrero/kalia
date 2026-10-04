import { expectNoA11yViolations } from "./support/a11y";
import { expect, signIn, test } from "./support/keycloakAccount";

test.use({ screenshot: "off", trace: "off", video: "off" });

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const MIN_TARGET = 24;

for (const viewport of VIEWPORTS) {
  test.describe(`front page, ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const locale of ["en", "fi"] as const) {
      test(`signed out in ${locale}, the feed starts on the first screen and nothing scrolls sideways`, async ({
        page,
      }) => {
        await page.goto(`/${locale}`);

        const heading = page.getByRole("heading", { level: 2, name: /Latest additions|Viimeisimmät lisäykset/ });
        const box = await heading.boundingBox();
        expect(box, "the feed's heading is missing").not.toBeNull();
        expect(box!.y + box!.height, "the masthead pushes the feed off the first screen").toBeLessThan(
          viewport.height,
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }

    test("signed out, every control in the page is at least 24×24 CSS pixels and axe passes", async ({ page }) => {
      await page.goto("/en");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const tooSmall = await page.evaluate((min) => {
        const controls = document.querySelectorAll<HTMLElement>("main a[href], main button");
        return [...controls]
          .map((control) => ({ control, box: control.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && box.height > 0 && (box.width < min || box.height < min))
          .map(({ control, box }) => `${control.textContent?.trim()} ${Math.round(box.width)}×${Math.round(box.height)}`);
      }, MIN_TARGET);
      expect(tooSmall, `page controls under ${MIN_TARGET}×${MIN_TARGET} CSS pixels`).toEqual([]);

      await expectNoA11yViolations(page);
    });

    test("signed in, the visitor's cellar replaces the pitch and axe passes", async ({ page, account }) => {
      await page.goto("/en");
      await signIn(page, account);
      await page.goto("/en");

      await expect(page.getByRole("heading", { level: 2, name: "My cellar" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Open my cellar" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "How Kalia works" })).toHaveCount(0);

      await expectNoA11yViolations(page);
    });
  });
}
