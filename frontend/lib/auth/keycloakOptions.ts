import { customFetch } from "@auth/core";
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

// Shared by both Keycloak provider entries in auth.ts: same client
// (kalia-frontend), just entered through a different endpoint. Keeping this
// one object is what guarantees the two never drift apart on the settings
// that matter (secret, issuer, the internal-address fetch). Split out of
// auth.ts so a test can import it without loading next-auth's runtime, which
// fails to resolve `next/server` outside a Next.js build.
export const keycloakOptions = {
  clientId: process.env.AUTH_KEYCLOAK_ID,
  clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
  issuer: process.env.AUTH_KEYCLOAK_ISSUER,
  // Pinned by keycloakOptions.test.ts. ADR-0033: safe within one shared realm/client.
  allowDangerousEmailAccountLinking: true,
  [customFetch]: fetchViaInternalKeycloak,
};
