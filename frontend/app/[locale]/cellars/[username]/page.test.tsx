import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicCellar } from "@/features/cellar";

const publicCellar: PublicCellar = {
  username: "testuser",
  beers: [],
};

const { getPublicCellar } = vi.hoisted(() => ({ getPublicCellar: vi.fn() }));
const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }));
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));

vi.mock("@/features/cellar", () => ({
  getPublicCellar,
  PublicCellarView: () => null,
}));
vi.mock("@/features/profile", () => ({ getProfile }));
vi.mock("@/auth", () => ({ auth }));

import PublicCellarPage, { generateMetadata } from "./page";

const params = (overrides: Partial<{ locale: string; username: string }> = {}) =>
  Promise.resolve({ locale: "en", username: "testuser", ...overrides });

beforeEach(() => {
  vi.clearAllMocks();
  getPublicCellar.mockResolvedValue(publicCellar);
  getProfile.mockResolvedValue({ username: "someone-else", cellarPublic: true });
  auth.mockResolvedValue(null);
});

describe("generateMetadata", () => {
  it("titles the page after whose cellar it is", async () => {
    await expect(generateMetadata({ params: params() })).resolves.toMatchObject({
      title: "testuser's cellar — Kalia",
    });
  });

  it("serves noindex, nofollow and hreflang alternates for a public cellar", async () => {
    const metadata = await generateMetadata({ params: params() });

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toEqual({
      canonical: "/cellars/testuser",
      languages: {
        en: "/en/cellars/testuser",
        fi: "/fi/cellars/testuser",
        "x-default": "/cellars/testuser",
      },
    });
  });

  it("still serves noindex for a cellar that is not found, and reveals nothing about it", async () => {
    getPublicCellar.mockResolvedValue(null);

    const metadata = await generateMetadata({ params: params() });

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe("Page not found — Kalia");
    expect(metadata.alternates).toBeUndefined();
  });
});

describe("PublicCellarPage", () => {
  it("renders for a public cellar", async () => {
    await expect(PublicCellarPage({ params: params() })).resolves.toBeDefined();
  });

  it("looks the cellar up by the decoded username, not the URL's encoding of it", async () => {
    await PublicCellarPage({ params: params({ username: "%C3%A4ij%C3%A4" }) });

    expect(getPublicCellar).toHaveBeenCalledWith("äijä");
  });

  it("triggers not-found for a username that is not valid percent-encoding", async () => {
    await expect(PublicCellarPage({ params: params({ username: "%E0%A4%A" }) })).rejects.toThrow();
    expect(getPublicCellar).not.toHaveBeenCalled();
  });

  it("triggers not-found when the cellar is not public", async () => {
    getPublicCellar.mockResolvedValue(null);

    await expect(PublicCellarPage({ params: params() })).rejects.toThrow();
  });
});
