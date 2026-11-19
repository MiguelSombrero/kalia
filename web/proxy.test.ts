import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TRACE_ID_HEADER, traceIdOf } from "@/lib/api/traceparent";

import { config, proxy } from "./proxy";

const matches = (url: string): boolean => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it.each(["/", "/beers", "/cellar", "/cellars/olutharrastaja_88", "/apple-icons", "/iconic"])(
    "sends %s through the locale redirect",
    (url) => {
      expect(matches(url)).toBe(true);
    },
  );

  it.each(["/icon.svg", "/icon1", "/apple-icon", "/_next/static/chunk.js", "/api/auth/session", "/robots.txt"])(
    "leaves %s alone",
    (url) => {
      expect(matches(url)).toBe(false);
    },
  );
});

describe("proxy trace context", () => {
  const forwardedTraceparent = (headers: Record<string, string>): string | null => {
    const response = proxy(new NextRequest("http://localhost:3000/en/beers", { headers }));
    return response.headers.get("x-middleware-request-traceparent");
  };

  it("starts a trace for a request that arrives without one", () => {
    const forwarded = forwardedTraceparent({});

    expect(traceIdOf(forwarded)).toBeDefined();
  });

  it("keeps a valid traceparent the caller sent", () => {
    const sent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

    expect(forwardedTraceparent({ traceparent: sent })).toBe(sent);
  });

  it("replaces a malformed traceparent", () => {
    expect(traceIdOf(forwardedTraceparent({ traceparent: "garbage" }))).toBeDefined();
  });
});

describe("proxy trace id header", () => {
  const sent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
  const answerTo = (headers: Record<string, string>) =>
    proxy(new NextRequest("http://localhost:3000/en/beers", { headers }));

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("names the trace of the request in the local stack", () => {
    vi.stubEnv("KALIA_DEV_STACK", "true");

    expect(answerTo({ traceparent: sent }).headers.get(TRACE_ID_HEADER)).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
  });

  it("names the trace the proxy started when the caller sent none", () => {
    vi.stubEnv("KALIA_DEV_STACK", "true");

    expect(answerTo({}).headers.get(TRACE_ID_HEADER)).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is absent anywhere but the local stack", () => {
    vi.stubEnv("KALIA_DEV_STACK", "");

    expect(answerTo({ traceparent: sent }).headers.get(TRACE_ID_HEADER)).toBeNull();
  });
});
