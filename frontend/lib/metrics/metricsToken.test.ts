import { describe, expect, it } from "vitest";
import { hasMetricsToken } from "./metricsToken";

describe("hasMetricsToken", () => {
  it("accepts the configured token as a bearer token", () => {
    expect(hasMetricsToken("Bearer s3cret", "s3cret")).toBe(true);
  });

  it.each([
    ["no header", null],
    ["an empty header", ""],
    ["another token", "Bearer other"],
    ["the token without the scheme", "s3cret"],
    ["a longer token with the right prefix", "Bearer s3cret-and-more"],
    ["another scheme", "Basic s3cret"],
  ])("rejects %s", (_, header) => {
    expect(hasMetricsToken(header, "s3cret")).toBe(false);
  });
});
