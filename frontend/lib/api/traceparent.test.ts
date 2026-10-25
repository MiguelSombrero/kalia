import { describe, expect, it } from "vitest";
import { newTraceparent, traceIdOf, traceparentFor } from "./traceparent";

const VALID = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

describe("traceIdOf", () => {
  it("reads the trace id of a valid header", () => {
    expect(traceIdOf(VALID)).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
  });

  it("accepts upper case and surrounding whitespace, as the spec's own lower-casing rule implies", () => {
    expect(traceIdOf(`  ${VALID.toUpperCase()} `)).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
  });

  it.each([
    ["absent", undefined],
    ["null", null],
    ["empty", ""],
    ["a version other than 00", VALID.replace(/^00/, "01")],
    ["a short trace id", "00-4bf92f3577b34da6-00f067aa0ba902b7-01"],
    ["a non-hex trace id", VALID.replace("4bf9", "zzzz")],
    ["an all-zero trace id", "00-00000000000000000000000000000000-00f067aa0ba902b7-01"],
    ["an all-zero span id", "00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01"],
    ["trailing data", `${VALID}-extra`],
  ])("rejects %s", (_, header) => {
    expect(traceIdOf(header)).toBeUndefined();
  });
});

describe("newTraceparent", () => {
  it("is a valid sampled header whose trace id it reports", () => {
    const { header, traceId } = newTraceparent();

    expect(header).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(traceIdOf(header)).toBe(traceId);
  });

  it("starts a different trace each time", () => {
    expect(newTraceparent().traceId).not.toBe(newTraceparent().traceId);
  });
});

describe("traceparentFor", () => {
  it("forwards a valid incoming header unchanged, span id included", () => {
    expect(traceparentFor(VALID)).toEqual({
      header: VALID,
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    });
  });

  it.each([undefined, null, "", "garbage"])("starts a new trace for %s", (incoming) => {
    const { header, traceId } = traceparentFor(incoming);

    expect(traceIdOf(header)).toBe(traceId);
    expect(header).not.toBe(incoming);
  });
});
