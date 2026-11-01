import { beforeEach, describe, expect, it, vi } from "vitest";

const signIn = vi.fn();

vi.mock("@/auth", () => ({ signIn }));

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("formLocale", () => {
  it("reads the locale field", async () => {
    const { formLocale } = await import("./signInReturningTo");

    expect(formLocale(form({ locale: "fi" }))).toBe("fi");
  });

  it.each([
    ["no form", undefined],
    ["no field", form({})],
    ["an unserved locale", form({ locale: "sv" })],
    ["a URL", form({ locale: "https://evil.example" })],
  ])("falls back to the default locale for %s", async (_, data) => {
    const { formLocale } = await import("./signInReturningTo");

    expect(formLocale(data)).toBe("en");
  });

  it("ignores a file where the field should be text", async () => {
    const { formLocale } = await import("./signInReturningTo");
    const data = new FormData();
    data.set("locale", new File(["fi"], "fi.txt"));

    expect(formLocale(data)).toBe("en");
  });
});

describe("signInReturningTo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the viewer to the path built for their locale, and has Keycloak speak it", async () => {
    const { signInReturningTo } = await import("./signInReturningTo");

    await signInReturningTo(form({ locale: "fi" }), (locale) => `/${locale}/somewhere`);

    expect(signIn).toHaveBeenCalledWith(
      "keycloak",
      { redirectTo: "/fi/somewhere" },
      { ui_locales: "fi" },
    );
  });

  it("builds the path in the default locale when the form names none the app serves", async () => {
    const { signInReturningTo } = await import("./signInReturningTo");
    const returnTo = vi.fn((locale: string) => `/${locale}/somewhere`);

    await signInReturningTo(form({ locale: "//evil.example" }), returnTo);

    expect(returnTo).toHaveBeenCalledWith("en");
    expect(signIn).toHaveBeenCalledWith(
      "keycloak",
      { redirectTo: "/en/somewhere" },
      { ui_locales: "en" },
    );
  });

  it("signs in through the registration provider when asked", async () => {
    const { signInReturningTo } = await import("./signInReturningTo");

    await signInReturningTo(form({ locale: "en" }), () => "/en", "keycloak-register");

    expect(signIn).toHaveBeenCalledWith("keycloak-register", { redirectTo: "/en" }, { ui_locales: "en" });
  });

  it("lets the caller read its own fields from the same form", async () => {
    const { signInReturningTo } = await import("./signInReturningTo");
    const data = form({ locale: "en", page: "beers" });

    await signInReturningTo(data, (locale) => `/${locale}/${data.get("page")}`);

    expect(signIn).toHaveBeenCalledWith("keycloak", { redirectTo: "/en/beers" }, { ui_locales: "en" });
  });
});
