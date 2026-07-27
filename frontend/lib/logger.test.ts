import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["debug", "info", "warn", "error"] as const)(
    "%s forwards message and extra args to console.%s",
    (level) => {
      const spy = vi.spyOn(console, level).mockImplementation(() => {});

      logger[level]("something happened", { detail: 1 });

      expect(spy).toHaveBeenCalledExactlyOnceWith("something happened", { detail: 1 });
    },
  );

  it("forwards a bare message with no extra args", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("boom");

    expect(spy).toHaveBeenCalledExactlyOnceWith("boom");
  });
});
