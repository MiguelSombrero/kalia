import type { AdapterAccount } from "next-auth/adapters";
import { endLocalSession } from "@/lib/auth/endLocalSession";
import { refreshAccessToken } from "@/lib/auth/refreshAccessToken";
import { currentSessionToken } from "@/lib/auth/sessionCookie";
import { getSessionAccount, updateSessionAccount } from "@/lib/auth/valkeyAdapter";

/**
 * Renews this far ahead of expiry, so a token that would die in flight is
 * replaced rather than sent.
 */
const EXPIRY_LEEWAY_SECONDS = 10;

/**
 * The signed-in user's Keycloak access token, renewing it first when it has
 * expired, or `undefined` when there is no usable one — the normal case for
 * the public catalog (ADR-0028).
 *
 * Do not send an expired token instead of nothing. Spring Security
 * authenticates a bearer token before it checks whether the route is public,
 * so an expired one turns even the anonymous catalog into a 401 — verified by
 * curl against the running stack.
 */
export const currentAccessToken = async (): Promise<string | undefined> => {
  const sessionToken = await currentSessionToken();
  if (!sessionToken) {
    return undefined;
  }
  // The token set belongs to this session, not to the user (ADR-0030): a
  // second device's tokens must never answer for this one's.
  const account = await getSessionAccount(sessionToken);
  if (!account?.access_token) {
    return undefined;
  }
  if (!hasExpired(account.expires_at)) {
    return account.access_token;
  }
  return renew(sessionToken, account);
};

/**
 * Trades the stored refresh token for a fresh set and writes it back
 * (ADR-0029). Concurrent renewals are left to race: Keycloak's realm allows
 * refresh-token reuse (`revokeRefreshToken: false`, pinned in
 * keycloak/realm-export.json), so parallel calls each get a valid set and the
 * last write wins. Enabling rotation there would make this need a lock.
 */
const renew = async (
  sessionToken: string,
  account: AdapterAccount,
): Promise<string | undefined> => {
  if (!account.refresh_token) {
    return undefined;
  }

  const outcome = await refreshAccessToken(account.refresh_token);

  if (outcome.status === "unavailable") {
    // Keycloak unreachable or answering oddly. The session may well still be
    // good, so it is left alone and only this request goes without a token.
    return undefined;
  }

  if (outcome.status === "rejected") {
    await endLocalSession(sessionToken);
    return undefined;
  }

  await updateSessionAccount(sessionToken, {
    ...account,
    access_token: outcome.accessToken,
    // Keycloak returns a new id_token here too. Keeping it current matters
    // beyond this call: sign-out sends it as `id_token_hint`, and a stale one
    // makes Keycloak fall back to its "Do you want to log out?" page
    // (guarded by frontend/e2e/sign-in-out.spec.ts).
    id_token: outcome.idToken ?? account.id_token,
    refresh_token: outcome.refreshToken ?? account.refresh_token,
    expires_at: outcome.expiresAt,
  });

  return outcome.accessToken;
};

/** An account with no recorded expiry is treated as usable, not as expired. */
const hasExpired = (expiresAt: number | undefined | null): boolean =>
  typeof expiresAt === "number" && expiresAt - EXPIRY_LEEWAY_SECONDS <= Date.now() / 1000;
