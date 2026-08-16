import type { AdapterAccount } from "next-auth/adapters";
import { endLocalSession } from "@/lib/auth/endLocalSession";
import { refreshAccessToken } from "@/lib/auth/refreshAccessToken";
import { currentSessionToken } from "@/lib/auth/sessionCookie";
import { getSessionAccount, updateSessionAccount } from "@/lib/auth/valkeyAdapter";

// Renews this far ahead of expiry, so a token that would die in flight is
// replaced rather than sent.
const EXPIRY_LEEWAY_SECONDS = 10;

// Renews the token first when expired; `undefined` when there is none
// (ADR-0028, ADR-0029) — see frontend/README.md's "kaliaFetch attaches the
// bearer token" rule for why sending an expired one is wrong.
export const currentAccessToken = async (): Promise<string | undefined> => {
  const sessionToken = await currentSessionToken();
  if (!sessionToken) {
    return undefined;
  }
  // Keyed by session, not user (ADR-0030) — another device's tokens must
  // never answer for this one's.
  const account = await getSessionAccount(sessionToken);
  if (!account?.access_token) {
    return undefined;
  }
  if (!hasExpired(account.expires_at)) {
    return account.access_token;
  }
  return renew(sessionToken, account);
};

// Concurrent renewals race deliberately: Keycloak's realm allows refresh-token
// reuse (`revokeRefreshToken: false`), so the last write wins. Enabling
// rotation there would make this need a lock.
const renew = async (
  sessionToken: string,
  account: AdapterAccount,
): Promise<string | undefined> => {
  if (!account.refresh_token) {
    return undefined;
  }

  const outcome = await refreshAccessToken(account.refresh_token);

  if (outcome.status === "unavailable") {
    // Keycloak unreachable or answering oddly — session left alone, only
    // this request goes without a token.
    return undefined;
  }

  if (outcome.status === "rejected") {
    await endLocalSession(sessionToken);
    return undefined;
  }

  await updateSessionAccount(sessionToken, {
    ...account,
    access_token: outcome.accessToken,
    // Keycloak returns a fresh id_token too; a stale one breaks sign-out's
    // id_token_hint (guarded by frontend/e2e/sign-in-out.spec.ts).
    id_token: outcome.idToken ?? account.id_token,
    refresh_token: outcome.refreshToken ?? account.refresh_token,
    expires_at: outcome.expiresAt,
  });

  return outcome.accessToken;
};

/** An account with no recorded expiry is treated as usable, not as expired. */
const hasExpired = (expiresAt: number | undefined | null): boolean =>
  typeof expiresAt === "number" && expiresAt - EXPIRY_LEEWAY_SECONDS <= Date.now() / 1000;
