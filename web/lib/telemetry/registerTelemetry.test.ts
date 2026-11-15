import { registerOTel } from "@vercel/otel";
import { afterEach, describe, expect, it, vi } from "vitest";

import { registerTelemetry } from "./registerTelemetry";

vi.mock("@vercel/otel", async (importOriginal) => ({ ...(await importOriginal<typeof import("@vercel/otel")>()), registerOTel: vi.fn() }));

describe("registerTelemetry", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([{}, { OTEL_EXPORTER_OTLP_ENDPOINT: "" }, { OTEL_EXPORTER_OTLP_ENDPOINT: "  " }])(
    "starts nothing when no collector is configured (%j)",
    (env) => {
      expect(registerTelemetry(env)).toBe(false);
      expect(registerOTel).not.toHaveBeenCalled();
    },
  );

  it("exports the web's spans to the configured collector under its own service name", () => {
    expect(registerTelemetry({ OTEL_EXPORTER_OTLP_ENDPOINT: "http://lgtm:4318/" })).toBe(true);

    expect(registerOTel).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ serviceName: "web", traceExporter: expect.anything() }),
    );
  });

  it("leaves the backend's fetches to the span the transport starts for them", () => {
    registerTelemetry({ OTEL_EXPORTER_OTLP_ENDPOINT: "http://lgtm:4318", BACKEND_URL: "http://backend:8080" });

    expect(registerOTel).toHaveBeenCalledWith(
      expect.objectContaining({ instrumentationConfig: { fetch: { ignoreUrls: ["http://backend:8080"] } } }),
    );
  });
});
