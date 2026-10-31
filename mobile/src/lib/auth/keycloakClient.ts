import { AuthRequest, exchangeCodeAsync, refreshAsync } from "expo-auth-session";
import type { OAuthClient } from "./tokenStore";

const CLIENT_ID = "kalia-mobile";
const REDIRECT_URI = "kalia://auth/callback";
const REALM = "kalia";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_ACCESS_TOKEN_SECONDS = 300;

export const discoveryFor = (keycloakOrigin: string) => {
  const base = `${keycloakOrigin}/realms/${REALM}/protocol/openid-connect`;
  return {
    authorizationEndpoint: `${base}/auth`,
    tokenEndpoint: `${base}/token`,
    revocationEndpoint: `${base}/revoke`,
  };
};

const isInvalidGrant = (cause: unknown): boolean =>
  typeof cause === "object" && cause !== null && "code" in cause && cause.code === "invalid_grant";

// expo-auth-session's fetch has no timeout, and a hung refresh would hang every API call behind it.
const within = async <T>(work: Promise<T>, timeoutMs: number, what: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    return await Promise.race([work, expiry]);
  } finally {
    clearTimeout(timer);
  }
};

export const createKeycloakClient = ({
  keycloakOrigin,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  keycloakOrigin: string;
  timeoutMs?: number;
}): OAuthClient => {
  const discovery = discoveryFor(keycloakOrigin);

  return {
    authorize: async (locale) => {
      const request = new AuthRequest({
        clientId: CLIENT_ID,
        redirectUri: REDIRECT_URI,
        scopes: ["openid", "offline_access"],
        extraParams: { ui_locales: locale },
      });
      const result = await request.promptAsync(discovery);
      if (result.type === "cancel" || result.type === "dismiss") {
        return { kind: "cancelled" };
      }
      if (result.type !== "success" || !result.params.code || !request.codeVerifier) {
        throw new Error(`Sign-in did not return a code (${result.type})`);
      }
      const token = await within(
        exchangeCodeAsync(
          {
            clientId: CLIENT_ID,
            code: result.params.code,
            redirectUri: REDIRECT_URI,
            extraParams: { code_verifier: request.codeVerifier },
          },
          discovery,
        ),
        timeoutMs,
        "The code exchange",
      );
      return {
        kind: "granted",
        grant: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresInSeconds: token.expiresIn ?? DEFAULT_ACCESS_TOKEN_SECONDS,
        },
      };
    },

    refresh: async (refreshToken) => {
      try {
        const token = await within(
          refreshAsync({ clientId: CLIENT_ID, refreshToken }, discovery),
          timeoutMs,
          "The refresh",
        );
        return {
          kind: "granted",
          grant: {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresInSeconds: token.expiresIn ?? DEFAULT_ACCESS_TOKEN_SECONDS,
          },
        };
      } catch (cause) {
        if (isInvalidGrant(cause)) {
          return { kind: "rejected" };
        }
        throw cause;
      }
    },

    // Not revokeAsync: it reports success for any HTTP status.
    revoke: async (refreshToken) => {
      const response = await within(
        fetch(discovery.revocationEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            token: refreshToken,
            token_type_hint: "refresh_token",
          }).toString(),
        }),
        timeoutMs,
        "The revocation",
      );
      if (!response.ok) {
        throw new Error(`Keycloak refused the revocation with status ${response.status}`);
      }
    },
  };
};
