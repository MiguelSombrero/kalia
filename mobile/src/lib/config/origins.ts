import { z } from "zod";

const origin = z.string().regex(/^https?:\/\/[^/\s?#]+\/?$/);

const originsSchema = z.object({ api: origin, keycloak: origin });

type RawOrigins = { api?: string; keycloak?: string };

const VARIABLES = { api: "EXPO_PUBLIC_API_ORIGIN", keycloak: "EXPO_PUBLIC_KEYCLOAK_ORIGIN" } as const;

export const parseOrigins = (raw: RawOrigins) => {
  const parsed = originsSchema.safeParse(raw);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => VARIABLES[issue.path[0] as keyof typeof VARIABLES]))];
    throw new Error(`${names.join(" and ")} must be set to an origin such as https://host:port: the make targets set it from the stack's ports`);
  }
  return { api: parsed.data.api.replace(/\/$/, ""), keycloak: parsed.data.keycloak.replace(/\/$/, "") };
};

// Metro inlines EXPO_PUBLIC_* only where `process.env.NAME` is written out
// literally; reading them through a variable or a spread leaves undefined.
export const origins = parseOrigins({
  api: process.env.EXPO_PUBLIC_API_ORIGIN,
  keycloak: process.env.EXPO_PUBLIC_KEYCLOAK_ORIGIN,
});
