import { context, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { cache } from "react";

export type BackendCall = {
  traceparent: string;
  traceId: string;
  run: <T>(work: () => Promise<T>) => Promise<T>;
  finish: (outcome: { status?: number; failure?: string }) => void;
};

type Started = { traceparent: string; traceId: string };

// One map per render. Next.js memoizes identical GETs by their headers as well
// as their URL, so a second call for the same beer must send the very header the
// first one did, or the detail page fetches it twice (see withTimeout in
// @kalia/api). The second call joins the first's span instead of starting one.
const getsOfRender = cache(() => new Map<string, Started>());

const traceparentOf = (traceId: string, spanId: string, flags: number): string =>
  `00-${traceId}-${spanId}-${flags.toString(16).padStart(2, "0")}`;

const joined = ({ traceparent, traceId }: Started): BackendCall => ({
  traceparent,
  traceId,
  run: (work) => work(),
  finish: () => {},
});

/**
 * A client span for one backend call and the header that makes the backend's
 * span its child; `undefined` when no collector is configured (ADR-0114).
 * `route` is `url`'s template: a URL never goes in a span (ADR-0013).
 */
export const startBackendCall = (method: string, url: string, route: string): BackendCall | undefined => {
  const repeatable = method === "GET";
  const earlier = repeatable ? getsOfRender().get(url) : undefined;
  if (earlier) {
    return joined(earlier);
  }
  const span = trace.getTracer("kalia-web").startSpan(
    `${method} ${route}`,
    { kind: SpanKind.CLIENT, attributes: { "http.request.method": method, "kalia.backend.route": route } },
    context.active(),
  );
  if (!span.isRecording()) {
    return undefined;
  }
  const { traceId, spanId, traceFlags } = span.spanContext();
  const started = { traceparent: traceparentOf(traceId, spanId, traceFlags), traceId };
  if (repeatable) {
    getsOfRender().set(url, started);
  }
  return {
    ...started,
    run: (work) => context.with(trace.setSpan(context.active(), span), work),
    finish: ({ status, failure }) => {
      if (status !== undefined) {
        span.setAttribute("http.response.status_code", status);
      }
      if (failure !== undefined) {
        span.setAttribute("kalia.backend.failure", failure);
      }
      if (failure !== undefined || (status !== undefined && status >= 500)) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      span.end();
    },
  };
};
