import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it("sends the standard security headers on every path, nosniff among them", async () => {
    const rules = await nextConfig.headers!();

    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/(.*)");
    expect(Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]))).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    expect(rules[0].headers.map(({ key }) => key)).toEqual(
      expect.arrayContaining(["Content-Security-Policy", "Strict-Transport-Security", "Permissions-Policy"]),
    );
  });

  it("does not advertise the framework", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
