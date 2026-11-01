import { signIn } from "@/auth";
import { toLocale, type Locale } from "@/i18n/settings";

type SignInProvider = "keycloak" | "keycloak-register";

// The hidden "locale" field every sign-in form carries.
export const formLocale = (formData?: FormData): Locale => {
  const locale = formData?.get("locale");
  return toLocale(typeof locale === "string" ? locale : "");
};

/**
 * Starts a sign-in that brings the viewer back to `returnTo(locale)`. The
 * locale is also Keycloak's `ui_locales` (ADR-0056).
 *
 * `returnTo` builds the path from `lib/routes.ts` out of validated parts.
 * Never hand `signIn` a path taken from the form: `redirectTo` would be an
 * open redirect.
 *
 * Call this from a feature's own "use server" action, never re-export it as
 * one: a Server Action defined in a second file fails at runtime with
 * UnrecognizedActionError and nothing else catches it (web/README.md traps).
 */
export const signInReturningTo = async (
  formData: FormData | undefined,
  returnTo: (locale: Locale) => string,
  provider: SignInProvider = "keycloak",
): Promise<void> => {
  const locale = formLocale(formData);
  await signIn(provider, { redirectTo: returnTo(locale) }, { ui_locales: locale });
};
