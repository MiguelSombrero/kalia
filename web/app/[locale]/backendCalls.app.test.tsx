import { afterEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({
  auth: vi.fn(async () => ({ user: { name: "ada" }, expires: "" })),
}));
vi.mock("@/auth", () => ({ auth, handlers: {}, signIn: vi.fn(), signOut: vi.fn() }));

import HomePage from "./(home)/page";
import BeerPage from "./beers/[id]/page";
import BeersPage from "./beers/page";
import ProfilePage from "./profile/page";

const beerId = "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f";
const beer = {
  id: beerId,
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  brewery: { id: "br1", name: "Brouwerij Westvleteren", countryCode: "BE", city: "Vleteren" },
};

const answer = (url: string): Response => {
  const { pathname } = new URL(url, "http://backend");
  if (pathname === "/api/v1/cellar/holdings") {
    return Response.json({ totalBeers: 2, totalBottles: 5, held: [{ beerId, quantity: 3 }] });
  }
  if (pathname === "/api/v1/beers") {
    return Response.json({ content: [beer], totalElements: 1, totalPages: 1, page: 0 });
  }
  if (pathname === `/api/v1/beers/${beerId}`) {
    return Response.json(beer);
  }
  if (pathname === "/api/v1/profile") {
    return Response.json({ username: "ada", cellarPublic: false });
  }
  if (pathname === "/api/v1/feed") {
    return Response.json({ content: [], startOver: false });
  }
  return Response.json([]);
};

const callsMadeBy = async (render: () => Promise<unknown>): Promise<string[]> => {
  const fetchMock = vi.fn(async (url: string) => answer(url));
  vi.stubGlobal("fetch", fetchMock);
  await render();
  return fetchMock.mock.calls.map(([url]) => new URL(url, "http://backend").pathname);
};

const params = Promise.resolve({ locale: "en" });

afterEach(() => {
  vi.unstubAllGlobals();
});

// Unmocked down to fetch, so it counts what each signed-in page costs the
// backend whatever the cellar feature does internally. GET /cellar answers
// with every entry the viewer holds, so a page that reads it grows with the cellar.
describe("a signed-in page other than the cellar page", () => {
  it.each([
    ["the catalog search", () => BeersPage({ params, searchParams: Promise.resolve({ query: "west" }) })],
    ["a beer's page", () => BeerPage({ params: Promise.resolve({ locale: "en", id: beerId }), searchParams: Promise.resolve({}) })],
    ["the front page", () => HomePage({ params })],
    ["the profile", () => ProfilePage({ params })],
  ])("never reads the whole cellar on %s", async (_name, render) => {
    const paths = await callsMadeBy(render);

    expect(paths).not.toContain("/api/v1/cellar");
  });

  it.each([
    ["the catalog search", () => BeersPage({ params, searchParams: Promise.resolve({}) })],
    ["a beer's page", () => BeerPage({ params: Promise.resolve({ locale: "en", id: beerId }), searchParams: Promise.resolve({}) })],
    ["the front page", () => HomePage({ params })],
    ["the profile", () => ProfilePage({ params })],
  ])("reads the bounded holdings on %s", async (_name, render) => {
    const paths = await callsMadeBy(render);

    expect(paths).toContain("/api/v1/cellar/holdings");
  });
});
