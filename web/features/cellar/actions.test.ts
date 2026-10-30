import { beforeEach, describe, expect, it, vi } from "vitest";

const signIn = vi.fn();

vi.mock("@/auth", () => ({ signIn }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const beerId = "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f";

const formData = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

const redirectTo = (): unknown => (signIn.mock.calls[0][1] as { redirectTo: unknown }).redirectTo;

describe("startCellarSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the visitor to the beer they signed in from", async () => {
    const { startCellarSignIn } = await import("./actions");

    await startCellarSignIn(formData({ beerId, locale: "fi" }));

    expect(signIn).toHaveBeenCalledWith(
      "keycloak",
      { redirectTo: `/fi/beers/${beerId}` },
      { ui_locales: "fi" },
    );
  });

  it.each([
    ["an off-site URL", "https://evil.example/phish"],
    ["a protocol-relative URL", "//evil.example/phish"],
    ["a path smuggled after a valid id", `${beerId}/../../../evil`],
    ["a non-UUID id", "not-a-beer"],
  ])("sends the visitor to their cellar instead of following %s", async (_, suppliedBeerId) => {
    const { startCellarSignIn } = await import("./actions");

    await startCellarSignIn(formData({ beerId: suppliedBeerId, locale: "en" }));

    expect(redirectTo()).toBe("/en/cellar");
  });

  it("ignores a valid beer id when the locale is not one the app serves", async () => {
    const { startCellarSignIn } = await import("./actions");

    await startCellarSignIn(formData({ beerId, locale: "//evil.example" }));

    expect(redirectTo()).toBe("/en/cellar");
  });

  it("sends the visitor to their cellar when the form carries no beer", async () => {
    const { startCellarSignIn } = await import("./actions");

    await startCellarSignIn(formData({ locale: "en" }));

    expect(redirectTo()).toBe("/en/cellar");
  });
});
