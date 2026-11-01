import { describe, expect, it } from "vitest";
import { stackOrigins } from "./stackOrigins";

describe("stackOrigins", () => {
  it("falls back to the default host ports", () => {
    expect(stackOrigins({})).toEqual({
      web: "http://localhost:3000",
      backend: "http://localhost:8080",
      keycloak: "http://localhost:8081",
      keycloakAdmin: "http://localhost:8083",
      mailpit: "http://localhost:8025",
      valkey: "redis://localhost:6379",
    });
  });

  it("builds every address from its own port variable", () => {
    expect(
      stackOrigins({
        WEB_PORT: "3100",
        BACKEND_PORT: "8180",
        KEYCLOAK_PORT: "8181",
        KEYCLOAK_ADMIN_PORT: "8183",
        MAILPIT_PORT: "8125",
        VALKEY_PORT: "6479",
      }),
    ).toEqual({
      web: "http://localhost:3100",
      backend: "http://localhost:8180",
      keycloak: "http://localhost:8181",
      keycloakAdmin: "http://localhost:8183",
      mailpit: "http://localhost:8125",
      valkey: "redis://localhost:6479",
    });
  });

  it("carries the Valkey password in the address, encoded", () => {
    expect(stackOrigins({ VALKEY_PASSWORD: "p@ss/word", VALKEY_PORT: "6479" }).valkey).toBe(
      "redis://:p%40ss%2Fword@localhost:6479",
    );
  });

  it("treats an empty value as unset", () => {
    expect(stackOrigins({ KEYCLOAK_PORT: "" }).keycloak).toBe("http://localhost:8081");
  });
});
