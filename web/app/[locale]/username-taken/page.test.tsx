import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError } from "@kalia/api";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth, handlers: {}, signIn: vi.fn(), signOut: vi.fn() }));

// Throws like the real one, so the page never renders past it.
const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

vi.mock("@/features/profile/api", () => ({ getProfile: vi.fn() }));

import { getProfile } from "@/features/profile";
import UsernameTakenPage, { generateMetadata } from "./page";

const params = (locale: string) => ({ params: Promise.resolve({ locale }) });

// Do not render the full tree here: React suspends indefinitely on async
// Server Components outside Next's RSC runtime, and this page composes one.
// UsernameTaken.test.tsx renders the page's content in both locales.
describe("UsernameTakenPage", () => {
  afterEach(() => {
    redirect.mockClear();
    vi.mocked(getProfile).mockReset();
  });

  it("renders for a signed-in caller whose username another account holds", async () => {
    auth.mockResolvedValue({ user: { name: "ada" } });
    vi.mocked(getProfile).mockRejectedValue(apiError("http", "status 409", { status: 409 }));

    await expect(UsernameTakenPage(params("en"))).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends a caller whose username is their own back to the front page", async () => {
    auth.mockResolvedValue({ user: { name: "ada" } });
    vi.mocked(getProfile).mockResolvedValue({ username: "ada", cellarPublic: false });

    await expect(UsernameTakenPage(params("fi"))).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/fi");
  });

  it("sends a signed-out visitor back to the front page without asking the backend", async () => {
    auth.mockResolvedValue(null);

    await expect(UsernameTakenPage(params("en"))).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/en");
    expect(getProfile).not.toHaveBeenCalled();
  });
});

describe("generateMetadata", () => {
  it("titles the page in English", async () => {
    await expect(generateMetadata(params("en"))).resolves.toEqual({ title: "Username taken — Kalia" });
  });

  it("titles the page in Finnish", async () => {
    await expect(generateMetadata(params("fi"))).resolves.toEqual({ title: "Käyttäjänimi varattu — Kalia" });
  });
});
