import { beforeEach, describe, expect, it, vi } from "vitest";
import { endLocalSession } from "@/lib/auth/endLocalSession";
import { refreshAccessToken } from "@/lib/auth/refreshAccessToken";
import { currentSessionToken } from "@/lib/auth/sessionCookie";
import { getSessionAccount, updateSessionAccount } from "@/lib/auth/valkeyAdapter";
import { currentAccessToken } from "./accessToken";

vi.mock("@/lib/auth/valkeyAdapter", () => ({
  getSessionAccount: vi.fn(),
  updateSessionAccount: vi.fn(),
}));
vi.mock("@/lib/auth/refreshAccessToken", () => ({ refreshAccessToken: vi.fn() }));
vi.mock("@/lib/auth/endLocalSession", () => ({ endLocalSession: vi.fn() }));
vi.mock("@/lib/auth/sessionCookie", () => ({ currentSessionToken: vi.fn() }));

const SESSION_TOKEN = "session-abc";

const signedInWith = (account: Record<string, unknown> | null) => {
  vi.mocked(currentSessionToken).mockResolvedValue(SESSION_TOKEN);
  vi.mocked(getSessionAccount).mockResolvedValue(account as never);
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
    // clearAllMocks drops recorded calls but keeps implementations, so an
    // earlier test's signed-in caller would leak into the anonymous ones.
    vi.mocked(currentSessionToken).mockResolvedValue(undefined);
  });

  it("returns the stored token for a signed-in caller", async () => {
    signedInWith({ access_token: "token-abc", expires_at: inSeconds(300) });

    await expect(currentAccessToken()).resolves.toBe("token-abc");
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it("looks the token set up by session, never by user", async () => {
    signedInWith({ access_token: "token-abc", expires_at: inSeconds(300) });

    await currentAccessToken();

    expect(getSessionAccount).toHaveBeenCalledWith(SESSION_TOKEN);
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

      expect(updateSessionAccount).toHaveBeenCalledWith(SESSION_TOKEN, {
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

      expect(updateSessionAccount).toHaveBeenCalledWith(
        SESSION_TOKEN,
        expect.objectContaining({ refresh_token: "the-refresh", id_token: "stale-id" }),
      );
    });

    it("ends the local session when Keycloak rejects the refresh token", async () => {
      signedInWith(expiredAccount);
      vi.mocked(refreshAccessToken).mockResolvedValue({ status: "rejected" });

      await expect(currentAccessToken()).resolves.toBeUndefined();
      expect(endLocalSession).toHaveBeenCalledWith(SESSION_TOKEN);
      expect(updateSessionAccount).not.toHaveBeenCalled();
    });

    // Load-bearing: a Keycloak restart must not sign every user out. Only a
    // definitive rejection ends a session, never a failure to reach Keycloak.
    it("leaves the session alone when Keycloak cannot be reached", async () => {
      signedInWith(expiredAccount);
      vi.mocked(refreshAccessToken).mockResolvedValue({ status: "unavailable" });

      await expect(currentAccessToken()).resolves.toBeUndefined();
      expect(endLocalSession).not.toHaveBeenCalled();
      expect(updateSessionAccount).not.toHaveBeenCalled();
    });

    it("withholds the token when there is no refresh token to renew with", async () => {
      signedInWith({ ...expiredAccount, refresh_token: undefined });

      await expect(currentAccessToken()).resolves.toBeUndefined();
      expect(refreshAccessToken).not.toHaveBeenCalled();
      expect(endLocalSession).not.toHaveBeenCalled();
    });
  });
});
