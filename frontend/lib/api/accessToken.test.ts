import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { endLocalSession } from "@/lib/auth/endLocalSession";
import { refreshAccessToken } from "@/lib/auth/refreshAccessToken";
import { getStoredAccountByUserId, putStoredAccount } from "@/lib/auth/valkeyAdapter";
import { currentAccessToken } from "./accessToken";

vi.mock("@/lib/auth/valkeyAdapter", () => ({
  getStoredAccountByUserId: vi.fn(),
  putStoredAccount: vi.fn(),
}));
vi.mock("@/lib/auth/refreshAccessToken", () => ({ refreshAccessToken: vi.fn() }));
vi.mock("@/lib/auth/endLocalSession", () => ({ endLocalSession: vi.fn() }));

const signedInWith = (account: Record<string, unknown> | null) => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);
  vi.mocked(getStoredAccountByUserId).mockResolvedValue(account as never);
};

const inSeconds = (offset: number) => Math.floor(Date.now() / 1000) + offset;

const expiredAccount = {
  userId: "user-1",
  provider: "keycloak",
  providerAccountId: "keycloak-sub",
  type: "oidc",
  access_token: "stale-access",
  refresh_token: "the-refresh",
  id_token: "stale-id",
  expires_at: inSeconds(-1),
};

describe("currentAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.mocked(auth).mockResolvedValue(null as never);
  });

  it("returns the stored token for a signed-in caller", async () => {
    signedInWith({ access_token: "token-abc", expires_at: inSeconds(300) });

    await expect(currentAccessToken()).resolves.toBe("token-abc");
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it("returns nothing when nobody is signed in", async () => {
    await expect(currentAccessToken()).resolves.toBeUndefined();
  });

  it("returns nothing when the session has no stored account", async () => {
    signedInWith(null);

    await expect(currentAccessToken()).resolves.toBeUndefined();
  });

  it("sends a token whose account records no expiry at all", async () => {
    signedInWith({ access_token: "token-abc" });

    await expect(currentAccessToken()).resolves.toBe("token-abc");
  });

  describe("when the stored token has expired", () => {
    it("renews it and returns the fresh one", async () => {
      signedInWith(expiredAccount);
      vi.mocked(refreshAccessToken).mockResolvedValue({
        status: "renewed",
        accessToken: "fresh-access",
        refreshToken: "fresh-refresh",
        idToken: "fresh-id",
        expiresAt: inSeconds(300),
      });

      await expect(currentAccessToken()).resolves.toBe("fresh-access");
      expect(refreshAccessToken).toHaveBeenCalledWith("the-refresh");
    });

    it("renews one that would otherwise expire while the request is in flight", async () => {
      signedInWith({ ...expiredAccount, expires_at: inSeconds(5) });
      vi.mocked(refreshAccessToken).mockResolvedValue({
        status: "renewed",
        accessToken: "fresh-access",
        refreshToken: undefined,
        idToken: undefined,
        expiresAt: inSeconds(300),
      });

      await expect(currentAccessToken()).resolves.toBe("fresh-access");
    });

    it("writes the renewed set back, including the id_token sign-out needs", async () => {
      signedInWith(expiredAccount);
      const expiresAt = inSeconds(300);
      vi.mocked(refreshAccessToken).mockResolvedValue({
        status: "renewed",
        accessToken: "fresh-access",
        refreshToken: "fresh-refresh",
        idToken: "fresh-id",
        expiresAt,
      });

      await currentAccessToken();

      expect(putStoredAccount).toHaveBeenCalledWith({
        ...expiredAccount,
        access_token: "fresh-access",
        refresh_token: "fresh-refresh",
        id_token: "fresh-id",
        expires_at: expiresAt,
      });
    });

    it("keeps the previous refresh and id tokens when Keycloak returns none", async () => {
      signedInWith(expiredAccount);
      vi.mocked(refreshAccessToken).mockResolvedValue({
        status: "renewed",
        accessToken: "fresh-access",
        refreshToken: undefined,
        idToken: undefined,
        expiresAt: inSeconds(300),
      });

      await currentAccessToken();

      expect(putStoredAccount).toHaveBeenCalledWith(
        expect.objectContaining({ refresh_token: "the-refresh", id_token: "stale-id" }),
      );
    });

    it("ends the local session when Keycloak rejects the refresh token", async () => {
      signedInWith(expiredAccount);
      vi.mocked(refreshAccessToken).mockResolvedValue({ status: "rejected" });

      await expect(currentAccessToken()).resolves.toBeUndefined();
      expect(endLocalSession).toHaveBeenCalled();
      expect(putStoredAccount).not.toHaveBeenCalled();
    });

    // Load-bearing: a Keycloak restart must not sign every user out. Only a
    // definitive rejection ends a session, never a failure to reach Keycloak.
    it("leaves the session alone when Keycloak cannot be reached", async () => {
      signedInWith(expiredAccount);
      vi.mocked(refreshAccessToken).mockResolvedValue({ status: "unavailable" });

      await expect(currentAccessToken()).resolves.toBeUndefined();
      expect(endLocalSession).not.toHaveBeenCalled();
      expect(putStoredAccount).not.toHaveBeenCalled();
    });

    it("withholds the token when there is no refresh token to renew with", async () => {
      signedInWith({ ...expiredAccount, refresh_token: undefined });

      await expect(currentAccessToken()).resolves.toBeUndefined();
      expect(refreshAccessToken).not.toHaveBeenCalled();
      expect(endLocalSession).not.toHaveBeenCalled();
    });
  });
});
