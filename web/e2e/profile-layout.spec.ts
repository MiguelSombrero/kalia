// The profile and the sign-up page as ADR-0071 lays them out, at both agreed
// widths: every state renders, passes the axe scan and stays inside the
// column. Credentials are a per-worker account provisioned by
// ./support/keycloakAccount.ts.
import type { Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { expect, signIn, test } from "./support/keycloakAccount";
import { expectNoSidewaysScroll } from "./support/layout";
import { setCellarVisibility } from "./support/visibility";

test.use({ screenshot: "off", trace: "off", video: "off" });

// Shares one account per worker with the other specs, which cycle sign-in/out.
test.describe.configure({ mode: "serial" });

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const expectLaidOut = async (page: Page) => {
  await expectNoA11yViolations(page);
  await expectNoSidewaysScroll(page);
};

for (const viewport of VIEWPORTS) {
  test.describe(`profile and sign-up, ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("the signed-out profile offers sign-in and an account", async ({ page }) => {
      await page.goto("/en/profile");
      await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
      await expect(page.getByRole("main").getByRole("button", { name: "Sign in" })).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "Create an account" })).toBeVisible();
      await expectLaidOut(page);
    });

    test("the profile is titled by the username, in both visibility states", async ({ page, account }) => {
      await page.goto("/en");
      await signIn(page, account);

      await setCellarVisibility(page, "Only me");
      await expect(page.getByRole("heading", { level: 1, name: account.username })).toBeVisible();
      await expect(page.getByText("Your name on Kalia")).toBeVisible();
      await expectLaidOut(page);

      await page.getByRole("radio", { name: "Anyone with the link" }).click();
      await expect(page.getByText("Publish your cellar?")).toBeVisible();
      await expectLaidOut(page);
      await page.getByRole("button", { name: "Keep private" }).click();

      await setCellarVisibility(page, "Anyone with the link");
      await expect(page.getByText(`/cellars/${account.username}`)).toBeVisible();
      await expectLaidOut(page);

      await setCellarVisibility(page, "Only me");
    });

    test("sign-up lays out its steps, and each of its two errors", async ({ page }) => {
      await page.goto("/en/sign-up");
      await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
      await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(3);
      await expectLaidOut(page);

      await page.getByRole("button", { name: "Continue to sign-up" }).click();
      await expect(page).toHaveURL(/error=agree-required/);
      const box = page.getByRole("checkbox", { name: /old enough/ });
      await expect(box).toHaveAttribute("aria-invalid", "true");
      await expect(box).toHaveAccessibleDescription("Please confirm you're old enough to use a beer app.");
      await expectLaidOut(page);

      // Exhausting the shared counter would cost every other spec its budget;
      // the redirect the action sends is the state under test.
      await page.goto("/en/sign-up?error=rate-limited");
      await expect(page.getByRole("main").getByRole("alert")).toHaveText("Too many sign-up attempts. Please try again in a few minutes.");
      await expectLaidOut(page);
    });
  });
}
