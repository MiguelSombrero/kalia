import { afterEach, describe, expect, it, vi } from "vitest";
import { isApiError } from "@/lib/api/api-error";
import {
  getPublicCellar,
  heldBottlesByBeer,
  heldBottlesByBeerOrNone,
  listCellarEntries,
  removeCellarBottle,
  updateCellarBottle,
} from "./api";
import type { Bottle, CellarBeer } from "./types";

const beerId = "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f";
const secondBeerId = "6a0b1b4f-2a3c-5d4e-9f5a-6b7c8d9e0f10";
const entryId = "e1111111-1111-1111-1111-111111111111";
const secondEntryId = "e2222222-2222-2222-2222-222222222222";

const beer = {
  id: beerId,
  name: "Westvleteren 12",
  brewery: "Brouwerij Westvleteren",
  style: "Quadrupel",
  abv: 10.2,
};

const secondBeer = {
  id: secondBeerId,
  name: "Rochefort 10",
  brewery: "Brasserie de Rochefort",
  style: "Quadrupel",
  abv: 11.3,
};

const bottle = (id: string, overrides: Partial<Bottle> = {}): Bottle => ({
  id,
  entryId,
  containerType: "BOTTLE",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: entryId,
  beer,
  quantity: 1,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  bottles: [bottle("bottle-1")],
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("heldBottlesByBeer", () => {
  it("counts bottles by beer from the one entries read", async () => {
    const fetchMock = stubFetch(() => [
      entry({ quantity: 3 }),
      entry({ id: secondEntryId, beer: secondBeer, quantity: 2 }),
    ]);

    await expect(heldBottlesByBeer()).resolves.toEqual(
      new Map([
        [beerId, 3],
        [secondBeerId, 2],
      ]),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the entries lookup fails, and the OrNone form logs it and gives nothing", async () => {
    stubFetch(() => 500);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(heldBottlesByBeer()).rejects.toThrow("status 500");
    await expect(heldBottlesByBeerOrNone()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledOnce();
  });
});

describe("listCellarEntries", () => {
  it("maps each entry's joined beer onto a row, its bottles in vintage order", async () => {
    const undated = bottle("undated");
    const recent = bottle("recent", { brewedDate: "2025-05-14" });
    const oldest = bottle("oldest", { brewedDate: "2021-10-04" });
    stubFetch(() => [entry({ quantity: 3, bottles: [undated, recent, oldest] })]);

    const expected: CellarBeer[] = [
      {
        entryId,
        beerId,
        beerName: "Westvleteren 12",
        breweryName: "Brouwerij Westvleteren",
        style: "Quadrupel",
        abv: 10.2,
        bottles: [oldest, recent, undated],
      },
    ];
    await expect(listCellarEntries()).resolves.toEqual(expected);
  });

  it("reads a cellar of many beers in one backend call, keeping the backend's order", async () => {
    const fetchMock = stubFetch((url) => {
      if (url.includes("/api/v1/cellar")) {
        return [entry({ id: secondEntryId, beer: secondBeer }), entry()];
      }
      throw new Error(`unexpected url ${url}`);
    });

    const rows = await listCellarEntries();

    expect(rows.map((row) => row.beerName)).toEqual(["Rochefort 10", "Westvleteren 12"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the entries lookup fails", async () => {
    stubFetch(() => 500);

    await expect(listCellarEntries()).rejects.toThrow("status 500");
  });
});

describe("getPublicCellar", () => {
  it("maps a public cellar's joined beers onto rows, its bottles oldest brewed first", async () => {
    const fetchMock = stubFetch(() => ({
      username: "testuser",
      page: 0,
      totalPages: 1,
      totalBeers: 1,
      totalBottles: 2,
      lastBottleAddedAt: "2026-01-02T10:00:00Z",
      entries: [
        entry({
          quantity: 2,
          bottles: [
            bottle("bottle-recent", { brewedDate: "2025-01-01" }),
            bottle("bottle-oldest", { containerType: "CAN", brewedDate: "2020-01-01" }),
          ],
        }),
      ],
    }));

    const cellar = await getPublicCellar("testuser");

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/cellars/testuser"), expect.anything());
    expect(cellar).toMatchObject({
      username: "testuser",
      page: 0,
      totalPages: 1,
      totalBeers: 1,
      totalBottles: 2,
      lastBottleAddedAt: "2026-01-02T10:00:00Z",
    });
    expect(cellar?.beers).toHaveLength(1);
    expect(cellar?.beers[0]).not.toHaveProperty("unlistedBottles");
    expect(cellar?.beers[0]).toMatchObject({
      entryId,
      beerId,
      beerName: "Westvleteren 12",
      breweryName: "Brouwerij Westvleteren",
      style: "Quadrupel",
      abv: 10.2,
    });
    expect(cellar?.beers[0].bottles.map((b) => b.id)).toEqual(["bottle-oldest", "bottle-recent"]);
  });

  it("asks for the page it is given, and for none at all on the first", async () => {
    const fetchMock = stubFetch(() => ({
      username: "testuser",
      entries: [],
      page: 2,
      totalPages: 3,
      totalBeers: 45,
      totalBottles: 45,
    }));

    await getPublicCellar("testuser");
    await getPublicCellar("testuser", 2);

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/cellars\/testuser$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/v1\/cellars\/testuser\?page=2$/);
  });

  it("records the bottles a capped entry holds beyond those it lists", async () => {
    stubFetch(() => ({
      username: "testuser",
      entries: [entry({ quantity: 48, bottles: [bottle("b1"), bottle("b2")] })],
      page: 0,
      totalPages: 1,
      totalBeers: 1,
      totalBottles: 48,
    }));

    const cellar = await getPublicCellar("testuser");

    expect(cellar?.beers[0].unlistedBottles).toBe(46);
  });

  it("returns null for a 404 — unknown, private and profileless are one answer", async () => {
    stubFetch(() => 404);

    await expect(getPublicCellar("nobody")).resolves.toBeNull();
  });

  it("returns null for a 400 — a username longer than any account can have", async () => {
    stubFetch(() => 400);

    await expect(getPublicCellar("a".repeat(256))).resolves.toBeNull();
  });

  it("returns null for a username that could not be put in a path", async () => {
    const fetchMock = stubFetch(() => 200);

    await expect(getPublicCellar("..")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws on any other failure rather than masking it as not-found", async () => {
    stubFetch(() => 500);

    await expect(getPublicCellar("testuser")).rejects.toThrow("status 500");
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

// The generated client builds each URL and kaliaFetch sends it, so these run
// both for real: a crafted value either reaches its own route or is refused.
describe.each([
  ["getPublicCellar", "/api/v1/cellars", (value: string) => getPublicCellar(value)],
  [
    "updateCellarBottle",
    "/api/v1/cellar/bottles",
    (value: string) => updateCellarBottle(value, { containerType: "CAN" }),
  ],
  ["removeCellarBottle", "/api/v1/cellar/bottles", (value: string) => removeCellarBottle(value)],
])("%s with a crafted path parameter", (_, route, call) => {
  it.each(["../../me", "x/../../cellar", "a?b=c", "a#b", "..", ".", "%2e%2e", ""])(
    "never calls a route other than its own for %j",
    async (value) => {
      const fetchMock = stubFetch(() => 404);

      const outcome = await call(value).catch((error: unknown) => error);

      if (fetchMock.mock.calls.length === 0) {
        const refused = isApiError(outcome) && outcome.kind === "refused";
        expect(refused || outcome === null).toBe(true);
        return;
      }
      const sent = new URL(fetchMock.mock.calls[0][0]);
      expect(sent.search).toBe("");
      expect(sent.hash).toBe("");
      expect(sent.pathname.slice(0, sent.pathname.lastIndexOf("/"))).toBe(route);
      expect(decodeURIComponent(sent.pathname.slice(sent.pathname.lastIndexOf("/") + 1))).toBe(value);
    },
  );
});
