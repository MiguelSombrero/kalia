import { type Context, context, type ContextManager, ROOT_CONTEXT, SpanStatusCode, trace } from "@opentelemetry/api";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/logger";

import { kaliaFetch } from "./mutator";
import { currentTraceparent } from "./requestTrace";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("./requestTrace", () => ({ currentTraceparent: vi.fn(async () => undefined) }));

// What `cache` does for one render: the same value on every call until the next test.
let render = 0;
vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    cache: <T,>(fn: () => T) => {
      const perRender = new Map<number, T>();
      return () => {
        if (!perRender.has(render)) {
          perRender.set(render, fn());
        }
        return perRender.get(render) as T;
      };
    },
  };
});

// The SDK's own context managers are Node-only or live in packages this app does
// not depend on; a synchronous stack is all `context.with` needs for the span a
// call starts, which is created before its first await.
const createStackContextManager = (): ContextManager => {
  let current: Context = ROOT_CONTEXT;
  const manager: ContextManager = {
    active: () => current,
    with: (next, fn, thisArg, ...args) => {
      const previous = current;
      current = next;
      try {
        return fn.call(thisArg, ...args);
      } finally {
        current = previous;
      }
    },
    bind: (_context, target) => target,
    enable: () => manager,
    disable: () => manager,
  };
  return manager;
};

const exporter = new InMemorySpanExporter();
const incoming = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

beforeAll(() => {
  context.setGlobalContextManager(createStackContextManager());
  trace.setGlobalTracerProvider(new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }));
});

const inRequest = async <T,>(work: () => Promise<T>): Promise<{ result: T; requestSpanId: string; traceId: string }> => {
  const request = trace.getTracer("test").startSpan("GET /[locale]/beers/[id]");
  const { spanId, traceId } = request.spanContext();
  const result = await context.with(trace.setSpan(context.active(), request), work);
  request.end();
  return { result, requestSpanId: spanId, traceId };
};

const sentHeaders = (fetchMock: { mock: { calls: unknown[] } }, call = 0): Headers =>
  new Headers((fetchMock.mock.calls[call] as [string, RequestInit])[1].headers);

describe("kaliaFetch with a collector configured", () => {
  beforeEach(() => {
    render += 1;
    vi.stubEnv("BACKEND_URL", "http://backend:8080");
    vi.mocked(currentTraceparent).mockResolvedValue(incoming);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    exporter.reset();
  });

  it("makes each backend call a child span of the request and sends the backend that span as its parent", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    const { requestSpanId, traceId } = await inRequest(() => kaliaFetch("/api/v1/cellar", { method: "GET" }));

    const [call] = exporter.getFinishedSpans();
    expect(call.name).toBe("GET /api/v1/cellar");
    expect(call.parentSpanContext?.spanId).toBe(requestSpanId);
    expect(call.spanContext().traceId).toBe(traceId);
    expect(sentHeaders(fetchMock).get("traceparent")).toBe(`00-${traceId}-${call.spanContext().spanId}-01`);
    expect(call.attributes["http.response.status_code"]).toBe(200);
  });

  it("logs the call under the trace the collector shows, not the one proxy.ts started", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));

    const { traceId } = await inRequest(() => kaliaFetch("/api/v1/cellar", { method: "GET" }));

    expect(logger.info).toHaveBeenCalledExactlyOnceWith("Backend call completed", expect.objectContaining({ traceId }));
    expect(traceId).not.toBe("4bf92f3577b34da6a3ce929d0e0e4736");
  });

  it("names the call by its route template and records no user name or query string", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));

    await inRequest(() => kaliaFetch("/api/v1/users/ada-lovelace/cellars?search=westvleteren", { method: "GET" }));

    const [call] = exporter.getFinishedSpans();
    const recorded = JSON.stringify({ name: call.name, attributes: call.attributes, events: call.events });
    expect(recorded).not.toContain("ada-lovelace");
    expect(recorded).not.toContain("westvleteren");
    expect(JSON.stringify(vi.mocked(logger.info).mock.calls)).not.toContain("ada-lovelace");
    expect(JSON.stringify(vi.mocked(logger.info).mock.calls)).not.toContain("westvleteren");
  });

  it("sends an identical GET in the same render the header the first one sent, so Next still memoizes it, in one span", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    await inRequest(async () => {
      await kaliaFetch("/api/v1/beers/42", { method: "GET" });
      await kaliaFetch("/api/v1/beers/42", { method: "GET" });
      await kaliaFetch("/api/v1/beers/43", { method: "GET" });
    });

    expect(sentHeaders(fetchMock, 1).get("traceparent")).toBe(sentHeaders(fetchMock, 0).get("traceparent"));
    expect(sentHeaders(fetchMock, 2).get("traceparent")).not.toBe(sentHeaders(fetchMock, 0).get("traceparent"));
    expect(exporter.getFinishedSpans().filter((span) => span.name.startsWith("GET /api/v1/beers"))).toHaveLength(2);
  });

  it("gives every write a span of its own", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    await inRequest(async () => {
      await kaliaFetch("/api/v1/cellar/bottles", { method: "POST", body: "{}" });
      await kaliaFetch("/api/v1/cellar/bottles", { method: "POST", body: "{}" });
    });

    expect(sentHeaders(fetchMock, 1).get("traceparent")).not.toBe(sentHeaders(fetchMock, 0).get("traceparent"));
    expect(exporter.getFinishedSpans().filter((span) => span.name.startsWith("POST"))).toHaveLength(2);
  });

  it("ends the span without an error when the caller aborts", async () => {
    const abort = new DOMException("The operation was aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(abort)));

    await inRequest(() => kaliaFetch("/api/v1/beers", { method: "GET" })).catch(() => undefined);

    const [call] = exporter.getFinishedSpans().filter((span) => span.name.startsWith("GET /api/v1"));
    expect(call.status.code).toBe(SpanStatusCode.UNSET);
    expect(call.attributes["kalia.backend.failure"]).toBeUndefined();
  });

  it("marks the span failed when the backend answers with a server error or cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
    await inRequest(() => kaliaFetch("/api/v1/cellar", { method: "GET" }));
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    await inRequest(() => kaliaFetch("/api/v1/beers", { method: "GET" })).catch(() => undefined);

    const [unavailable, unreachable] = exporter.getFinishedSpans().filter((span) => span.name.startsWith("GET /api/v1"));
    expect(unavailable.status.code).toBe(SpanStatusCode.ERROR);
    expect(unreachable.status.code).toBe(SpanStatusCode.ERROR);
    expect(unreachable.attributes["kalia.backend.failure"]).toBe("network");
  });
});
