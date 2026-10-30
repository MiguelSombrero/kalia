import { listEntries } from "@kalia/api/generated/cellar/cellar";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { register } from "@/instrumentation";
import { currentSessionToken } from "@/lib/auth/sessionCookie";
import { getSessionAccount } from "@/lib/auth/valkeyAdapter";
import { logger } from "@/lib/logger";
import { metrics } from "@/lib/metrics/metrics";
import { currentTraceparent } from "./requestTrace";

vi.mock("@/lib/auth/valkeyAdapter", () => ({ getSessionAccount: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const incoming = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

// What a generated call does at startup in the running app: instrumentation.ts
// registers the web's transport, and nothing else does. The other tests in
// this suite register a stand-in in vitest.setup.ts, so this one clears it.
describe("the web's wiring of the shared generated client", () => {
  beforeEach(() => {
    (globalThis as Record<symbol, unknown>)[Symbol.for("@kalia/api.transport")] = undefined;
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("BACKEND_URL", "http://backend:8080");
    vi.mocked(currentSessionToken).mockResolvedValue("session-abc");
    vi.mocked(getSessionAccount).mockResolvedValue({
      access_token: "token-abc",
      expires_at: Math.floor(Date.now() / 1000) + 300,
    } as never);
    vi.mocked(currentTraceparent).mockResolvedValue(incoming);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.mocked(currentSessionToken).mockResolvedValue(undefined);
    vi.mocked(currentTraceparent).mockResolvedValue(undefined);
    vi.clearAllMocks();
    metrics.backendCallFailures.reset();
  });

  it("is not registered until instrumentation runs, and then a generated call carries the session's token and the request's trace", async () => {
    const fetchMock = vi.fn(async () => Response.json([]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listEntries()).rejects.toThrow(/No transport registered/);

    await register();
    const response = await listEntries();

    expect(response).toMatchObject({ status: 200, data: [] });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://backend:8080/api/v1/cellar");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-abc");
    expect(headers.get("traceparent")).toBe(incoming);
  });

  it("keeps logging every call under its trace id, and counting a server error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
    await register();

    await listEntries();

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      "Backend answered with a server error",
      expect.objectContaining({
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        path: "/api/v1/cellar",
        status: 503,
      }),
    );
    expect((await metrics.backendCallFailures.get()).values).toEqual([
      expect.objectContaining({ labels: { kind: "http_5xx" }, value: 1 }),
    ]);
  });
});
