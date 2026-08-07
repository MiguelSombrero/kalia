import { createInternalKeycloakFetch } from "./internalKeycloakFetch";

/**
 * A renewed token set, or why it could not be renewed. The two failures are
 * kept apart because they call for opposite responses: `rejected` means this
 * refresh token will never work again and the local session is dead with it,
 * while `unavailable` means we simply don't know — ending a session over a
 * Keycloak restart would be a self-inflicted sign-out.
 */
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

/**
 * Exchanges a refresh token for a fresh token set at Keycloak's token
 * endpoint (RFC 6749 §6). Auth.js has no refresh of its own — it exposes the
 * provider's tokens and leaves renewal to the app — so this is the one
 * hand-written OAuth request in the codebase (ADR-0025 confines the rest of
 * the protocol to Auth.js).
 *
 * The path is Keycloak's stable convention rather than a discovery-document
 * lookup, matching features/auth/endSessionUrl.ts.
 */
export const refreshAccessToken = async (refreshToken: string): Promise<RefreshOutcome> => {
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const internalOrigin = process.env.AUTH_KEYCLOAK_INTERNAL_ORIGIN;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const clientSecret = process.env.AUTH_KEYCLOAK_SECRET;
  if (!issuer || !internalOrigin || !clientId || !clientSecret) {
    return { status: "unavailable" };
  }

  // Built per call, not once at module load: the same public-to-internal
  // origin rewrite auth.ts explains, but reading the environment when the
  // request is actually made.
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
  // A 200 without these is Keycloak answering something other than a token
  // response — a gateway's own page, say. Storing it would poison the account
  // record with a token no backend accepts, so treat it as no answer at all.
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

/**
 * Only `invalid_grant` is treated as fatal to the session. It is the one OAuth
 * error meaning the grant itself is gone — expired, revoked, or its SSO
 * session ended (RFC 6749 §5.2). `invalid_client` and friends indicate *our*
 * misconfiguration, and signing users out over a bad client secret would turn
 * a deployment mistake into a logout storm.
 */
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
