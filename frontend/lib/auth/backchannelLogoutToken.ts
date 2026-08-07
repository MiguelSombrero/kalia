import { createRemoteJWKSet, customFetch, jwtVerify } from "jose";
import { createInternalKeycloakFetch } from "./internalKeycloakFetch";

/** OpenID Connect Back-Channel Logout 1.0 §2.4's fixed member name. */
const BACKCHANNEL_LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout";

export type LogoutTokenValidation = { status: "valid"; sid: string } | { status: "invalid" };

// Module-scoped, matching auth.ts's own createInternalKeycloakFetch: jose
// caches the fetched key set in memory and re-fetches only per its own
// cooldown, so a fresh instance per call would defeat that.
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

const remoteJwks = () => {
  if (!jwks) {
    const issuer = process.env.AUTH_KEYCLOAK_ISSUER!;
    const internalOrigin = process.env.AUTH_KEYCLOAK_INTERNAL_ORIGIN!;
    // The container can't dial Keycloak's public origin either, same split
    // auth.ts documents for the token exchange.
    jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`), {
      [customFetch]: createInternalKeycloakFetch(issuer, internalOrigin),
    });
  }
  return jwks;
};

/**
 * Validates a Back-Channel Logout token per OpenID Connect Back-Channel
 * Logout 1.0 §2.6: a valid signature from Keycloak's own key set, the
 * expected issuer and audience, and the claims that tell a Logout Token
 * apart from an ID Token reused as one — an `events` claim naming the
 * backchannel-logout event, and no `nonce` claim (ADR-0031). `sid` is
 * required here, not just recommended, because it's the only key the local
 * session index (valkeyAdapter.ts) can look sessions up by.
 */
export const validateLogoutToken = async (logoutToken: string): Promise<LogoutTokenValidation> => {
  try {
    const { payload } = await jwtVerify(logoutToken, remoteJwks(), {
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
      audience: process.env.AUTH_KEYCLOAK_ID,
      // Belt-and-braces alongside the JWKS's own kty-based key selection,
      // which already can't resolve an HS256 header to one of Keycloak's RSA
      // keys: pins out the algorithm-confusion class of attack explicitly
      // rather than relying on that alone.
      algorithms: ["RS256"],
    });

    if (payload.nonce !== undefined) {
      return { status: "invalid" };
    }

    const events = payload.events;
    if (typeof events !== "object" || events === null || !(BACKCHANNEL_LOGOUT_EVENT in events)) {
      return { status: "invalid" };
    }

    if (typeof payload.sid !== "string") {
      return { status: "invalid" };
    }

    return { status: "valid", sid: payload.sid };
  } catch {
    return { status: "invalid" };
  }
};
