import { AuthRequest, exchangeCodeAsync, refreshAsync } from "expo-auth-session";
import { createKeycloakClient, discoveryFor } from "./keycloakClient";

jest.mock("expo-auth-session", () => ({
  AuthRequest: jest.fn(),
  exchangeCodeAsync: jest.fn(),
  refreshAsync: jest.fn(),
}));

const ORIGIN = "http://keycloak.test";
const prompt = jest.fn();
const authRequest = jest.mocked(AuthRequest);
const exchange = jest.mocked(exchangeCodeAsync);
const refresh = jest.mocked(refreshAsync);

const tokenResponse = (overrides: Record<string, unknown> = {}) =>
  ({ accessToken: "access", refreshToken: "refresh", expiresIn: 300, ...overrides }) as never;

beforeEach(() => {
  jest.resetAllMocks();
  authRequest.mockImplementation(() => ({ promptAsync: prompt, codeVerifier: "verifier" }) as never);
});

describe("sign-in", () => {
  it("asks Keycloak's realm endpoints for an offline PKCE sign-in in the app's language", async () => {
    prompt.mockResolvedValue({ type: "cancel" });

    await createKeycloakClient({ keycloakOrigin: ORIGIN }).authorize("fi");

    expect(authRequest).toHaveBeenCalledWith({
      clientId: "kalia-mobile",
      redirectUri: "kalia://auth/callback",
      scopes: ["openid", "offline_access"],
      extraParams: { ui_locales: "fi" },
    });
    expect(prompt).toHaveBeenCalledWith({
      authorizationEndpoint: "http://keycloak.test/realms/kalia/protocol/openid-connect/auth",
      tokenEndpoint: "http://keycloak.test/realms/kalia/protocol/openid-connect/token",
      revocationEndpoint: "http://keycloak.test/realms/kalia/protocol/openid-connect/revoke",
    });
  });

  it.each(["cancel", "dismiss"])("treats a browser closed by the user (%s) as cancelled", async (type) => {
    prompt.mockResolvedValue({ type });

    await expect(createKeycloakClient({ keycloakOrigin: ORIGIN }).authorize("en")).resolves.toEqual({ kind: "cancelled" });
    expect(exchange).not.toHaveBeenCalled();
  });

  it("exchanges the returned code with the request's PKCE verifier", async () => {
    prompt.mockResolvedValue({ type: "success", params: { code: "the-code" } });
    exchange.mockResolvedValue(tokenResponse());

    const outcome = await createKeycloakClient({ keycloakOrigin: ORIGIN }).authorize("en");

    expect(exchange).toHaveBeenCalledWith(
      {
        clientId: "kalia-mobile",
        code: "the-code",
        redirectUri: "kalia://auth/callback",
        extraParams: { code_verifier: "verifier" },
      },
      discoveryFor(ORIGIN),
    );
    expect(outcome).toEqual({
      kind: "granted",
      grant: { accessToken: "access", refreshToken: "refresh", expiresInSeconds: 300 },
    });
  });

  it.each([
    ["an error result", { type: "error", params: {} }],
    ["a locked session", { type: "locked" }],
    ["a success without a code", { type: "success", params: {} }],
  ])("fails on %s", async (_name, result) => {
    prompt.mockResolvedValue(result);

    await expect(createKeycloakClient({ keycloakOrigin: ORIGIN }).authorize("en")).rejects.toThrow();
  });

  it("fails when the code exchange is refused", async () => {
    prompt.mockResolvedValue({ type: "success", params: { code: "the-code" } });
    exchange.mockRejectedValue(Object.assign(new Error("refused"), { code: "invalid_grant" }));

    await expect(createKeycloakClient({ keycloakOrigin: ORIGIN }).authorize("en")).rejects.toThrow("refused");
  });
});

describe("refresh", () => {
  it("returns the new tokens", async () => {
    refresh.mockResolvedValue(tokenResponse({ accessToken: "access-2", refreshToken: "refresh-2" }));

    await expect(createKeycloakClient({ keycloakOrigin: ORIGIN }).refresh("refresh-1")).resolves.toEqual({
      kind: "granted",
      grant: { accessToken: "access-2", refreshToken: "refresh-2", expiresInSeconds: 300 },
    });
    expect(refresh).toHaveBeenCalledWith({ clientId: "kalia-mobile", refreshToken: "refresh-1" }, discoveryFor(ORIGIN));
  });

  it("reports invalid_grant as a rejection", async () => {
    refresh.mockRejectedValue(Object.assign(new Error("Token is not active"), { code: "invalid_grant" }));

    await expect(createKeycloakClient({ keycloakOrigin: ORIGIN }).refresh("refresh-1")).resolves.toEqual({
      kind: "rejected",
    });
  });

  it.each([
    ["another OAuth error", Object.assign(new Error("down"), { code: "server_error" })],
    ["a network failure", new TypeError("Network request failed")],
  ])("rethrows %s, which is not a rejection", async (_name, failure) => {
    refresh.mockRejectedValue(failure);

    await expect(createKeycloakClient({ keycloakOrigin: ORIGIN }).refresh("refresh-1")).rejects.toBe(failure);
  });

  it("gives up on a refresh that never answers", async () => {
    jest.useFakeTimers();
    try {
      refresh.mockReturnValue(new Promise(() => undefined));

      const outcome = createKeycloakClient({ keycloakOrigin: ORIGIN, timeoutMs: 5000 }).refresh("refresh-1");
      const expectation = expect(outcome).rejects.toThrow("timed out after 5000 ms");
      await jest.advanceTimersByTimeAsync(5000);

      await expectation;
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("revoke", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
  });

  afterEach(() => jest.restoreAllMocks());

  it("posts the refresh token to the revocation endpoint", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await createKeycloakClient({ keycloakOrigin: ORIGIN }).revoke("refresh-1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://keycloak.test/realms/kalia/protocol/openid-connect/revoke");
    expect(init.method).toBe("POST");
    expect(new URLSearchParams(init.body).toString()).toBe(
      "client_id=kalia-mobile&token=refresh-1&token_type_hint=refresh_token",
    );
  });

  it("fails when Keycloak refuses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 400 }));

    await expect(createKeycloakClient({ keycloakOrigin: ORIGIN }).revoke("refresh-1")).rejects.toThrow("status 400");
  });
});
