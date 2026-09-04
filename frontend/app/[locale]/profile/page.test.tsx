import { afterEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth, handlers: {}, signIn: vi.fn(), signOut: vi.fn() }));

vi.mock("@/features/profile/api", () => ({
  getProfile: vi.fn(async () => ({ username: "ada", cellarPublic: false })),
}));

import { getProfile } from "@/features/profile";
import ProfilePage, { generateMetadata } from "./page";

// Do not render the full tree here: React suspends indefinitely on async
// Server Components outside Next's RSC runtime, and ProfilePage composes
// them. This file covers ProfilePage's own logic (auth branching, metadata);
// the children have their own tests and E2E covers composition.
describe("ProfilePage", () => {
  afterEach(() => {
    vi.mocked(getProfile).mockClear();
  });

  it("fetches the profile when signed in", async () => {
    auth.mockResolvedValue({ user: { name: "Ada Lovelace" } });

    await ProfilePage({ params: Promise.resolve({ locale: "en" }) });

    expect(getProfile).toHaveBeenCalledOnce();
  });

  it("does not fetch the profile when signed out", async () => {
    auth.mockResolvedValue(null);

    await ProfilePage({ params: Promise.resolve({ locale: "en" }) });

    expect(getProfile).not.toHaveBeenCalled();
  });
});

describe("generateMetadata", () => {
  it("titles the page in English", async () => {
    await expect(generateMetadata({ params: Promise.resolve({ locale: "en" }) })).resolves.toEqual({
      title: "Profile — Kalia",
    });
  });

  it("titles the page in Finnish", async () => {
    await expect(generateMetadata({ params: Promise.resolve({ locale: "fi" }) })).resolves.toEqual({
      title: "Profiili — Kalia",
    });
  });
});
