import { createFetchTransport, isApiError, registerTransport, type Transport } from "@kalia/api";
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

// Origin only, never a path or token (ADR-0013).
const loggingUnreachableOrigin = (transport: Transport): Transport =>
  (async (url: string, options: RequestInit) => {
    try {
      return await transport(url, options);
    } catch (cause) {
      const noResponse = isApiError(cause) && cause.status === undefined && (cause.kind === "network" || cause.kind === "timeout");
      if (__DEV__ && noResponse) {
        // eslint-disable-next-line no-console -- the one development-only log: Metro's console is where it is read
        console.warn(`No response from ${origins.api}`);
      }
      throw cause;
    }
  }) as Transport;

export const registerMobileTransport = (tokenStore: TokenStore = getTokenStore()): void =>
  registerTransport(
    loggingUnreachableOrigin(
      createFetchTransport({
        baseUrl: () => origins.api,
        accessToken: () => unlessUnreachable(tokenStore.getAccessToken()),
        refreshAccessToken: (rejected) => unlessUnreachable(tokenStore.refreshAccessToken(rejected)),
      }),
    ),
  );
