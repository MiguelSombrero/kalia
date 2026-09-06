// Exercises the mail path end to end against the compose stack: Keycloak
// sends over SMTP to the mailpit container (docs/architecture.md §6), and the
// message is read back over mailpit's HTTP API — no real mailbox involved.
import { expect, test } from "@playwright/test";

import {
  createUnverifiedKeycloakUser,
  deleteKeycloakUser,
  keycloakAdminToken,
  sendActionsEmail,
} from "./support/keycloakAccount";
import { linkFromMessage, waitForMessageTo } from "./support/mailpit";

const FRONTEND_ORIGIN = "http://localhost:3000";

test("Keycloak sends a readable verification email whose link lands back on the frontend", async ({
  page,
  request,
}) => {
  const adminToken = await keycloakAdminToken(request);
  const username = `mailtest-${Date.now()}`;
  const email = `${username}@example.com`;
  const userId = await createUnverifiedKeycloakUser(request, adminToken, username, email);

  try {
    await sendActionsEmail(request, adminToken, userId, ["VERIFY_EMAIL"], `${FRONTEND_ORIGIN}/en`);

    const message = await waitForMessageTo(request, email);

    // The sender identity a recipient sees (Kalia, not a bare address).
    expect(message.From.Name).toBe("Kalia");
    expect((message.HTML || message.Text).toLowerCase()).toContain("verify");

    const link = linkFromMessage(message);
    // ADR-0025: the link must be Keycloak's public address, not the compose network name.
    expect(link).toContain("localhost:8081");
    expect(link).not.toContain("keycloak:8080");

    await page.goto(link);
    // Keycloak guards action links behind a confirmation page (so email
    // scanners can't consume them), and may show a "back to application" page
    // rather than redirecting on its own. Click through whatever it shows
    // until the browser leaves Keycloak.
    for (let step = 0; step < 3 && page.url().startsWith("http://localhost:8081"); step++) {
      const next = page
        .getByRole("link", { name: /proceed|continue|back to application/i })
        .or(page.getByRole("button", { name: /proceed|continue|submit/i }));
      if (!(await next.count())) break;
      await next.first().click();
      await page.waitForLoadState();
    }

    // The action completes and Keycloak returns the browser to the configured
    // frontend origin — not a dead end on a container-internal host.
    await expect(page).toHaveURL(new RegExp(`^${FRONTEND_ORIGIN}/en`));
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  } finally {
    await deleteKeycloakUser(request, adminToken, userId);
  }
});
