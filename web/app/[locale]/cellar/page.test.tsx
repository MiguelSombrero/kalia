import { afterEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth, handlers: {}, signIn: vi.fn(), signOut: vi.fn() }));

vi.mock("@/features/cellar/api", () => ({
  listCellarEntries: vi.fn(async () => []),
}));

const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }));
vi.mock("@/features/profile/api", () => ({ getProfile }));
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

import type { ReactElement } from "react";
import { listCellarEntries } from "@/features/cellar";
import { apiError } from "@kalia/api";
import CellarPage, { generateMetadata } from "./page";

// Do not render the full tree here: React suspends indefinitely on async
// Server Components outside Next's RSC runtime, and CellarPage composes them.
// This file covers CellarPage's own logic (auth branching, metadata); the
// children have their own tests and E2E covers composition.
describe("CellarPage", () => {
  afterEach(() => {
    vi.mocked(listCellarEntries).mockClear();
  });

  it("fetches the cellar when signed in", async () => {
    auth.mockResolvedValue({ user: { name: "Ada Lovelace" } });
    getProfile.mockResolvedValue({ username: "ada", cellarPublic: false });

    await CellarPage({ params: Promise.resolve({ locale: "en" }) });

    expect(listCellarEntries).toHaveBeenCalledOnce();
  });

  it("hands the cellar the owner's visibility from their profile", async () => {
    auth.mockResolvedValue({ user: { name: "Ada Lovelace" } });
    getProfile.mockResolvedValue({ username: "ada", cellarPublic: true });

    const page = (await CellarPage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement<{
      children: ReactElement<{ visibility: unknown }>;
    }>;

    expect(page.props.children.props.visibility).toEqual({ username: "ada", cellarPublic: true });
  });

  it("still renders the cellar, without its visibility, when the profile cannot be read", async () => {
    auth.mockResolvedValue({ user: { name: "Ada Lovelace" } });
    getProfile.mockRejectedValue(new Error("profile down"));

    const page = (await CellarPage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement<{
      children: ReactElement<{ visibility: unknown }>;
    }>;

    expect(page.props.children.props.visibility).toBeNull();
  });

  it("sends a caller whose username another account holds to the page that says so", async () => {
    auth.mockResolvedValue({ user: { name: "ada" } });
    getProfile.mockRejectedValue(apiError("http", "status 409", { status: 409 }));

    await expect(CellarPage({ params: Promise.resolve({ locale: "fi" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/fi/username-taken");
  });

  it("does not fetch the cellar when signed out", async () => {
    auth.mockResolvedValue(null);

    await CellarPage({ params: Promise.resolve({ locale: "en" }) });

    expect(listCellarEntries).not.toHaveBeenCalled();
  });
});

describe("generateMetadata", () => {
  it("titles the page in English", async () => {
    await expect(generateMetadata({ params: Promise.resolve({ locale: "en" }) })).resolves.toEqual({
      title: "My cellar — Kalia",
    });
  });

  it("titles the page in Finnish", async () => {
    await expect(generateMetadata({ params: Promise.resolve({ locale: "fi" }) })).resolves.toEqual({
      title: "Kellari — Kalia",
    });
  });
});
