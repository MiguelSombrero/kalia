import { afterEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth, handlers: {}, signIn: vi.fn(), signOut: vi.fn() }));

vi.mock("@/features/profile/api", () => ({
  getProfile: vi.fn(async () => ({ username: "ada", cellarPublic: false })),
}));
// Throws like the real one, so the page never renders past it.
const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect,
}));
vi.mock("@/features/cellar/api", () => ({
  listCellarEntries: vi.fn(async () => []),
}));

import { listCellarEntries } from "@/features/cellar";
import { getProfile } from "@/features/profile";
import { apiError } from "@kalia/api";
import ProfilePage, { generateMetadata } from "./page";

// Do not render the full tree here: React suspends indefinitely on async
// Server Components outside Next's RSC runtime, and ProfilePage composes
// them. This file covers ProfilePage's own logic (auth branching, metadata);
// the children have their own tests and E2E covers composition.
describe("ProfilePage", () => {
  afterEach(() => {
    vi.mocked(getProfile).mockClear();
    vi.mocked(listCellarEntries).mockClear();
  });

  it("fetches the profile and the owner's cellar to count it when signed in", async () => {
    auth.mockResolvedValue({ user: { name: "ada" } });

    await ProfilePage({ params: Promise.resolve({ locale: "en" }) });

    expect(getProfile).toHaveBeenCalledOnce();
    expect(listCellarEntries).toHaveBeenCalledOnce();
  });

  it("still renders the profile when the cellar cannot be counted", async () => {
    auth.mockResolvedValue({ user: { name: "ada" } });
    vi.mocked(listCellarEntries).mockRejectedValueOnce(new Error("backend down"));

    await expect(ProfilePage({ params: Promise.resolve({ locale: "en" }) })).resolves.toBeTruthy();
  });

  it("sends a caller whose username another account holds to the page that says so", async () => {
    auth.mockResolvedValue({ user: { name: "ada" } });
    vi.mocked(getProfile).mockRejectedValueOnce(apiError("http", "status 409", { status: 409 }));

    await expect(ProfilePage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/en/username-taken");
  });

  it("fetches neither the profile nor the cellar when signed out", async () => {
    auth.mockResolvedValue(null);

    await ProfilePage({ params: Promise.resolve({ locale: "en" }) });

    expect(getProfile).not.toHaveBeenCalled();
    expect(listCellarEntries).not.toHaveBeenCalled();
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
