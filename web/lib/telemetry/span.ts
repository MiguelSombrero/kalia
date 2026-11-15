import { type Attributes, context, type Span, SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = () => trace.getTracer("kalia-web");

// A name or attribute here is a route template or a closed set, never a path,
// a query or a token (ADR-0013): redactSpan.ts is the second line, not the first.
export const inSpan = async <T>(name: string, attributes: Attributes, work: (span: Span) => Promise<T>): Promise<T> =>
  tracer().startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await work(span);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });

export const activeTraceId = (): string | undefined => {
  const span = trace.getSpan(context.active());
  return span?.isRecording() ? span.spanContext().traceId : undefined;
};
