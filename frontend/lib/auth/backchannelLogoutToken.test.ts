// @vitest-environment node
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { validateLogoutToken } from "./backchannelLogoutToken";

const ISSUER = "http://localhost:8081/realms/kalia";
const AUDIENCE = "kalia-frontend";
const BACKCHANNEL_LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout";
const KID = "test-key";

let signingKey: CryptoKey;

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  signingKey = privateKey;
  const jwk = await exportJWK(publicKey);
  const jwks = { keys: [{ ...jwk, kid: KID, alg: "RS256", use: "sig" }] };

  vi.stubEnv("AUTH_KEYCLOAK_ISSUER", ISSUER);
  vi.stubEnv("AUTH_KEYCLOAK_INTERNAL_ORIGIN", "http://keycloak:8080");
  vi.stubEnv("AUTH_KEYCLOAK_ID", AUDIENCE);

  // Serves the JWKS regardless of origin: this test covers validation logic,
  // not internalKeycloakFetch's own rewrite (internalKeycloakFetch.test.ts).
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(jwks), { headers: { "Content-Type": "application/json" } }),
    ),
  );
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// Forced to the Node environment above: under the default jsdom one, jose's
// own `instanceof Uint8Array` check fails, since jsdom's Uint8Array is a
// distinct realm from Node's. Verified against jose 6.2.8.
const sign = async (claims: Record<string, unknown>, key: CryptoKey = signingKey) =>
  new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: KID }).setIssuedAt().sign(key);

const validClaims = (overrides: Record<string, unknown> = {}) => ({
  iss: ISSUER,
  aud: AUDIENCE,
  sid: "sso-session-1",
  jti: "logout-token-1",
  events: { [BACKCHANNEL_LOGOUT_EVENT]: {} },
  ...overrides,
});

describe("validateLogoutToken", () => {
  it("accepts a validly signed logout token and returns its sid", async () => {
    const token = await sign(validClaims());

    await expect(validateLogoutToken(token)).resolves.toEqual({
      status: "valid",
      sid: "sso-session-1",
    });
  });

  it("rejects a token signed by a key Keycloak's JWKS does not list", async () => {
    const { privateKey: otherKey } = await generateKeyPair("RS256");
    const token = await sign(validClaims(), otherKey);

    await expect(validateLogoutToken(token)).resolves.toEqual({ status: "invalid" });
  });

  it("rejects the wrong issuer", async () => {
    const token = await sign(validClaims({ iss: "http://attacker.example/realms/kalia" }));

    await expect(validateLogoutToken(token)).resolves.toEqual({ status: "invalid" });
  });

  it("rejects the wrong audience", async () => {
    const token = await sign(validClaims({ aud: "some-other-client" }));

    await expect(validateLogoutToken(token)).resolves.toEqual({ status: "invalid" });
  });

  // §2.6: the one claim a Logout Token must never carry — its presence
  // would mean an ID Token is being replayed as one.
  it("rejects a token carrying a nonce", async () => {
    const token = await sign(validClaims({ nonce: "abc" }));

    await expect(validateLogoutToken(token)).resolves.toEqual({ status: "invalid" });
  });

  it("rejects a token with no events claim", async () => {
    const token = await sign({
      iss: ISSUER,
      aud: AUDIENCE,
      sid: "sso-session-1",
      jti: "logout-token-1",
    });

    await expect(validateLogoutToken(token)).resolves.toEqual({ status: "invalid" });
  });

  it("rejects a token whose events claim names a different event", async () => {
    const token = await sign(validClaims({ events: { "https://example.com/other-event": {} } }));

    await expect(validateLogoutToken(token)).resolves.toEqual({ status: "invalid" });
  });

  it("rejects a token with no sid", async () => {
    const token = await sign({
      iss: ISSUER,
      aud: AUDIENCE,
      jti: "logout-token-1",
      events: { [BACKCHANNEL_LOGOUT_EVENT]: {} },
    });

    await expect(validateLogoutToken(token)).resolves.toEqual({ status: "invalid" });
  });

  it("rejects a malformed token", async () => {
    await expect(validateLogoutToken("not-a-jwt")).resolves.toEqual({ status: "invalid" });
  });
});
