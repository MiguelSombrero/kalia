import { SpanStatusCode, trace } from "@opentelemetry/api";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { refreshAccessToken } from "./refreshAccessToken";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const exporter = new InMemorySpanExporter();

beforeAll(() => {
  trace.setGlobalTracerProvider(new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }));
});

describe("refreshAccessToken's span", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    exporter.reset();
  });

  const configured = () => {
    vi.stubEnv("AUTH_KEYCLOAK_ISSUER", "http://localhost:8081/realms/kalia");
    vi.stubEnv("AUTH_KEYCLOAK_INTERNAL_ORIGIN", "http://keycloak:8080");
    vi.stubEnv("AUTH_KEYCLOAK_ID", "kalia-web");
    vi.stubEnv("AUTH_KEYCLOAK_SECRET", "secret");
  };

  it("records the outcome of a refresh that renewed the token, without an error", async () => {
    configured();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ access_token: "new", expires_in: 300 })));

    await refreshAccessToken("old-refresh");

    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe("token refresh");
    expect(span.attributes["kalia.token_refresh.outcome"]).toBe("renewed");
    expect(span.status.code).toBe(SpanStatusCode.UNSET);
  });

  it("marks a refresh that did not yield a token as an error, naming no token", async () => {
    configured();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));

    await refreshAccessToken("old-refresh");

    const [span] = exporter.getFinishedSpans();
    expect(span.attributes["kalia.token_refresh.outcome"]).toBe("unavailable");
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(JSON.stringify(span.attributes)).not.toContain("old-refresh");
  });
});
