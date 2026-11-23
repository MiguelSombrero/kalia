import { SpanStatusCode, trace } from "@opentelemetry/api";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/logger";
import { metrics } from "@/lib/metrics/metrics";

import { KEYCLOAK_DEADLINE_MS } from "./internalKeycloakFetch";
import { refreshAccessToken } from "./refreshAccessToken";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

/** The failure counter's samples, as `{labels, value}` pairs. */
const failureCounts = async () =>
  (await metrics.tokenRefreshFailures.get()).values.map(({ labels, value }) => ({ labels, value }));

const tokenResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const stubFetch = (response: Response | Error) => {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) {
      throw response;
    }
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

/** A fetch whose request never completes unless its signal aborts it, as a real one does. */
const hungUntilAborted = () =>
  vi.fn(
    (_url: unknown, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      }),
  );

describe("refreshAccessToken", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_KEYCLOAK_ISSUER", "http://localhost:8081/realms/kalia");
    vi.stubEnv("AUTH_KEYCLOAK_INTERNAL_ORIGIN", "http://keycloak:8080");
    vi.stubEnv("AUTH_KEYCLOAK_ID", "kalia-web");
    vi.stubEnv("AUTH_KEYCLOAK_SECRET", "kalia-dev-secret");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    metrics.tokenRefreshFailures.reset();
  });

  it("exchanges the refresh token for a fresh set", async () => {
    stubFetch(
      tokenResponse({
        access_token: "new-access",
        refresh_token: "new-refresh",
        id_token: "new-id",
        expires_in: 300,
      }),
    );

    const before = Math.floor(Date.now() / 1000);
    const outcome = await refreshAccessToken("old-refresh");

    expect(outcome).toMatchObject({
      status: "renewed",
      accessToken: "new-access",
      refreshToken: "new-refresh",
      idToken: "new-id",
    });
    expect(outcome.status === "renewed" && outcome.expiresAt).toBeGreaterThanOrEqual(before + 300);
  });

  it("posts the refresh grant to Keycloak's internal origin", async () => {
    const fetchMock = stubFetch(tokenResponse({ access_token: "new-access", expires_in: 300 }));

    await refreshAccessToken("old-refresh");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    // The public issuer is what Auth.js validates identity against; only the
    // bytes go to the internal origin (lib/auth/internalKeycloakFetch.ts).
    expect(url.toString()).toBe("http://keycloak:8080/realms/kalia/protocol/openid-connect/token");
    expect(init.method).toBe("POST");
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
      grant_type: "refresh_token",
      refresh_token: "old-refresh",
      client_id: "kalia-web",
      client_secret: "kalia-dev-secret",
    });
  });

  it("keeps the caller's existing refresh and id tokens when Keycloak returns none", async () => {
    stubFetch(tokenResponse({ access_token: "new-access", expires_in: 300 }));

    await expect(refreshAccessToken("old-refresh")).resolves.toMatchObject({
      status: "renewed",
      refreshToken: undefined,
      idToken: undefined,
    });
  });

  it("reports invalid_grant as rejected, so the caller ends the session", async () => {
    stubFetch(tokenResponse({ error: "invalid_grant" }, 400));

    await expect(refreshAccessToken("dead-refresh")).resolves.toEqual({ status: "rejected" });
  });

  // Load-bearing: treating our own misconfiguration as a dead grant would sign
  // every user out over a bad client secret.
  it("reports a client-configuration error as unavailable, not rejected", async () => {
    stubFetch(tokenResponse({ error: "invalid_client" }, 401));

    await expect(refreshAccessToken("old-refresh")).resolves.toEqual({ status: "unavailable" });
  });

  it("reports an unreachable Keycloak as unavailable", async () => {
    stubFetch(new TypeError("fetch failed"));

    await expect(refreshAccessToken("old-refresh")).resolves.toEqual({ status: "unavailable" });
  });

  it("reports a server error as unavailable", async () => {
    stubFetch(new Response("upstream exploded", { status: 502 }));

    await expect(refreshAccessToken("old-refresh")).resolves.toEqual({ status: "unavailable" });
  });

  it("rejects a 200 that is not a token response rather than storing a bogus token", async () => {
    stubFetch(tokenResponse({ access_token: "new-access" }));

    await expect(refreshAccessToken("old-refresh")).resolves.toEqual({ status: "unavailable" });
  });

  it("reports unavailable when the Keycloak client is not configured", async () => {
    vi.stubEnv("AUTH_KEYCLOAK_SECRET", "");
    const fetchMock = stubFetch(tokenResponse({ access_token: "new-access", expires_in: 300 }));

    await expect(refreshAccessToken("old-refresh")).resolves.toEqual({ status: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  describe("when the refresh does not yield a token", () => {
    it("logs a rejected grant at WARN and counts it", async () => {
      stubFetch(tokenResponse({ error: "invalid_grant" }, 400));

      await refreshAccessToken("dead-refresh");

      expect(logger.warn).toHaveBeenCalledExactlyOnceWith("Token refresh failed", {
        outcome: "rejected",
        reason: "invalid_grant",
        status: 400,
      });
      expect(await failureCounts()).toEqual([
        { labels: { outcome: "rejected", reason: "invalid_grant" }, value: 1 },
      ]);
    });

    it("logs an unreachable Keycloak at WARN and counts it", async () => {
      const unreachable = new TypeError("fetch failed");
      stubFetch(unreachable);

      await refreshAccessToken("old-refresh");

      expect(logger.warn).toHaveBeenCalledExactlyOnceWith("Token refresh failed", {
        outcome: "unavailable",
        reason: "network",
        error: unreachable,
      });
      expect(await failureCounts()).toEqual([
        { labels: { outcome: "unavailable", reason: "network" }, value: 1 },
      ]);
    });

    it("counts a Keycloak that never answers as a timeout, not as unreachable", async () => {
      vi.useFakeTimers();
      try {
        vi.stubGlobal("fetch", hungUntilAborted());

        const outcome = refreshAccessToken("old-refresh");
        await vi.advanceTimersByTimeAsync(KEYCLOAK_DEADLINE_MS);

        await expect(outcome).resolves.toEqual({ status: "unavailable" });
        expect(await failureCounts()).toEqual([
          { labels: { outcome: "unavailable", reason: "timeout" }, value: 1 },
        ]);
      } finally {
        vi.useRealTimers();
      }
    });

    it("counts a token response that stalls part-way through its body as a timeout", async () => {
      vi.useFakeTimers();
      try {
        vi.stubGlobal(
          "fetch",
          vi.fn(async (_url: unknown, init?: RequestInit) => {
            const stalled = new ReadableStream({
              start: (controller) => {
                init?.signal?.addEventListener("abort", () => controller.error(init.signal?.reason));
              },
            });
            return new Response(stalled, { status: 200 });
          }),
        );

        const outcome = refreshAccessToken("old-refresh");
        await vi.advanceTimersByTimeAsync(KEYCLOAK_DEADLINE_MS);

        await expect(outcome).resolves.toEqual({ status: "unavailable" });
        expect(await failureCounts()).toEqual([
          { labels: { outcome: "unavailable", reason: "timeout" }, value: 1 },
        ]);
      } finally {
        vi.useRealTimers();
      }
    });

    it.each([
      ["a server error", () => new Response("upstream exploded", { status: 502 }), "http_error"],
      ["a client-configuration error", () => tokenResponse({ error: "invalid_client" }, 401), "http_error"],
      ["a 200 that is not a token response", () => tokenResponse({ access_token: "x" }), "malformed_response"],
      ["a 200 that is not JSON", () => new Response("<html>", { status: 200 }), "unreadable_response"],
    ])("logs %s at WARN and counts it as unavailable", async (_, response, reason) => {
      stubFetch(response());

      await refreshAccessToken("old-refresh");

      expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
        "Token refresh failed",
        expect.objectContaining({ outcome: "unavailable", reason }),
      );
      expect(await failureCounts()).toEqual([
        { labels: { outcome: "unavailable", reason }, value: 1 },
      ]);
    });

    it("logs a missing Keycloak client configuration, which would otherwise look like anonymous browsing", async () => {
      vi.stubEnv("AUTH_KEYCLOAK_SECRET", "");
      stubFetch(tokenResponse({}));

      await refreshAccessToken("old-refresh");

      expect(logger.warn).toHaveBeenCalledExactlyOnceWith("Token refresh failed", {
        outcome: "unavailable",
        reason: "not_configured",
      });
    });

    it("never puts a token in the log line", async () => {
      stubFetch(tokenResponse({ error: "invalid_grant" }, 400));

      await refreshAccessToken("secret-refresh-token");

      expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain("secret-refresh-token");
    });
  });

  it("neither logs nor counts a successful refresh", async () => {
    stubFetch(tokenResponse({ access_token: "new-access", expires_in: 300 }));

    await refreshAccessToken("old-refresh");

    expect(logger.warn).not.toHaveBeenCalled();
    expect(await failureCounts()).toEqual([]);
  });
});

const exporter = new InMemorySpanExporter();

describe("refreshAccessToken's span", () => {
  beforeAll(() => {
    trace.setGlobalTracerProvider(new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }));
  });

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

    const span = exporter.getFinishedSpans()[0]!;
    expect(span.name).toBe("token refresh");
    expect(span.attributes["kalia.token_refresh.outcome"]).toBe("renewed");
    expect(span.status.code).toBe(SpanStatusCode.UNSET);
  });

  it("marks a refresh that did not yield a token as an error, naming no token", async () => {
    configured();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));

    await refreshAccessToken("old-refresh");

    const span = exporter.getFinishedSpans()[0]!;
    expect(span.attributes["kalia.token_refresh.outcome"]).toBe("unavailable");
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(JSON.stringify(span.attributes)).not.toContain("old-refresh");
  });
});
