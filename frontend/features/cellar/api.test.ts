import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPublicCellar,
  listCellarBottles,
  listCellarEntries,
  removeCellarBottle,
  resolvePublicCellarBeers,
  updateCellarBottle,
} from "./api";
import type { CellarBeerRow, PublicCellar } from "./types";

const beerId = "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f";
const entryId = "e1111111-1111-1111-1111-111111111111";

const beerDetails = {
  id: beerId,
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  price: { cents: 1250, currency: "EUR" },
  brewery: { id: "br1", name: "Brouwerij Westvleteren", country: "Belgium", city: "Vleteren" },
};

describe("listCellarEntries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges each entry with its catalog beer, sorted by beer name", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/api/v1/cellar") && !url.includes("/bottles")) {
        return Response.json([
          { id: entryId, beerId, quantity: 2, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        ]);
      }
      if (url.includes(`/api/v1/beers/${beerId}`)) {
        return Response.json(beerDetails);
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const expected: CellarBeerRow[] = [
      {
        entryId,
        beerId,
        beerName: "Westvleteren 12",
        breweryName: "Brouwerij Westvleteren",
        style: "Quadrupel",
        abv: 10.2,
        bottleCount: 2,
      },
    ];
    await expect(listCellarEntries()).resolves.toEqual(expected);
  });

  it("drops an entry whose last bottle has already been removed", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/api/v1/cellar") && !url.includes("/bottles")) {
        return Response.json([
          { id: entryId, beerId, quantity: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        ]);
      }
      if (url.includes(`/api/v1/beers/${beerId}`)) {
        return Response.json(beerDetails);
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listCellarEntries()).resolves.toEqual([]);
  });

  it("throws when the entries lookup fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    await expect(listCellarEntries()).rejects.toThrow("status 500");
  });

  it("drops an entry whose beer no longer exists in the catalog, rather than failing the whole list", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/api/v1/cellar")) {
        return Response.json([
          { id: entryId, beerId, quantity: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        ]);
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listCellarEntries()).resolves.toEqual([]);
  });

  it("throws when a referenced beer lookup fails for a reason other than 404", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/api/v1/cellar")) {
        return Response.json([
          { id: entryId, beerId, quantity: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        ]);
      }
      return new Response(null, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listCellarEntries()).rejects.toThrow("status 500");
  });
});

describe("getPublicCellar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the cellar for a public username", async () => {
    const cellar = { username: "testuser", entries: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("/api/v1/cellars/testuser");
        return Response.json(cellar);
      }),
    );

    await expect(getPublicCellar("testuser")).resolves.toEqual(cellar);
  });

  it("returns null for a 404 — unknown, private and profileless are one answer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    await expect(getPublicCellar("nobody")).resolves.toBeNull();
  });

  it("throws on any other failure rather than masking it as not-found", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    await expect(getPublicCellar("testuser")).rejects.toThrow("status 500");
  });
});

describe("resolvePublicCellarBeers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const cellar: PublicCellar = {
    username: "testuser",
    entries: [
      {
        id: entryId,
        beerId,
        quantity: 2,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        bottles: [
          {
            id: "bottle-recent",
            entryId,
            containerType: "BOTTLE",
            brewedDate: "2025-01-01",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
          {
            id: "bottle-oldest",
            entryId,
            containerType: "CAN",
            brewedDate: "2020-01-01",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        ],
      },
    ],
  };

  it("merges each entry with its catalog beer and sorts bottles oldest brewed first", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes(`/api/v1/beers/${beerId}`)) {
          return Response.json(beerDetails);
        }
        throw new Error(`unexpected url ${url}`);
      }),
    );

    const beers = await resolvePublicCellarBeers(cellar);

    expect(beers).toHaveLength(1);
    expect(beers[0]).toMatchObject({
      entryId,
      beerId,
      beerName: "Westvleteren 12",
      breweryName: "Brouwerij Westvleteren",
      style: "Quadrupel",
      abv: 10.2,
    });
    expect(beers[0].bottles.map((bottle) => bottle.id)).toEqual(["bottle-oldest", "bottle-recent"]);
  });

  it("drops an entry whose beer no longer exists in the catalog", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    await expect(resolvePublicCellarBeers(cellar)).resolves.toEqual([]);
  });
});

describe("listCellarBottles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sorts bottles by brewed date, oldest first, with unknown dates last", async () => {
    const bottles = [
      {
        id: "bottle-recent",
        entryId,
        containerType: "BOTTLE",
        brewedDate: "2024-01-01",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      {
        id: "bottle-no-date",
        entryId,
        containerType: "KEG",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      {
        id: "bottle-oldest",
        entryId,
        containerType: "BOTTLE",
        brewedDate: "2020-01-01",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(bottles)));

    const result = await listCellarBottles(entryId);

    expect(result.map((bottle) => bottle.id)).toEqual(["bottle-oldest", "bottle-recent", "bottle-no-date"]);
  });

  it("throws when the bottles lookup fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    await expect(listCellarBottles(entryId)).rejects.toThrow("status 500");
  });
});

describe("updateCellarBottle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const request = { containerType: "CAN" as const, brewedDate: "2024-01-01" };

  it("returns the updated bottle", async () => {
    const updated = {
      id: "bottle-1",
      entryId,
      containerType: "CAN",
      brewedDate: "2024-01-01",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
    };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(updated)));

    await expect(updateCellarBottle("bottle-1", request)).resolves.toEqual(updated);
  });

  it("throws when the update fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    await expect(updateCellarBottle("bottle-1", request)).rejects.toThrow("status 404");
  });
});

describe("removeCellarBottle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves once the bottle is removed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));

    await expect(removeCellarBottle("bottle-1")).resolves.toBeUndefined();
  });

  it("throws when the removal fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    await expect(removeCellarBottle("bottle-1")).rejects.toThrow("status 404");
  });
});
