import type { SpanExporter } from "@opentelemetry/sdk-trace-base";

import { redactSpan } from "./redactSpan";

export const createRedactingExporter = (inner: SpanExporter): SpanExporter => ({
  export: (spans, resultCallback) => inner.export(spans.map(redactSpan), resultCallback),
  shutdown: () => inner.shutdown(),
  forceFlush: () => inner.forceFlush?.() ?? Promise.resolve(),
});
