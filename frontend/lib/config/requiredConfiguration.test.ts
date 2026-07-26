import { describe, expect, it } from "vitest";
import { verifyRequiredConfiguration } from "./requiredConfiguration";

describe("verifyRequiredConfiguration", () => {
  it("names the missing variable when running in production without it", () => {
    expect(() => verifyRequiredConfiguration({ NODE_ENV: "production" })).toThrow("BACKEND_URL");
  });

  it("rejects a blank value rather than accepting it as configured", () => {
    expect(() =>
      verifyRequiredConfiguration({ NODE_ENV: "production", BACKEND_URL: "   " }),
    ).toThrow("BACKEND_URL");
  });

  it("passes when every required variable is set in production", () => {
    expect(() =>
      verifyRequiredConfiguration({ NODE_ENV: "production", BACKEND_URL: "http://backend:8080" }),
    ).not.toThrow();
  });

  it("does not enforce the requirement outside production", () => {
    expect(() => verifyRequiredConfiguration({ NODE_ENV: "development" })).not.toThrow();
    expect(() => verifyRequiredConfiguration({})).not.toThrow();
  });
});
