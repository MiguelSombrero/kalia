import { entryOf } from "@/testing/cellarEntries";

import { findEntries, sortEntries, totalsOf } from "./model";

const entries = [
  entryOf({ id: "1", name: "Zeta Stout", style: "Stout", abv: 9, bestBefore: ["2030-01-01", "2030-01-01"] }),
  entryOf({ id: "2", name: "Älvä Ale", style: "Pale Ale", abv: 4.5, bestBefore: ["2027-05-01"] }),
  entryOf({ id: "3", name: "Mild One", style: "Mild", abv: 4.5, bestBefore: ["2026-01-01", undefined, undefined] }),
  entryOf({ id: "4", name: "Undated", style: "Gose", abv: 12, bestBefore: [undefined] }),
];
const names = (list: ReturnType<typeof sortEntries>) => list.map((entry) => entry.beer.name);

describe("sortEntries", () => {
  it("orders by name in the reader's language, so Älvä follows Z in English and A in Finnish", () => {
    expect(names(sortEntries(entries, "name", "en"))[0]).toBe("Älvä Ale");
    expect(names(sortEntries(entries, "name", "fi"))).toEqual(["Mild One", "Undated", "Zeta Stout", "Älvä Ale"]);
  });

  it("orders by style", () => {
    expect(names(sortEntries(entries, "style", "en"))).toEqual(["Undated", "Mild One", "Älvä Ale", "Zeta Stout"]);
  });

  it("orders by strength, strongest first, and ties by name", () => {
    expect(names(sortEntries(entries, "strength", "en"))).toEqual(["Undated", "Zeta Stout", "Älvä Ale", "Mild One"]);
  });

  it("orders by bottles held, most first, and ties by name", () => {
    expect(names(sortEntries(entries, "bottles", "en"))).toEqual(["Mild One", "Zeta Stout", "Älvä Ale", "Undated"]);
  });

  it("orders by the soonest best-before of any bottle, beers with no date last", () => {
    expect(names(sortEntries(entries, "bestBefore", "en"))).toEqual(["Mild One", "Älvä Ale", "Zeta Stout", "Undated"]);
  });

  it("does not change the list it is given", () => {
    const before = names(entries);
    sortEntries(entries, "strength", "en");
    expect(names(entries)).toEqual(before);
  });
});

describe("findEntries", () => {
  it("matches a beer's name or its brewery's, ignoring case and accents", () => {
    const list = [entryOf({ id: "1", name: "Pimeä Portteri", brewery: "Kallio" }), entryOf({ id: "2", name: "Hazy", brewery: "Pimeän Panimo" }), entryOf({ id: "3", name: "Other", brewery: "Else" })];

    expect(names(findEntries(list, "pimea"))).toEqual(["Pimeä Portteri", "Hazy"]);
    expect(names(findEntries(list, "  KALLIO "))).toEqual(["Pimeä Portteri"]);
  });

  it("does not match a style, and a blank find keeps everything", () => {
    expect(findEntries(entries, "stout")).toHaveLength(1);
    expect(findEntries(entries, "gose")).toHaveLength(0);
    expect(findEntries(entries, "   ")).toBe(entries);
  });
});

describe("totalsOf", () => {
  it("counts beers and the bottles held of them", () => {
    expect(totalsOf(entries)).toEqual({ beers: 4, bottles: 7 });
    expect(totalsOf([])).toEqual({ beers: 0, bottles: 0 });
  });
});
