import { afterEach, describe, expect, it, vi } from "vitest";
import { metrics } from "@/lib/metrics/metrics";
import { GET } from "./route";

const request = (authorization?: string) =>
  new Request("http://localhost:3000/api/metrics", {
    headers: authorization ? { Authorization: authorization } : {},
  });

describe("GET /api/metrics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    metrics.tokenRefreshFailures.reset();
  });

  it("does not exist while no METRICS_TOKEN is configured", async () => {
    vi.stubEnv("METRICS_TOKEN", "");

    expect((await GET(request("Bearer "))).status).toBe(404);
  });

  it("asks for a token when none is presented", async () => {
    vi.stubEnv("METRICS_TOKEN", "s3cret");

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
  });

  it("refuses a wrong token", async () => {
    vi.stubEnv("METRICS_TOKEN", "s3cret");

    expect((await GET(request("Bearer wrong"))).status).toBe(401);
  });

  it("serves the counters in Prometheus text format to the right token", async () => {
    vi.stubEnv("METRICS_TOKEN", "s3cret");
    metrics.tokenRefreshFailures.inc({ outcome: "unavailable", reason: "network" });

    const response = await GET(request("Bearer s3cret"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    const body = await response.text();
    expect(body).toContain(
      'kalia_token_refresh_failures_total{outcome="unavailable",reason="network"} 1',
    );
  });
});
