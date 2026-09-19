import type { Page } from "@playwright/test";
import { KEYCLOAK_ORIGIN } from "./origins";

/**
 * Clicks through whatever Keycloak puts between an emailed action link and
 * the application: it guards those links behind a confirmation page so email
 * scanners cannot consume them, and may end on a "back to application" page
 * rather than redirecting on its own. Stops as soon as the browser leaves
 * Keycloak, or when there is nothing left to click.
 */
export const clickThroughKeycloakAction = async (page: Page): Promise<void> => {
  for (let step = 0; step < 3 && page.url().startsWith(KEYCLOAK_ORIGIN); step += 1) {
    const next = page
      .getByRole("link", { name: /proceed|continue|back to application/i })
      .or(page.getByRole("button", { name: /proceed|continue|submit/i }));
    if (!(await next.count())) {
      break;
    }
    await next.first().click();
    await page.waitForLoadState();
  }
};
