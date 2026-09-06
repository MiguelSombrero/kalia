import { describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth, handlers: {}, signIn: vi.fn(), signOut: vi.fn() }));

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

import SignUpPage, { generateMetadata } from "./page";

// SignUpPage composes SignUpForm, an async Server Component — rendering the
// full tree suspends indefinitely outside Next's RSC runtime (see
// ProfilePage's own test for the same note). This file covers SignUpPage's
// own logic; SignUpForm has its own test, and E2E covers composition.
describe("SignUpPage", () => {
  it("redirects an already signed-in visitor to their profile", async () => {
    auth.mockResolvedValue({ user: { name: "Ada Lovelace" } });

    await SignUpPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    });

    expect(redirect).toHaveBeenCalledWith("/en/profile");
  });

  it("does not redirect a visitor with no session", async () => {
    auth.mockResolvedValue(null);
    redirect.mockClear();

    await SignUpPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    });

    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("generateMetadata", () => {
  it("titles the page in English", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) }),
    ).resolves.toEqual({ title: "Create an account — Kalia" });
  });

  it("titles the page in Finnish", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ locale: "fi" }), searchParams: Promise.resolve({}) }),
    ).resolves.toEqual({ title: "Luo tili — Kalia" });
  });
});
