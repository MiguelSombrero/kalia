import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicCellar } from "@/features/cellar";

const publicCellar: PublicCellar = {
  username: "testuser",
  beers: [],
  page: 0,
  totalPages: 1,
  totalBeers: 0,
  totalBottles: 0,
};

const { getPublicCellar } = vi.hoisted(() => ({ getPublicCellar: vi.fn() }));
const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }));
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));

vi.mock("@/features/cellar", async () => ({
  getPublicCellar,
  PublicCellarView: () => null,
  toPublicCellarPage: (await vi.importActual<typeof import("@/features/cellar/publicCellarPages")>("@/features/cellar/publicCellarPages")).toPublicCellarPage,
}));
vi.mock("@/features/profile", () => ({ getProfile }));
vi.mock("@/auth", () => ({ auth }));

import PublicCellarPage, { generateMetadata } from "./page";

const params = (overrides: Partial<{ locale: string; username: string }> = {}) =>
  Promise.resolve({ locale: "en", username: "testuser", ...overrides });

const search = (page?: string | string[]) => Promise.resolve({ page });

beforeEach(() => {
  vi.clearAllMocks();
  getPublicCellar.mockResolvedValue(publicCellar);
  getProfile.mockResolvedValue({ username: "someone-else", cellarPublic: true });
  auth.mockResolvedValue(null);
});

describe("generateMetadata", () => {
  it("titles the page after whose cellar it is", async () => {
    await expect(generateMetadata({ params: params(), searchParams: search() })).resolves.toMatchObject({
      title: "testuser's cellar — Kalia",
    });
  });

  it("serves noindex, nofollow and hreflang alternates for a public cellar", async () => {
    const metadata = await generateMetadata({ params: params(), searchParams: search() });

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

    const metadata = await generateMetadata({ params: params(), searchParams: search() });

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe("Page not found — Kalia");
    expect(metadata.alternates).toBeUndefined();
  });
});

describe("PublicCellarPage", () => {
  it("renders for a public cellar", async () => {
    await expect(PublicCellarPage({ params: params(), searchParams: search() })).resolves.toBeDefined();
  });

  it("looks the cellar up by the decoded username, not the URL's encoding of it", async () => {
    await PublicCellarPage({ params: params({ username: "%C3%A4ij%C3%A4" }), searchParams: search() });

    expect(getPublicCellar).toHaveBeenCalledWith("äijä", 0);
  });

  it("triggers not-found for a username that is not valid percent-encoding", async () => {
    await expect(PublicCellarPage({ params: params({ username: "%E0%A4%A" }), searchParams: search() })).rejects.toThrow();
    expect(getPublicCellar).not.toHaveBeenCalled();
  });

  it("triggers not-found when the cellar is not public", async () => {
    getPublicCellar.mockResolvedValue(null);

    await expect(PublicCellarPage({ params: params(), searchParams: search() })).rejects.toThrow();
  });

  it("reads the page the query string names", async () => {
    getPublicCellar.mockResolvedValue({ ...publicCellar, page: 2, totalPages: 4 });

    await PublicCellarPage({ params: params(), searchParams: search("2") });

    expect(getPublicCellar).toHaveBeenCalledWith("testuser", 2);
  });

  it.each(["0", "-1", "1.5", "abc", ""])("reads the first page for %j", async (page) => {
    await PublicCellarPage({ params: params(), searchParams: search(page) });

    expect(getPublicCellar).toHaveBeenCalledWith("testuser", 0);
  });

  it("reads the first page for a repeated parameter", async () => {
    await PublicCellarPage({ params: params(), searchParams: search(["1", "2"]) });

    expect(getPublicCellar).toHaveBeenCalledWith("testuser", 0);
  });

  it("triggers not-found for a page past the last one", async () => {
    getPublicCellar.mockResolvedValue({ ...publicCellar, page: 3, totalPages: 2 });

    await expect(PublicCellarPage({ params: params(), searchParams: search("3") })).rejects.toThrow();
  });
});
