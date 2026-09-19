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
  brewery: { id: "br1", name: "Brouwerij Westvleteren" },
};

const secondBeerSummary = {
  id: secondBeerId,
  name: "Rochefort 10",
  style: "Quadrupel",
  abv: 11.3,
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

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: entryId,
  beerId,
  quantity: 1,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});

/** What a stubbed endpoint answers: a `number` is an HTTP status with an
 *  empty body, anything else is a JSON body served with a 200. */
type Answer = unknown;

const respond = (answer: Answer) =>
  typeof answer === "number" ? new Response(null, { status: answer }) : Response.json(answer);

const stubFetch = (answerFor: (url: string) => Answer) => {
  const fetchMock = vi.fn(async (url: string) => respond(answerFor(url)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

/**
 * Stands in for the two calls listCellarEntries makes: one entries read, then
 * one batched beer lookup per chunk of distinct beer ids. `batch` is handed
 * the ids that chunk asked for and its 0-based call index, so a test can vary
 * the answer per chunk. Returns the ids of every batch call for assertions.
 */
const stubCellarFetch = ({
  entries = [],
  batch = () => [],
}: {
  entries?: Answer;
  batch?: (ids: string[], callIndex: number) => Answer;
}) => {
  const batchCalls: string[][] = [];
  const fetchMock = stubFetch((url) => {
    if (isEntriesUrl(url)) {
      return entries;
    }
    if (isBatchUrl(url)) {
      const ids = new URL(url, "http://localhost").searchParams.getAll("ids");
      batchCalls.push(ids);
      return batch(ids, batchCalls.length - 1);
    }
    throw new Error(`unexpected url ${url}`);
  });
  return { fetchMock, batchCalls };
};

/** Answers a batch call from a catalog keyed by beer id, omitting unknown ids. */
const fromCatalog = (beersById: Map<string, unknown>) => (ids: string[]) =>
  ids.map((id) => beersById.get(id)).filter(Boolean);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listCellarEntries", () => {
  it("merges each entry with its catalog beer, sorted by beer name", async () => {
    stubCellarFetch({
      entries: [entry({ quantity: 2 })],
      batch: () => [beerSummary],
    });

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
    const { fetchMock, batchCalls } = stubCellarFetch({
      entries: [entry({ quantity: 2 }), entry({ id: secondEntryId, beerId: secondBeerId })],
      batch: () => [beerSummary, secondBeerSummary],
    });

    const rows = await listCellarEntries();

    expect(rows.map((row) => row.beerName)).toEqual(["Rochefort 10", "Westvleteren 12"]);
    expect(batchCalls).toEqual([[beerId, secondBeerId]]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("drops an entry whose last bottle has already been removed", async () => {
    stubCellarFetch({ entries: [entry({ quantity: 0 })], batch: () => [beerSummary] });

    await expect(listCellarEntries()).resolves.toEqual([]);
  });

  it("throws when the entries lookup fails", async () => {
    stubCellarFetch({ entries: 500 });

    await expect(listCellarEntries()).rejects.toThrow("status 500");
  });

  it("drops an entry whose beer the batch lookup omits, rather than failing the whole list", async () => {
    stubCellarFetch({
      entries: [entry(), entry({ id: secondEntryId, beerId: secondBeerId })],
      batch: () => [secondBeerSummary],
    });

    const rows = await listCellarEntries();

    expect(rows.map((row) => row.beerName)).toEqual(["Rochefort 10"]);
  });

  it("throws when the batch beer lookup fails", async () => {
    stubCellarFetch({ entries: [entry()], batch: () => 500 });

    await expect(listCellarEntries()).rejects.toThrow("status 500");
  });

  it("chunks a cellar of more than 100 distinct beers into multiple batch calls, merging every beer into the rendered list", async () => {
    const entries = makeEntries(150);
    const beersById = new Map(entries.map((e, i) => [e.beerId, makeBeerSummary(i)]));
    const { batchCalls } = stubCellarFetch({ entries, batch: fromCatalog(beersById) });

    const rows = await listCellarEntries();

    expect(rows).toHaveLength(150);
    expect(batchCalls.map((ids) => ids.length).sort((a, b) => b - a)).toEqual([100, 50]);
  });

  it("issues exactly one batch call for a cellar of exactly 100 distinct beers", async () => {
    const entries = makeEntries(100);
    const beersById = new Map(entries.map((e, i) => [e.beerId, makeBeerSummary(i)]));
    const { batchCalls } = stubCellarFetch({ entries, batch: fromCatalog(beersById) });

    const rows = await listCellarEntries();

    expect(rows).toHaveLength(100);
    expect(batchCalls).toHaveLength(1);
  });

  it("throws when one chunk of a multi-chunk batch lookup fails, rather than rendering a partial cellar", async () => {
    const entries = makeEntries(150);
    const beersById = new Map(entries.map((e, i) => [e.beerId, makeBeerSummary(i)]));
    stubCellarFetch({
      entries,
      batch: (ids, callIndex) => (callIndex === 1 ? 500 : fromCatalog(beersById)(ids)),
    });

    await expect(listCellarEntries()).rejects.toThrow("status 500");
  });
});

describe("getPublicCellar", () => {
  it("returns the cellar for a public username", async () => {
    const cellar = { username: "testuser", entries: [] };
    const fetchMock = stubFetch(() => cellar);

    await expect(getPublicCellar("testuser")).resolves.toEqual(cellar);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/cellars/testuser"),
      expect.anything(),
    );
  });

  it("returns null for a 404 — unknown, private and profileless are one answer", async () => {
    stubFetch(() => 404);

    await expect(getPublicCellar("nobody")).resolves.toBeNull();
  });

  it("throws on any other failure rather than masking it as not-found", async () => {
    stubFetch(() => 500);

    await expect(getPublicCellar("testuser")).rejects.toThrow("status 500");
  });
});

describe("resolvePublicCellarBeers", () => {
  const cellar: PublicCellar = {
    username: "testuser",
    entries: [
      {
        ...entry({ quantity: 2 }),
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
    stubFetch((url) => {
      if (url.includes(`/api/v1/beers/${beerId}`)) {
        return beerDetails;
      }
      throw new Error(`unexpected url ${url}`);
    });

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
    stubFetch(() => 404);

    await expect(resolvePublicCellarBeers(cellar)).resolves.toEqual([]);
  });
});

describe("listCellarBottles", () => {
  it("sorts bottles by brewed date, oldest first, with unknown dates last", async () => {
    stubFetch(() => [
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
    ]);

    const result = await listCellarBottles(entryId);

    expect(result.map((bottle) => bottle.id)).toEqual([
      "bottle-oldest",
      "bottle-recent",
      "bottle-no-date",
    ]);
  });

  it("throws when the bottles lookup fails", async () => {
    stubFetch(() => 500);

    await expect(listCellarBottles(entryId)).rejects.toThrow("status 500");
  });
});

describe("updateCellarBottle", () => {
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
    stubFetch(() => updated);

    await expect(updateCellarBottle("bottle-1", request)).resolves.toEqual(updated);
  });

  it("throws when the update fails", async () => {
    stubFetch(() => 404);

    await expect(updateCellarBottle("bottle-1", request)).rejects.toThrow("status 404");
  });
});

describe("removeCellarBottle", () => {
  it("resolves once the bottle is removed", async () => {
    stubFetch(() => 204);

    await expect(removeCellarBottle("bottle-1")).resolves.toBeUndefined();
  });

  it("throws when the removal fails", async () => {
    stubFetch(() => 404);

    await expect(removeCellarBottle("bottle-1")).rejects.toThrow("status 404");
  });
});
