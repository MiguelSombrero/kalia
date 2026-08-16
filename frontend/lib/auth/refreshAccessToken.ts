import { createInternalKeycloakFetch } from "./internalKeycloakFetch";

// `rejected` means the refresh token is dead; `unavailable` means we don't
// know — ending a session over a Keycloak restart would be a self-inflicted sign-out.
export type RefreshOutcome =
  | {
      status: "renewed";
      accessToken: string;
      /** Absent when Keycloak returns no new one; the caller keeps the old. */
      refreshToken: string | undefined;
      idToken: string | undefined;
      /** Seconds since the epoch, matching AdapterAccount's `expires_at`. */
      expiresAt: number;
    }
  | { status: "rejected" }
  | { status: "unavailable" };

// The one hand-written OAuth request in the codebase (RFC 6749 §6): Auth.js
// exposes tokens but leaves renewal to the app (ADR-0025).
export const refreshAccessToken = async (refreshToken: string): Promise<RefreshOutcome> => {
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const internalOrigin = process.env.AUTH_KEYCLOAK_INTERNAL_ORIGIN;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const clientSecret = process.env.AUTH_KEYCLOAK_SECRET;
  if (!issuer || !internalOrigin || !clientId || !clientSecret) {
    return { status: "unavailable" };
  }

  // Built per call, not at module load, so it reads the environment when the
  // request is actually made (same public-to-internal rewrite auth.ts explains).
  const fetchViaInternalKeycloak = createInternalKeycloakFetch(issuer, internalOrigin);

  let response: Response;
  try {
    response = await fetchViaInternalKeycloak(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
  } catch {
    return { status: "unavailable" };
  }

  if (!response.ok) {
    return (await isInvalidGrant(response)) ? { status: "rejected" } : { status: "unavailable" };
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    return { status: "unavailable" };
  }

  const { access_token: accessToken, expires_in: expiresIn } = payload;
  // A 200 without these is Keycloak answering with something other than a
  // token response (e.g. a gateway page) — treat it as no answer at all.
  if (typeof accessToken !== "string" || typeof expiresIn !== "number") {
    return { status: "unavailable" };
  }

  return {
    status: "renewed",
    accessToken,
    refreshToken: asOptionalString(payload.refresh_token),
    idToken: asOptionalString(payload.id_token),
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
  };
};

// Only `invalid_grant` is fatal (RFC 6749 §5.2); `invalid_client` and
// friends are our own misconfiguration, not grounds to sign users out.
const isInvalidGrant = async (response: Response): Promise<boolean> => {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return body.error === "invalid_grant";
  } catch {
    return false;
  }
};

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
