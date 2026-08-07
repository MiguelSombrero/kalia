import { cookies } from "next/headers";
import { describe, expect, it, vi } from "vitest";
import { currentSessionToken } from "./sessionCookie";

// vitest.setup.ts stubs this module for every other test; this one is about
// the real thing, so it takes the stub back off and fakes the cookie jar.
vi.unmock("@/lib/auth/sessionCookie");
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const withCookies = (jar: Record<string, string>) => {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name in jar ? { name, value: jar[name] } : undefined),
  } as never);
};

describe("currentSessionToken", () => {
  it("reads the session token from Auth.js's cookie", async () => {
    withCookies({ "authjs.session-token": "session-abc" });

    await expect(currentSessionToken()).resolves.toBe("session-abc");
  });

  it("finds it over https, where Auth.js prefixes the cookie", async () => {
    withCookies({ "__Secure-authjs.session-token": "session-abc" });

    await expect(currentSessionToken()).resolves.toBe("session-abc");
  });

  it("returns nothing when the caller carries no session cookie", async () => {
    withCookies({});

    await expect(currentSessionToken()).resolves.toBeUndefined();
  });
});
