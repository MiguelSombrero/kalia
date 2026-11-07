import {
  answersStatus,
  createFetchTransport,
  isApiError,
  registerTransport,
  routeTemplateOf,
  traceIdOfResponse,
  type CallOptions,
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

// ADR-0013: the route template, never the path, a query string, a token or a body.
const loggingFailures = (transport: Transport): Transport =>
  (async (url: string, options: CallOptions) => {
    const call = { method: options.method ?? "GET", path: routeTemplateOf(url) };
    try {
      const reply = await transport<{ status: number }>(url, options);
      if (reply.status >= 400 && !answersStatus(options, reply.status)) {
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
