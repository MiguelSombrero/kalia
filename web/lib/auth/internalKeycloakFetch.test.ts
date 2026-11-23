import { afterEach, describe, expect, it, vi } from "vitest";

import { createInternalKeycloakFetch, KEYCLOAK_DEADLINE_MS } from "./internalKeycloakFetch";

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
      { signal: expect.any(AbortSignal) },
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
      { method: "POST", signal: expect.any(AbortSignal) },
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

    expect(fetchMock).toHaveBeenCalledWith(new URL("http://backend:8080/api/v1/beers"), {
      signal: expect.any(AbortSignal),
    });
  });

  describe("the deadline", () => {
    const signalOf = (fetchMock: { mock: { calls: unknown[][] } }) =>
      (fetchMock.mock.calls[0]![1] as RequestInit).signal!;

    const create = () => createInternalKeycloakFetch("http://localhost:8081", "http://keycloak:8080");

    afterEach(() => {
      vi.useRealTimers();
    });

    it("aborts a request, with a TimeoutError, once the budget has passed", async () => {
      vi.useFakeTimers();
      const fetchMock = vi.fn(async () => new Response("ok"));
      vi.stubGlobal("fetch", fetchMock);

      await create()("http://localhost:8081/realms/kalia/protocol/openid-connect/token");
      const signal = signalOf(fetchMock);
      expect(signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(KEYCLOAK_DEADLINE_MS);

      expect(signal.aborted).toBe(true);
      expect(signal.reason).toMatchObject({ name: "TimeoutError" });
    });

    it("still ends when the caller aborts first, and says why", async () => {
      const fetchMock = vi.fn(async () => new Response("ok"));
      vi.stubGlobal("fetch", fetchMock);
      const caller = new AbortController();

      await create()("http://localhost:8081/certs", { signal: caller.signal });
      caller.abort(new DOMException("left", "AbortError"));

      expect(signalOf(fetchMock).aborted).toBe(true);
      expect(signalOf(fetchMock).reason).toMatchObject({ name: "AbortError" });
    });

    it("does not keep the process alive for a request that has finished", async () => {
      const unref = vi.fn();
      vi.spyOn(globalThis, "setTimeout").mockImplementation((() => ({ unref })) as never);
      vi.stubGlobal("fetch", vi.fn(async () => new Response("ok")));

      await create()("http://localhost:8081/certs");

      expect(unref).toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });
});
