import { redirectAuthCallback, withAuthCallbackSuppressed } from "./redirectAuthCallback";

describe("redirectAuthCallback", () => {
  it.each([
    "kalia://auth/callback?code=abc&state=xyz&iss=http%3A%2F%2Flocalhost%3A8581",
    "kalia://auth/callback",
    "/auth/callback?code=abc",
  ])("sends the sign-in return %s to the Profile tab rather than an unmatched route", (path) => {
    expect(redirectAuthCallback(path)).toBe("/profile");
  });

  it.each(["/", "/catalog", "kalia://catalog", "kalia://auth/other", "/auth/callback-not", "not a url at all"])(
    "leaves %s alone",
    (path) => {
      expect(redirectAuthCallback(path)).toBe(path);
    },
  );

  it("does not navigate on a callback while the browser request is active", async () => {
    let finish: (() => void) | undefined;
    const request = withAuthCallbackSuppressed(() => new Promise<void>((resolve) => { finish = resolve; }));
    expect(redirectAuthCallback("kalia://auth/callback?code=abc")).toBe("");
    expect(redirectAuthCallback("kalia://catalog")).toBe("kalia://catalog");
    finish?.();
    await request;
    expect(redirectAuthCallback("kalia://auth/callback?code=abc")).toBe("/profile");
  });

  it("restores cold callback routing when authorization fails", async () => {
    await expect(withAuthCallbackSuppressed(async () => { throw new Error("failed"); })).rejects.toThrow("failed");
    expect(redirectAuthCallback("/auth/callback?code=abc")).toBe("/profile");
  });
});
