import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";
import { metrics } from "@/lib/metrics/metrics";
import { onRequestError } from "./instrumentation";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const request = {
  path: "/fi/beers/some-beer?query=westvleteren",
  method: "GET",
  headers: { traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" },
};

const context = {
  routerKind: "App Router",
  routePath: "/[locale]/beers/[id]",
  routeType: "render",
  renderSource: "react-server-components",
  revalidateReason: undefined,
  renderType: "dynamic",
} as const;

describe("onRequestError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    metrics.requestErrors.reset();
  });

  it("counts the failed request under its route template and logs it with its trace id", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const error = new Error("render failed");

    await onRequestError(error, request, context);

    expect((await metrics.requestErrors.get()).values).toEqual([
      expect.objectContaining({
        labels: { route: "/[locale]/beers/[id]", route_type: "render" },
        value: 1,
      }),
    ]);
    expect(logger.error).toHaveBeenCalledExactlyOnceWith(error, {
      route: "/[locale]/beers/[id]",
      routeType: "render",
      method: "GET",
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    });
  });

  it("does not put the URL, which carries what the user searched for, in the log", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");

    await onRequestError(new Error("render failed"), request, context);

    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain("westvleteren");
  });

  it("does nothing in the edge runtime, where prom-client does not run", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");

    await onRequestError(new Error("render failed"), request, context);

    expect(logger.error).not.toHaveBeenCalled();
  });
});
