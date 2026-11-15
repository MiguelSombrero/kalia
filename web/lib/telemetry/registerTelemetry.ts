import { OTLPHttpProtoTraceExporter, registerOTel } from "@vercel/otel";

import { exportEndpoint } from "./exportEndpoint";
import { createRedactingExporter } from "./redactingExporter";

export const SERVICE_NAME = "web";

/** Whether a collector is configured and the SDK started; without one every tracing call is a no-op (ADR-0114). */
export const registerTelemetry = (env: Readonly<Record<string, string | undefined>>): boolean => {
  const endpoint = exportEndpoint(env);
  if (!endpoint) {
    return false;
  }
  registerOTel({
    serviceName: SERVICE_NAME,
    // Not the default "auto": it adds a second exporter that reads the same
    // endpoint from the environment and sends every span unredacted.
    spanProcessors: [],
    // A backend call is already a span of ours (lib/telemetry/backendCall.ts);
    // the fetch instrumentation's span for it would sit beside it saying the same.
    instrumentationConfig: { fetch: { ignoreUrls: env.BACKEND_URL ? [env.BACKEND_URL] : [] } },
    traceExporter: createRedactingExporter(
      new OTLPHttpProtoTraceExporter({ url: `${endpoint.replace(/\/+$/, "")}/v1/traces` }),
    ),
  });
  return true;
};
