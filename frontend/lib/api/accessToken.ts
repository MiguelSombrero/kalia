import { auth } from "@/auth";
import { getStoredAccountByUserId } from "@/lib/auth/valkeyAdapter";

/**
 * Treats a token expiring within this window as already expired, so one that
 * dies in flight is not sent.
 */
const EXPIRY_LEEWAY_SECONDS = 10;

/**
 * The signed-in user's Keycloak access token, or undefined when there is no
 * usable one — the normal case for the public catalog (ADR-0028).
 *
 * Do not drop the expiry check. Keycloak's access tokens live 300 seconds
 * (measured against the realm's `accessTokenLifespan`) while the Auth.js
 * session lives far longer, and nothing renews them until iteration 4 task 8
 * adds silent refresh. Sending an expired token is worse than sending none:
 * Spring Security authenticates a bearer token before it checks whether the
 * route is public, so an expired one turns even the anonymous catalog into a
 * 401 — verified by curl against the running stack.
 */
export const currentAccessToken = async (): Promise<string | undefined> => {
  const session = await auth();
  if (!session?.user?.id) {
    return undefined;
  }
  const account = await getStoredAccountByUserId(session.user.id);
  if (!account?.access_token) {
    return undefined;
  }
  if (hasExpired(account.expires_at)) {
    return undefined;
  }
  return account.access_token;
};

/** An account with no recorded expiry is treated as usable, not as expired. */
const hasExpired = (expiresAt: number | undefined | null): boolean =>
  typeof expiresAt === "number" && expiresAt - EXPIRY_LEEWAY_SECONDS <= Date.now() / 1000;
