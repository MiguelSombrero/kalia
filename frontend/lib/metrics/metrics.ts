import { Counter, Registry } from "prom-client";

type Metrics = {
  registry: Registry;
  tokenRefreshFailures: Counter<"outcome" | "reason">;
  backendCallFailures: Counter<"kind">;
  requestErrors: Counter<"route" | "route_type">;
};

const createMetrics = (): Metrics => {
  const registry = new Registry();
  return {
    registry,
    tokenRefreshFailures: new Counter({
      name: "kalia_token_refresh_failures_total",
      help: "Access-token refreshes that did not yield a new token",
      labelNames: ["outcome", "reason"],
      registers: [registry],
    }),
    backendCallFailures: new Counter({
      name: "kalia_backend_call_failures_total",
      help: "Calls to the backend that failed or answered 5xx",
      labelNames: ["kind"],
      registers: [registry],
    }),
    requestErrors: new Counter({
      name: "kalia_request_errors_total",
      help: "Requests this server failed with an unhandled error (a 5xx), by route",
      labelNames: ["route", "route_type"],
      registers: [registry],
    }),
  };
};

// Do not hold this at module level: Next.js compiles instrumentation.ts, route
// handlers and server components as separate bundles, which would each get a
// registry of their own and leave /api/metrics reading only its own counts.
const holder = globalThis as typeof globalThis & { __kaliaMetrics?: Metrics };

/** One set of counters per process (ADR-0088). */
export const metrics: Metrics = (holder.__kaliaMetrics ??= createMetrics());
