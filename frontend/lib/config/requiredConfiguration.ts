const REQUIRED_IN_PRODUCTION = ["BACKEND_URL"] as const;

/** ADR-0018. No-op outside `NODE_ENV=production`, where the dev-only localhost fallbacks apply. */
export const verifyRequiredConfiguration = (env: Record<string, string | undefined>): void => {
  if (env.NODE_ENV !== "production") {
    return;
  }

  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Required configuration is missing: ${missing.join(", ")}. Set it as an environment variable - see frontend/README.md.`,
    );
  }
};
