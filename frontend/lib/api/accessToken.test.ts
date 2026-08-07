import { afterEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { getStoredAccountByUserId } from "@/lib/auth/valkeyAdapter";
import { currentAccessToken } from "./accessToken";

vi.mock("@/lib/auth/valkeyAdapter", () => ({ getStoredAccountByUserId: vi.fn() }));

const signedInWith = (account: Record<string, unknown> | null) => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);
  vi.mocked(getStoredAccountByUserId).mockResolvedValue(account as never);
};

const inSeconds = (offset: number) => Math.floor(Date.now() / 1000) + offset;

describe("currentAccessToken", () => {
  afterEach(() => {
    vi.mocked(auth).mockResolvedValue(null as never);
  });

  it("returns the stored token for a signed-in caller", async () => {
    signedInWith({ access_token: "token-abc", expires_at: inSeconds(300) });

    await expect(currentAccessToken()).resolves.toBe("token-abc");
  });

  it("returns nothing when nobody is signed in", async () => {
    await expect(currentAccessToken()).resolves.toBeUndefined();
  });

  it("returns nothing when the session has no stored account", async () => {
    signedInWith(null);

    await expect(currentAccessToken()).resolves.toBeUndefined();
  });

  it("withholds an expired token rather than sending one the backend will reject", async () => {
    // Reachable within five minutes of any sign-in until task 8 lands silent
    // refresh: an expired bearer token 401s even the public catalog, because
    // Spring Security authenticates it before checking whether the route is
    // public.
    signedInWith({ access_token: "token-abc", expires_at: inSeconds(-1) });

    await expect(currentAccessToken()).resolves.toBeUndefined();
  });

  it("withholds a token that expires while the request is in flight", async () => {
    signedInWith({ access_token: "token-abc", expires_at: inSeconds(5) });

    await expect(currentAccessToken()).resolves.toBeUndefined();
  });

  it("sends a token whose account records no expiry at all", async () => {
    signedInWith({ access_token: "token-abc" });

    await expect(currentAccessToken()).resolves.toBe("token-abc");
  });
});
