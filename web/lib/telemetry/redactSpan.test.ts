import { type Attributes, ROOT_CONTEXT, SpanKind, trace } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  type ReadableSpan,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { describe, expect, it } from "vitest";

import { createRedactingExporter } from "./redactingExporter";
import { redactSpan, redactUrl } from "./redactSpan";

// What someone's request puts in front of the SDK: a search in the query, a
// session id the page was asked to carry in it, and a user name in the path.
const SECRETS = ["westvleteren", "sid-9f3c1a77", "ada-lovelace", "Bearer abc.def.ghi"];

const requestAttributes: Attributes = {
  "http.method": "GET",
  "http.target": "/en/cellars/ada-lovelace?search=westvleteren&sid=sid-9f3c1a77",
  "http.url": "http://localhost:3000/en/cellars/ada-lovelace?search=westvleteren&sid=sid-9f3c1a77",
  "http.request.header.cookie": "authjs.session-token=sid-9f3c1a77",
  "http.request.header.authorization": "Bearer abc.def.ghi",
  "http.status_code": 200,
  "next.span_name": "GET /[locale]/cellars/[username]",
  "next.span_type": "BaseServer.handleRequest",
  "next.route": "/[locale]/cellars/[username]",
};

const fetchAttributes: Attributes = {
  "http.method": "GET",
  "http.url": "http://backend:8080/api/v1/cellars/ada-lovelace?search=westvleteren",
  "net.peer.name": "backend",
  "net.peer.port": "8080",
  "next.span_type": "AppRender.fetch",
  "http.status_code": 200,
};

/** Spans of the kinds Next.js and its fetch instrumentation emit, through the real SDK. */
const recordedSpans = (): ReadableSpan[] => {
  const exporter = new InMemorySpanExporter();
  const tracer = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }).getTracer("test");
  const request = tracer.startSpan("GET /en/cellars/ada-lovelace", { kind: SpanKind.SERVER, attributes: requestAttributes });
  const call = tracer.startSpan(
    "fetch GET http://backend:8080/api/v1/cellars/ada-lovelace?search=westvleteren",
    { kind: SpanKind.CLIENT, attributes: fetchAttributes },
    trace.setSpan(ROOT_CONTEXT, request),
  );
  call.recordException(new Error("GET /api/v1/cellars/ada-lovelace?search=westvleteren failed: Bearer abc.def.ghi"));
  call.setStatus({ code: 2, message: "Bearer abc.def.ghi" });
  call.end();
  request.end();
  return exporter.getFinishedSpans();
};

const leaving = (spans: ReadableSpan[]): string =>
  JSON.stringify(
    spans.map((span) => ({ name: span.name, attributes: span.attributes, events: span.events, status: span.status })),
  );

describe("what leaves the process as a span", () => {
  it("is shown the secrets by the SDK's own defaults", () => {
    const raw = leaving(recordedSpans());

    for (const secret of SECRETS) {
      expect(raw).toContain(secret);
    }
  });

  it("holds no query string, session id, token or user name once redacted", () => {
    const redacted = leaving(recordedSpans().map(redactSpan));

    for (const secret of SECRETS) {
      expect(redacted).not.toContain(secret);
    }
  });

  it("keeps what a trace needs: the names, route templates, status and timing", () => {
    const [call, request] = recordedSpans().map(redactSpan);

    expect(request.name).toBe("GET /[locale]/cellars/[username]");
    expect(request.attributes).toMatchObject({
      "http.method": "GET",
      "http.status_code": 200,
      "http.target": "/[locale]/cellars/[username]",
      "next.route": "/[locale]/cellars/[username]",
    });
    expect(call.name).toBe("GET http://backend:8080/api/v1/cellars/{username}");
    expect(call.attributes["http.url"]).toBe("http://backend:8080/api/v1/cellars/{username}");
    expect(call.parentSpanContext?.spanId).toBe(request.spanContext().spanId);
    expect(call.duration).toHaveLength(2);
  });

  it("leaves a name that already is a template as it is", () => {
    const tracer = new BasicTracerProvider({ spanProcessors: [] }).getTracer("test");
    const call = tracer.startSpan("GET /api/v1/cellars/{username}", { attributes: { "http.request.method": "GET" } });
    call.end();

    expect(redactSpan(call as unknown as ReadableSpan).name).toBe("GET /api/v1/cellars/{username}");
  });

  it("is what the exporter hands on", () => {
    const received: ReadableSpan[][] = [];
    const exporter = createRedactingExporter({
      export: (spans, done) => {
        received.push(spans);
        done({ code: 0 });
      },
      shutdown: async () => {},
    });

    exporter.export(recordedSpans(), () => {});

    expect(received).toHaveLength(1);
    for (const secret of SECRETS) {
      expect(leaving(received[0])).not.toContain(secret);
    }
  });
});

describe("redactUrl", () => {
  it.each([
    ["http://backend:8080/api/v1/beers?search=a", "http://backend:8080/api/v1/beers"],
    ["http://backend:8080/api/v1/cellars/ada-lovelace", "http://backend:8080/api/v1/cellars/{username}"],
    ["http://keycloak:8080/realms/kalia/protocol/openid-connect/token?x=1", "http://keycloak:8080"],
    ["http://user:pass@backend:8080/api/v1/beers#frag", "http://backend:8080/api/v1/beers"],
    ["not a url", "unmatched"],
  ])("%s -> %s", (input, expected) => {
    expect(redactUrl(input)).toBe(expected);
  });
});
