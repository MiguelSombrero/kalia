// What each Keycloak page asks for and what it is called: the registration form
// asks for no name, the browser tab of each page says what the page is, in both
// languages, and the password-reset page lets the browser offer the stored
// username. ADR-0055, ADR-0056.
import type { APIRequestContext, Page } from "@playwright/test";
import { expect, keycloakAdminToken, signIn, test, uniqueUsername } from "./support/keycloakAccount";
import { KEYCLOAK_ADMIN_ORIGIN, KEYCLOAK_ORIGIN, WEB_ORIGIN } from "./support/origins";

const PASSWORD = "correct-horse-battery";

const LOCALES = [
  {
    locale: "en",
    signIn: "Sign in",
    register: "Register",
    forgot: "Forgot Password?",
    titles: {
      login: "Sign in to Kalia",
      register: "Create a Kalia account",
      reset: "Forgot your password?",
      updatePassword: "Choose a new password",
      verifyEmail: "Confirm your email address",
      error: "Something went wrong",
    },
  },
  {
    locale: "fi",
    signIn: "Kirjaudu sisään",
    register: "Rekisteröidy",
    forgot: "Unohditko salasanan?",
    titles: {
      login: "Kirjaudu Kaliaan",
      register: "Luo Kalia-tili",
      reset: "Unohtuiko salasana?",
      updatePassword: "Valitse uusi salasana",
      verifyEmail: "Vahvista sähköpostiosoitteesi",
      error: "Jotain meni vikaan",
    },
  },
] as const;

type Locale = (typeof LOCALES)[number];

const openSignIn = async (page: Page, { locale, signIn: signInName }: Locale) => {
  await page.goto(`${WEB_ORIGIN}/${locale}`);
  await page.getByRole("button", { name: signInName, exact: true }).click();
  await page.locator("#kc-form-login").waitFor();
};

const createUser = async (
  request: APIRequestContext,
  prefix: string,
  extra: { emailVerified: boolean; requiredActions: string[] },
) => {
  const username = uniqueUsername(prefix);
  const response = await request.post(`${KEYCLOAK_ADMIN_ORIGIN}/admin/realms/kalia/users`, {
    headers: { Authorization: `Bearer ${await keycloakAdminToken(request)}` },
    data: {
      username,
      email: `${username}@example.com`,
      enabled: true,
      ...extra,
      credentials: [{ type: "password", value: PASSWORD, temporary: false }],
    },
  });
  expect(response.ok(), `could not create Keycloak user ${username}`).toBeTruthy();
  return username;
};

const signInThroughKeycloak = async (page: Page, l: Locale, username: string) => {
  await openSignIn(page, l);
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#kc-login").click();
};

test.describe("the registration form asks for what Kalia uses", () => {
  test("it has a username and an email, and no name", async ({ page }) => {
    await page.goto(`${WEB_ORIGIN}/en/sign-up`);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue to sign-up" }).click();
    await page.locator("#kc-register-form").waitFor();

    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#firstName")).toHaveCount(0);
    await expect(page.locator("#lastName")).toHaveCount(0);
    await expect(page.locator("#kc-register-form input:not([type=hidden]):not([type=submit])")).toHaveCount(2);
  });

  // The accounts made before the change carry both names (Keycloak keeps them
  // on the user, and only an admin may edit them), and must sign in as before.
  test("an account with both names stored still signs in", async ({ page, request }) => {
    const username = uniqueUsername("named");
    const response = await request.post(`${KEYCLOAK_ADMIN_ORIGIN}/admin/realms/kalia/users`, {
      headers: { Authorization: `Bearer ${await keycloakAdminToken(request)}` },
      data: {
        username,
        email: `${username}@example.com`,
        emailVerified: true,
        enabled: true,
        firstName: "Stored",
        lastName: "Names",
        credentials: [{ type: "password", value: PASSWORD, temporary: false }],
      },
    });
    expect(response.ok(), `could not create Keycloak user ${username}`).toBeTruthy();

    await page.goto(`${WEB_ORIGIN}/en`);
    await signIn(page, { username, password: PASSWORD });
    await expect(page.getByRole("link", { name: `Profile: ${username}` })).toBeVisible();
  });
});

for (const l of LOCALES) {
  test.describe(`each Keycloak page is titled for what it does, in ${l.locale}`, () => {
    test("sign-in", async ({ page }) => {
      await openSignIn(page, l);
      await expect(page).toHaveTitle(l.titles.login);
    });

    test("registration", async ({ page }) => {
      await openSignIn(page, l);
      await page.getByRole("link", { name: l.register, exact: true }).click();
      await page.locator("#kc-register-form").waitFor();
      await expect(page).toHaveTitle(l.titles.register);
    });

    test("password reset", async ({ page }) => {
      await openSignIn(page, l);
      await page.getByRole("link", { name: l.forgot }).click();
      await page.locator("#kc-reset-password-form").waitFor();
      await expect(page).toHaveTitle(l.titles.reset);
    });

    test("update password", async ({ page, request }) => {
      const username = await createUser(request, `title-password-${l.locale}`, {
        emailVerified: true,
        requiredActions: ["UPDATE_PASSWORD"],
      });
      await signInThroughKeycloak(page, l, username);
      await page.locator("#password-new").waitFor();
      await expect(page).toHaveTitle(l.titles.updatePassword);
    });

    test("verify email", async ({ page, request }) => {
      const username = await createUser(request, `title-verify-${l.locale}`, {
        emailVerified: false,
        requiredActions: ["VERIFY_EMAIL"],
      });
      await signInThroughKeycloak(page, l, username);
      await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK_ORIGIN}`));
      await expect(page.locator("body")).toHaveAttribute("data-page-id", "login-login-verify-email");
      await expect(page).toHaveTitle(l.titles.verifyEmail);
    });

    test.describe("error", () => {
      // An address Keycloak refuses to redirect to has no session to carry the
      // visitor's language, so the page takes it from the browser's.
      test.use({ locale: l.locale });

      test("the page after a refused redirect", async ({ page }) => {
        await page.goto(
          `${KEYCLOAK_ORIGIN}/realms/kalia/protocol/openid-connect/auth?client_id=kalia-web&redirect_uri=https://refused.example/&response_type=code`,
        );
        await expect(page.locator("body")).toHaveAttribute("data-page-id", "login-error");
        await expect(page.locator("html")).toHaveAttribute("lang", l.locale);
        await expect(page).toHaveTitle(l.titles.error);
      });
    });
  });
}

test.describe("a page with no title of its own keeps Keycloak's", () => {
  test("the update-profile page is titled, not named by its message key", async ({ page, request }) => {
    const username = await createUser(request, "title-profile", {
      emailVerified: true,
      requiredActions: ["UPDATE_PROFILE"],
    });
    await signInThroughKeycloak(page, LOCALES[0], username);
    await expect(page.locator("body")).toHaveAttribute("data-page-id", "login-login-update-profile");
    await expect(page).toHaveTitle("Sign in to Kalia");
  });
});

test.describe("the password-reset page offers the stored username", () => {
  test("its username field is not switched off for autofill", async ({ page }) => {
    await openSignIn(page, LOCALES[0]);
    await page.getByRole("link", { name: LOCALES[0].forgot }).click();
    await page.locator("#kc-reset-password-form").waitFor();

    await expect(page.locator("#username")).not.toHaveAttribute("autocomplete", "off");
    await expect(page.locator("#username")).toHaveAttribute("autocomplete", "username");
  });
});
