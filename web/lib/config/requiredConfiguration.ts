const REQUIRED_IN_PRODUCTION = [
  "BACKEND_URL",
  "AUTH_URL",
  "AUTH_SECRET",
  "AUTH_KEYCLOAK_ID",
  "AUTH_KEYCLOAK_SECRET",
  "AUTH_KEYCLOAK_ISSUER",
  "AUTH_KEYCLOAK_INTERNAL_ORIGIN",
  "VALKEY_URL",
] as const;

// docker-compose.dev.env's AUTH_SECRET: committed, so known to everyone.
const DEV_AUTH_SECRET = "kalia-dev-auth-secret";

/** ADR-0018, ADR-0089. No-op outside `NODE_ENV=production`, where the dev-only localhost fallbacks apply. */
export const verifyRequiredConfiguration = (env: Record<string, string | undefined>): void => {
  if (env.NODE_ENV !== "production") {
    return;
  }

  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Required configuration is missing: ${missing.join(", ")}. Set it as an environment variable - see web/README.md.`,
    );
  }

  // Only docker-compose.override.yml sets KALIA_DEV_STACK.
  if (env.AUTH_SECRET?.trim() === DEV_AUTH_SECRET && env.KALIA_DEV_STACK !== "true") {
    throw new Error(
      "AUTH_SECRET is the development secret committed in docker-compose.dev.env, which anyone can read. Set a secret of your own - see web/README.md.",
    );
  }
};
