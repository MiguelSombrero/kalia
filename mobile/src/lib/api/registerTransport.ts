import { createFetchTransport, isApiError, registerTransport } from "@kalia/api";
import { getTokenStore } from "@/lib/auth/defaultTokenStore";
import type { TokenStore } from "@/lib/auth/tokenStore";
import { origins } from "@/lib/config/origins";

// A refresh that failed transiently must not fail a call that needs no token.
const unlessUnreachable = async (token: Promise<string | undefined>): Promise<string | undefined> => {
  try {
    return await token;
  } catch (cause) {
    if (isApiError(cause) && cause.kind === "network") {
      return undefined;
    }
    throw cause;
  }
};

export const registerMobileTransport = (tokenStore: TokenStore = getTokenStore()): void =>
  registerTransport(
    createFetchTransport({
      baseUrl: () => origins.api,
      accessToken: () => unlessUnreachable(tokenStore.getAccessToken()),
      refreshAccessToken: (rejected) => unlessUnreachable(tokenStore.refreshAccessToken(rejected)),
    }),
  );
