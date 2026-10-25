import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { traceIdOf } from "@/lib/api/traceparent";
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
