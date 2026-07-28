import { afterEach, describe, expect, it, vi } from "vitest";
import { createInternalKeycloakFetch } from "./internalKeycloakFetch";

describe("createInternalKeycloakFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rewrites a request against the public origin to the internal one", async () => {
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const fetchViaInternal = createInternalKeycloakFetch(
      "http://localhost:8081",
      "http://keycloak:8080",
    );

    await fetchViaInternal("http://localhost:8081/realms/kalia/protocol/openid-connect/token");

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://keycloak:8080/realms/kalia/protocol/openid-connect/token"),
      undefined,
    );
  });

  it("preserves query parameters and request init options", async () => {
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const fetchViaInternal = createInternalKeycloakFetch(
      "http://localhost:8081",
      "http://keycloak:8080",
    );

    await fetchViaInternal("http://localhost:8081/realms/kalia/.well-known/openid-configuration?x=1", {
      method: "POST",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://keycloak:8080/realms/kalia/.well-known/openid-configuration?x=1"),
      { method: "POST" },
    );
  });

  it("leaves requests against a different origin untouched", async () => {
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const fetchViaInternal = createInternalKeycloakFetch(
      "http://localhost:8081",
      "http://keycloak:8080",
    );

    await fetchViaInternal("http://backend:8080/api/v1/beers");

    expect(fetchMock).toHaveBeenCalledWith(new URL("http://backend:8080/api/v1/beers"), undefined);
  });
});
