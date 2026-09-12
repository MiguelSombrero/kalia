import { customFetch } from "@auth/core";
import Keycloak from "next-auth/providers/keycloak";
import { createInternalKeycloakFetch } from "./internalKeycloakFetch";

// `issuer` must stay Keycloak's public `iss` (KC_HOSTNAME): oauth4webapi's
// validateAuthResponse checks the callback against this exact string, and
// the internal Docker hostname throws "unexpected iss" if used instead —
// confirmed live. Requests are redirected to the internal origin transparently
// (internalKeycloakFetch.ts); the validated `iss` string is untouched.
const fetchViaInternalKeycloak = createInternalKeycloakFetch(
  process.env.AUTH_KEYCLOAK_ISSUER!,
  process.env.AUTH_KEYCLOAK_INTERNAL_ORIGIN!,
);

// Not exported — see buildKeycloakProvider below. Split out of auth.ts so a
// test can import it without loading next-auth's runtime, which fails to
// resolve `next/server` outside a Next.js build.
const keycloakOptions = {
  clientId: process.env.AUTH_KEYCLOAK_ID,
  clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
  issuer: process.env.AUTH_KEYCLOAK_ISSUER,
  // Pinned by keycloakOptions.test.ts. ADR-0033: safe within one shared realm/client.
  allowDangerousEmailAccountLinking: true,
  [customFetch]: fetchViaInternalKeycloak,
};

type KeycloakProviderOverrides = {
  id?: string;
  name?: string;
  authorization?: { url: string };
};

// The only way to get a Keycloak provider config (ADR-0033: every entry must
// share one client). `overrides` covers only what legitimately differs
// between entries — id, name, the authorization endpoint — never credentials.
export const buildKeycloakProvider = (overrides: KeycloakProviderOverrides = {}) => ({
  ...Keycloak(keycloakOptions),
  ...overrides,
});
