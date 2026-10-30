// @vitest-environment node
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { sidFromIdToken } from "./sessionId";

// jose's signing throws under the project's default jsdom environment
// (lib/auth/backchannelLogoutToken.test.ts explains why), hence the override
// above — decodeJwt itself doesn't need it, but producing a token to decode does.
const unsignedToken = async (claims: Record<string, unknown>) =>
  new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("secret"));

describe("sidFromIdToken", () => {
  it("reads the sid claim", async () => {
    const token = await unsignedToken({ sid: "sso-session-1" });

    expect(sidFromIdToken(token)).toBe("sso-session-1");
  });

  it("is undefined when there is no sid claim", async () => {
    const token = await unsignedToken({ sub: "user-1" });

    expect(sidFromIdToken(token)).toBeUndefined();
  });

  it("is undefined when sid is not a string", async () => {
    const token = await unsignedToken({ sid: 123 });

    expect(sidFromIdToken(token)).toBeUndefined();
  });
});
