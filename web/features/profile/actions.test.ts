import { beforeEach, describe, expect, it, vi } from "vitest";

const signIn = vi.fn();

vi.mock("@/auth", () => ({ signIn }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./api", () => ({ changeCellarVisibility: vi.fn() }));

describe("startProfileSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the visitor to their profile, in the language of the page they left", async () => {
    const { startProfileSignIn } = await import("./actions");
    const form = new FormData();
    form.set("locale", "fi");

    await startProfileSignIn(form);

    expect(signIn).toHaveBeenCalledWith("keycloak", { redirectTo: "/fi/profile" }, { ui_locales: "fi" });
  });

  it("falls back to the default locale when the form carries none", async () => {
    const { startProfileSignIn } = await import("./actions");

    await startProfileSignIn();

    expect(signIn).toHaveBeenCalledWith("keycloak", { redirectTo: "/en/profile" }, { ui_locales: "en" });
  });
});
