import { describe, expect, it } from "vitest";
import { stackOrigins } from "./stackOrigins";

describe("stackOrigins", () => {
  it("falls back to the default host ports", () => {
    expect(stackOrigins({})).toEqual({
      frontend: "http://localhost:3000",
      backend: "http://localhost:8080",
      keycloak: "http://localhost:8081",
      mailpit: "http://localhost:8025",
      valkey: "redis://localhost:6379",
    });
  });

  it("builds every address from its own port variable", () => {
    expect(
      stackOrigins({
        FRONTEND_PORT: "3100",
        BACKEND_PORT: "8180",
        KEYCLOAK_PORT: "8181",
        MAILPIT_PORT: "8125",
        VALKEY_PORT: "6479",
      }),
    ).toEqual({
      frontend: "http://localhost:3100",
      backend: "http://localhost:8180",
      keycloak: "http://localhost:8181",
      mailpit: "http://localhost:8125",
      valkey: "redis://localhost:6479",
    });
  });

  it("treats an empty value as unset", () => {
    expect(stackOrigins({ KEYCLOAK_PORT: "" }).keycloak).toBe("http://localhost:8081");
  });
});
