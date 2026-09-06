import { beforeEach, describe, expect, it, vi } from "vitest";

const signIn = vi.fn();
const checkSignUpRateLimit = vi.fn();

vi.mock("@/auth", () => ({ signIn, signOut: vi.fn() }));
vi.mock("./signUpRateLimit", () => ({ checkSignUpRateLimit }));
// next/navigation's redirect signals control flow by throwing (Next.js docs,
// 01-app/03-api-reference/04-functions/redirect.md) — a real call never
// returns, so the fake must not either, or code after it would keep running.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const formData = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

describe("startSignUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSignUpRateLimit.mockResolvedValue(true);
  });

  it("redirects to Keycloak's registration flow once agreed and within the rate limit", async () => {
    const { startSignUp } = await import("./actions");

    await startSignUp(formData({ locale: "en", agree: "on" }));

    expect(signIn).toHaveBeenCalledWith("keycloak-register");
  });

  it("refuses without the acknowledgement checkbox, without ever checking the rate limit", async () => {
    const { startSignUp } = await import("./actions");

    await expect(startSignUp(formData({ locale: "fi" }))).rejects.toThrow(
      "REDIRECT:/fi/sign-up?error=agree-required",
    );
    expect(checkSignUpRateLimit).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("refuses once the sign-up rate limit is crossed", async () => {
    checkSignUpRateLimit.mockResolvedValue(false);
    const { startSignUp } = await import("./actions");

    await expect(startSignUp(formData({ locale: "en", agree: "on" }))).rejects.toThrow(
      "REDIRECT:/en/sign-up?error=rate-limited",
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it("falls back to the default locale for an invalid or missing one", async () => {
    const { startSignUp } = await import("./actions");

    await expect(startSignUp(formData({ agree: "" }))).rejects.toThrow(
      "REDIRECT:/en/sign-up?error=agree-required",
    );
  });
});
