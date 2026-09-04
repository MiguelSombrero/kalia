import { describe, expect, it } from "vitest";
import { buildCspHeader } from "./cspHeader";

describe("buildCspHeader", () => {
  it("allows React's development eval() when built for development", () => {
    const scriptSrc = buildCspHeader("development")
      .split(";")
      .find((directive) => directive.trim().startsWith("script-src"));

    expect(scriptSrc).toContain("'unsafe-eval'");
  });

  it("does not allow eval() when built for production", () => {
    const scriptSrc = buildCspHeader("production")
      .split(";")
      .find((directive) => directive.trim().startsWith("script-src"));

    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("does not allow eval() for any non-development environment", () => {
    const scriptSrc = buildCspHeader(undefined)
      .split(";")
      .find((directive) => directive.trim().startsWith("script-src"));

    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("keeps every other directive identical between development and production", () => {
    const stripScriptSrc = (header: string) =>
      header
        .split(";")
        .map((directive) => directive.trim())
        .filter((directive) => !directive.startsWith("script-src"))
        .join(";");

    expect(stripScriptSrc(buildCspHeader("development"))).toBe(
      stripScriptSrc(buildCspHeader("production")),
    );
  });

  it("builds the exact production header ADR-0016 requires, byte for byte", () => {
    expect(buildCspHeader("production")).toBe(
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; " +
        "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;",
    );
  });
});
