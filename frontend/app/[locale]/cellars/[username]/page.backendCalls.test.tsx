import { afterEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn(async () => null) }));
vi.mock("@/auth", () => ({ auth }));

import PublicCellarPage from "./page";

const entry = (i: number) => ({
  id: `entry-${i}`,
  beer: { id: `beer-${i}`, name: `Beer ${i}`, brewery: "Brewery", style: "Lager", abv: 5 },
  quantity: 1,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  bottles: [
    {
      id: `bottle-${i}`,
      entryId: `entry-${i}`,
      containerType: "BOTTLE",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ],
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Unmocked down to fetch, so it counts what a signed-out visitor's page view
// costs the backend whatever the cellar feature does internally. Confirmed to
// fail, at 151 calls, against the per-entry getBeer join it replaced.
describe("a public cellar page view", () => {
  it("makes one backend call however many beers the cellar holds", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("/api/v1/cellars/")
        ? Response.json({
            username: "testuser",
            entries: Array.from({ length: 150 }, (_, i) => entry(i)),
            page: 0,
            totalPages: 1,
            totalBeers: 150,
            totalBottles: 150,
          })
        : Response.json({ id: "beer", name: "Beer", brewery: { name: "Brewery" }, style: "Lager", abv: 5 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await PublicCellarPage({
      params: Promise.resolve({ locale: "en", username: "testuser" }),
      searchParams: Promise.resolve({}),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
