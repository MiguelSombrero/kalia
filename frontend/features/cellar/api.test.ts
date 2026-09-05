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
const secondBeerId = "6a0b1b4f-2a3c-5d4e-9f5a-6b7c8d9e0f10";
const entryId = "e1111111-1111-1111-1111-111111111111";
const secondEntryId = "e2222222-2222-2222-2222-222222222222";

const beerSummary = {
  id: beerId,
  name: "Westvleteren 12",
  style: "Quadrupel",
  abv: 10.2,
  price: { cents: 1250, currency: "EUR" },
  brewery: { id: "br1", name: "Brouwerij Westvleteren" },
};

const secondBeerSummary = {
  id: secondBeerId,
  name: "Rochefort 10",
  style: "Quadrupel",
  abv: 11.3,
  price: { cents: 990, currency: "EUR" },
  brewery: { id: "br2", name: "Brasserie de Rochefort" },
};

// The public cellar read still enriches per entry via getBeer (BeerDetailsDto).
const beerDetails = {
  ...beerSummary,
  brewery: { ...beerSummary.brewery, country: "Belgium", city: "Vleteren" },
};

const isEntriesUrl = (url: string) =>
  url.includes("/api/v1/cellar") && !url.includes("/bottles");
const isBatchUrl = (url: string) => url.includes("/api/v1/beers/batch");

const makeBeerId = (i: number) => `00000000-0000-4000-8000-${i.toString().padStart(12, "0")}`;

const makeBeerSummary = (i: number) => ({
  id: makeBeerId(i),
  name: `Beer ${i}`,
  style: "Lager",
  abv: 5,
  price: { cents: 500, currency: "EUR" },
  brewery: { id: "br", name: "Brewery" },
});

const makeEntries = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `entry-${i}`,
    beerId: makeBeerId(i),
    quantity: 1,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  }));

const requestedBatchIds = (url: string) => new URL(url, "http://localhost").searchParams.getAll("ids");

describe("listCellarEntries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges each entry with its catalog beer, sorted by beer name", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (isEntriesUrl(url)) {
        return Response.json([
          { id: entryId, beerId, quantity: 2, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        ]);
      }
      if (isBatchUrl(url)) {
        return Response.json([beerSummary]);
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

  it("enriches a multi-beer cellar with a single batch call, not one per beer", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (isEntriesUrl(url)) {
        return Response.json([
          { id: entryId, beerId, quantity: 2, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
          {
            id: secondEntryId,
            beerId: secondBeerId,
            quantity: 1,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        ]);
      }
      if (isBatchUrl(url)) {
        expect(url).toContain(`ids=${beerId}`);
        expect(url).toContain(`ids=${secondBeerId}`);
        return Response.json([beerSummary, secondBeerSummary]);
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const rows = await listCellarEntries();

    expect(rows.map((row) => row.beerName)).toEqual(["Rochefort 10", "Westvleteren 12"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("drops an entry whose last bottle has already been removed", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (isEntriesUrl(url)) {
        return Response.json([
          { id: entryId, beerId, quantity: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        ]);
      }
      if (isBatchUrl(url)) {
        return Response.json([beerSummary]);
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

  it("drops an entry whose beer the batch lookup omits, rather than failing the whole list", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (isEntriesUrl(url)) {
        return Response.json([
          { id: entryId, beerId, quantity: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
          {
            id: secondEntryId,
            beerId: secondBeerId,
            quantity: 1,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        ]);
      }
      if (isBatchUrl(url)) {
        return Response.json([secondBeerSummary]);
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const rows = await listCellarEntries();

    expect(rows.map((row) => row.beerName)).toEqual(["Rochefort 10"]);
  });

  it("throws when the batch beer lookup fails", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (isEntriesUrl(url)) {
        return Response.json([
          { id: entryId, beerId, quantity: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        ]);
      }
      return new Response(null, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listCellarEntries()).rejects.toThrow("status 500");
  });

  it("chunks a cellar of more than 100 distinct beers into multiple batch calls, merging every beer into the rendered list", async () => {
    const count = 150;
    const entries = makeEntries(count);
    const beersById = new Map(entries.map((entry, i) => [entry.beerId, makeBeerSummary(i)]));
    const batchCallSizes: number[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      if (isEntriesUrl(url)) {
        return Response.json(entries);
      }
      if (isBatchUrl(url)) {
        const ids = requestedBatchIds(url);
        batchCallSizes.push(ids.length);
        return Response.json(ids.map((id) => beersById.get(id)));
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const rows = await listCellarEntries();

    expect(rows).toHaveLength(count);
    expect(batchCallSizes.sort((a, b) => b - a)).toEqual([100, 50]);
  });

  it("issues exactly one batch call for a cellar of exactly 100 distinct beers", async () => {
    const count = 100;
    const entries = makeEntries(count);
    const beersById = new Map(entries.map((entry, i) => [entry.beerId, makeBeerSummary(i)]));
    let batchCallCount = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (isEntriesUrl(url)) {
        return Response.json(entries);
      }
      if (isBatchUrl(url)) {
        batchCallCount += 1;
        const ids = requestedBatchIds(url);
        return Response.json(ids.map((id) => beersById.get(id)));
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const rows = await listCellarEntries();

    expect(rows).toHaveLength(count);
    expect(batchCallCount).toBe(1);
  });

  it("throws when one chunk of a multi-chunk batch lookup fails, rather than rendering a partial cellar", async () => {
    const entries = makeEntries(150);
    const beersById = new Map(entries.map((entry, i) => [entry.beerId, makeBeerSummary(i)]));
    let batchCallCount = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (isEntriesUrl(url)) {
        return Response.json(entries);
      }
      if (isBatchUrl(url)) {
        batchCallCount += 1;
        if (batchCallCount === 2) {
          return new Response(null, { status: 500 });
        }
        const ids = requestedBatchIds(url);
        return Response.json(ids.map((id) => beersById.get(id)));
      }
      throw new Error(`unexpected url ${url}`);
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
