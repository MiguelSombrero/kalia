import "server-only";
import { createFetchTransport, isAbortError, isApiError, pathOf, type Transport } from "@kalia/api";
import { logger } from "@/lib/logger";
import { metrics } from "@/lib/metrics/metrics";
import { currentAccessToken } from "./accessToken";
import { currentClientAddress } from "./requestClient";
import { currentTraceparent } from "./requestTrace";
import { traceparentFor } from "./traceparent";

const backendTransport = createFetchTransport({
  // Fallback is for npm run dev only; production requiring this is enforced
  // in instrumentation.ts, not here (ADR-0018).
  baseUrl: () => process.env.BACKEND_URL ?? "http://localhost:8080",
  accessToken: currentAccessToken,
});

/**
 * The web's transport, registered for the generated client at startup
 * (instrumentation.ts). It is `@kalia/api`'s fetch core with what is the
 * web's own around it: the session's token, the trace header, the client
 * address, metrics and logging.
 */
export const kaliaFetch: Transport = async <T,>(url: string, options: RequestInit): Promise<T> => {
  // One trace id per browser request, so every backend call a render makes
  // shares it (proxy.ts starts it); a call outside any request starts its own.
  const { header, traceId } = traceparentFor(await currentTraceparent());
  const call = { traceId, method: options.method ?? "GET", path: pathOf(url) };
  const started = performance.now();
  try {
    const result = await backendTransport<{ status: number }>(url, await withBffHeaders(options, header));
    recordCall(call, result.status, started);
    return result as T;
  } catch (cause) {
    if (!isAbortError(cause)) {
      recordFailure(call, cause, started);
    }
    throw cause;
  }
};

type Call = { traceId: string; method: string; path: string };

const recordCall = (call: Call, status: number, started: number): void => {
  const fields = { ...call, status, durationMs: Math.round(performance.now() - started) };
  if (status >= 500) {
    metrics.backendCallFailures.inc({ kind: "http_5xx" });
    logger.warn("Backend answered with a server error", fields);
  } else {
    logger.info("Backend call completed", fields);
  }
};

const recordFailure = (call: Call, cause: unknown, started: number): void => {
  const kind = isApiError(cause) ? cause.kind : "unexpected";
  metrics.backendCallFailures.inc({ kind });
  logger.warn("Backend call failed", {
    ...call,
    kind,
    durationMs: Math.round(performance.now() - started),
    error: cause,
  });
};

/**
 * Both headers are overwritten, never merged: the trace is this BFF's to
 * start or continue, and the backend sees this BFF as the peer — the person
 * behind it is the address the edge proxy forwarded (ADR-0090) — so neither
 * is something a caller of kaliaFetch chooses.
 */
const withBffHeaders = async (options: RequestInit, traceparent: string): Promise<RequestInit> => {
  const headers = new Headers(options.headers);
  headers.set("traceparent", traceparent);
  headers.delete("X-Forwarded-For");
  const clientAddress = await currentClientAddress();
  if (clientAddress) {
    headers.set("X-Forwarded-For", clientAddress);
  }
  return { ...options, headers };
};
