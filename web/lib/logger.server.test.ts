// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger on the server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  const recordFrom = (spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> => {
    expect(spy).toHaveBeenCalledOnce();
    const [line, ...rest] = spy.mock.calls[0] as unknown[];
    expect(rest).toEqual([]);
    expect(typeof line).toBe("string");
    return JSON.parse(line as string) as Record<string, unknown>;
  };

  it("writes one JSON object per call, with level, time and message", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    logger.info("Backend call completed", { traceId: "abc", status: 200 });

    const record = recordFrom(spy);
    expect(record).toMatchObject({
      level: "info",
      msg: "Backend call completed",
      traceId: "abc",
      status: 200,
    });
    expect(new Date(record.time as string).toISOString()).toBe(record.time);
  });

  it("writes an Error as its message plus a structured error with the stack", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error(new RangeError("out of range"));

    expect(recordFrom(spy)).toMatchObject({
      level: "error",
      msg: "out of range",
      error: { name: "RangeError", message: "out of range", stack: expect.any(String) },
    });
  });

  it("serialises an Error passed as a field", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("Token refresh failed", { error: new TypeError("fetch failed") });

    expect(recordFrom(spy)).toMatchObject({ error: { name: "TypeError", message: "fetch failed" } });
  });

  it("still writes the line when a field cannot be serialised", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    logger.warn("odd field", { circular });

    expect(recordFrom(spy)).toMatchObject({ level: "warn", msg: "odd field" });
  });

  it("drops what is below LOG_LEVEL, and defaults to info", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    logger.debug("hidden");
    logger.info("shown");
    vi.stubEnv("LOG_LEVEL", "DEBUG");
    logger.debug("now shown");

    expect(info).toHaveBeenCalledOnce();
    expect(debug).toHaveBeenCalledOnce();
  });

  it("falls back to info for a LOG_LEVEL it does not know", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.stubEnv("LOG_LEVEL", "verbose");

    logger.debug("hidden");

    expect(debug).not.toHaveBeenCalled();
  });
});
