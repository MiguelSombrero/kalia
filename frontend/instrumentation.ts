import type { Instrumentation } from "next";
import { verifyRequiredConfiguration } from "@/lib/config/requiredConfiguration";
import { traceIdOf } from "@/lib/api/traceparent";
import { logger } from "@/lib/logger";

export const register = () => {
  // Next.js also invokes register() for the edge runtime (proxy.ts), where
  // process.exit doesn't exist — stay Node-only, per
  // node_modules/next/dist/docs/01-app/02-guides/instrumentation.md.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    verifyRequiredConfiguration(process.env);
  } catch (error) {
    // A thrown instrumentation hook does not stop the server from listening
    // (measured on next@16.2.10): it logs the error and answers every
    // request with a 500 instead. process.exit is what actually achieves
    // fail-fast here (ADR-0018).
    logger.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

// ADR-0088. Next.js calls this for every error it caught serving a request;
// `routePath` is the route template, so the label stays a closed set.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  // Imported here, not at the top: prom-client does not belong in the edge
  // bundle that this file is also compiled into.
  const { metrics } = await import("@/lib/metrics/metrics");
  metrics.requestErrors.inc({ route: context.routePath, route_type: context.routeType });
  logger.error(error, {
    route: context.routePath,
    routeType: context.routeType,
    method: request.method,
    traceId: traceIdOf(headerValue(request.headers.traceparent)),
  });
};

const headerValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;
