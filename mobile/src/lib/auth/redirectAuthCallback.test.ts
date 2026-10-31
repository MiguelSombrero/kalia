import { redirectAuthCallback } from "./redirectAuthCallback";

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
});
