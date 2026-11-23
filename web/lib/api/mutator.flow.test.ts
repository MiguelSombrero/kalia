import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { endLocalSession } from "@/lib/auth/endLocalSession";
import { KEYCLOAK_DEADLINE_MS } from "@/lib/auth/internalKeycloakFetch";
import { currentSessionToken } from "@/lib/auth/sessionCookie";
import { getSessionAccount, updateSessionAccount } from "@/lib/auth/valkeyAdapter";
import { metrics } from "@/lib/metrics/metrics";

import { kaliaFetch } from "./mutator";

vi.mock("@/lib/auth/valkeyAdapter", () => ({ getSessionAccount: vi.fn(), updateSessionAccount: vi.fn() }));
vi.mock("@/lib/auth/sessionCookie", () => ({ currentSessionToken: vi.fn() }));
vi.mock("@/lib/auth/endLocalSession", () => ({ endLocalSession: vi.fn() }));
vi.mock("./requestClient", () => ({ currentClientAddress: vi.fn(async () => undefined) }));
vi.mock("./requestTrace", () => ({ currentTraceparent: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("a render whose token has expired while Keycloak does not answer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("AUTH_KEYCLOAK_ISSUER", "http://localhost:8081/realms/kalia");
    vi.stubEnv("AUTH_KEYCLOAK_INTERNAL_ORIGIN", "http://keycloak:8080");
    vi.stubEnv("AUTH_KEYCLOAK_ID", "kalia-web");
    vi.stubEnv("AUTH_KEYCLOAK_SECRET", "kalia-dev-secret");
    vi.stubEnv("BACKEND_URL", "http://backend:8080");
    vi.mocked(currentSessionToken).mockResolvedValue("session-abc");
    vi.mocked(getSessionAccount).mockResolvedValue({
      access_token: "stale-access",
      refresh_token: "the-refresh",
      expires_at: Math.floor(Date.now() / 1000) - 1,
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    metrics.tokenRefreshFailures.reset();
  });

  it("sends its backend call without a token once the deadline passes, and keeps the session", async () => {
    const backendCalls: Headers[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: URL | string, init?: RequestInit) => {
        if (String(url).startsWith("http://backend:8080")) {
          backendCalls.push(new Headers(init?.headers));
          return Promise.resolve(Response.json([]));
        }
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        });
      }),
    );

    const call = kaliaFetch<{ status: number }>("/api/v1/beers", { method: "GET" });
    await vi.advanceTimersByTimeAsync(KEYCLOAK_DEADLINE_MS - 1);
    expect(backendCalls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);

    await expect(call).resolves.toMatchObject({ status: 200 });
    expect(backendCalls).toHaveLength(1);
    expect(backendCalls[0]!.has("Authorization")).toBe(false);
    expect(updateSessionAccount).not.toHaveBeenCalled();
    expect(endLocalSession).not.toHaveBeenCalled();
    expect((await metrics.tokenRefreshFailures.get()).values).toMatchObject([
      { labels: { outcome: "unavailable", reason: "timeout" }, value: 1 },
    ]);
  });
});
