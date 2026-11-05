import {
  createFetchTransport,
  isApiError,
  pathOf,
  registerTransport,
  traceIdOfResponse,
  type Transport,
} from "@kalia/api";
import { getTokenStore } from "@/lib/auth/defaultTokenStore";
import type { TokenStore } from "@/lib/auth/tokenStore";
import { origins } from "@/lib/config/origins";
import { logError } from "@/lib/log/deviceLog";
import { startTrace } from "./traceparent";

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

// Method and path only: never the query string, a token or a body (ADR-0013).
const loggingFailures = (transport: Transport): Transport =>
  (async (url: string, options: RequestInit) => {
    const call = { method: options.method ?? "GET", path: pathOf(url) };
    try {
      const reply = await transport<{ status: number }>(url, options);
      if (reply.status >= 400) {
        logError("Request answered with an error status", {
          ...call,
          status: reply.status,
          traceId: traceIdOfResponse(reply),
        });
      }
      return reply;
    } catch (cause) {
      if (isApiError(cause)) {
        logError("Request failed", { ...call, kind: cause.kind, status: cause.status, traceId: cause.traceId });
      }
      throw cause;
    }
  }) as Transport;

export const registerMobileTransport = (tokenStore: TokenStore = getTokenStore()): void =>
  registerTransport(
    loggingFailures(
      createFetchTransport({
        baseUrl: () => origins.api,
        traceparent: startTrace,
        accessToken: () => unlessUnreachable(tokenStore.getAccessToken()),
        refreshAccessToken: (rejected) => unlessUnreachable(tokenStore.refreshAccessToken(rejected)),
      }),
    ),
  );
