import { describe, expect, it } from "vitest";
import { verifyRequiredConfiguration } from "./requiredConfiguration";

const ALL_REQUIRED = {
  NODE_ENV: "production",
  BACKEND_URL: "http://backend:8080",
  AUTH_URL: "http://localhost:3000",
  AUTH_SECRET: "test-secret",
  AUTH_KEYCLOAK_ID: "kalia-frontend",
  AUTH_KEYCLOAK_SECRET: "test-secret",
  AUTH_KEYCLOAK_ISSUER: "http://localhost:8081/realms/kalia",
  AUTH_KEYCLOAK_INTERNAL_ORIGIN: "http://keycloak:8080",
  VALKEY_URL: "redis://valkey:6379",
};

describe("verifyRequiredConfiguration", () => {
  it("names the missing variable when running in production without it", () => {
    expect(() => verifyRequiredConfiguration({ NODE_ENV: "production" })).toThrow("BACKEND_URL");
  });

  it("names every missing variable, not just the first", () => {
    expect(() => verifyRequiredConfiguration({ NODE_ENV: "production" })).toThrow(
      "AUTH_KEYCLOAK_ISSUER",
    );
  });

  it("rejects a blank value rather than accepting it as configured", () => {
    expect(() =>
      verifyRequiredConfiguration({ ...ALL_REQUIRED, BACKEND_URL: "   " }),
    ).toThrow("BACKEND_URL");
  });

  it("passes when every required variable is set in production", () => {
    expect(() => verifyRequiredConfiguration(ALL_REQUIRED)).not.toThrow();
  });

  it("does not enforce the requirement outside production", () => {
    expect(() => verifyRequiredConfiguration({ NODE_ENV: "development" })).not.toThrow();
    expect(() => verifyRequiredConfiguration({})).not.toThrow();
  });
});
