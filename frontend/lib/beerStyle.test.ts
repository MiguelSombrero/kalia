import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { beerStyleGroup, beerStyleGroups } from "./beerStyle";

describe("beerStyleGroup", () => {
  it.each([
    ["IPA", "ipa"],
    ["Double IPA", "ipa"],
    ["Session IPA", "ipa"],
    ["Belgian IPA", "ipa"],
    ["Imperial Stout", "stout"],
    ["Oatmeal Stout", "stout"],
    ["Porter", "porter"],
    ["Dunkel", "brown-lager"],
    ["Doppelbock", "brown-lager"],
    ["Hefeweizen", "wheat"],
    ["Weizenbock", "wheat"],
    ["Pale Ale", "pale-ale"],
    ["Session Ale", "pale-ale"],
    ["Tripel", "belgian-light"],
    ["Belgian Blonde", "belgian-light"],
    ["Belgian Strong Golden Ale", "belgian-light"],
    ["Belgian Pale Ale", "belgian-light"],
    ["Dubbel", "belgian-dark"],
    ["Quadrupel", "belgian-dark"],
    ["Belgian Strong Dark Ale", "belgian-dark"],
    ["Gueuze", "sour"],
    ["Kriek", "sour"],
    ["Fruit Lambic", "sour"],
    ["Gose", "sour"],
    ["Wild Ale", "sour"],
    ["American Wild Ale", "sour"],
    ["Barleywine", "strong-ale"],
  ])("puts the catalog's %s in %s", (style, group) => {
    expect(beerStyleGroup(style)).toBe(group);
  });

  it.each([
    ["Baltic Porter", "porter"],
    ["Milk Stout", "stout"],
    ["Märzen", "brown-lager"],
    ["Oktoberfest", "brown-lager"],
    ["Rauchbier", "brown-lager"],
    ["Amber Lager", "brown-lager"],
    ["Vienna Lager", "brown-lager"],
    ["Czech Pils", "light-lager"],
    ["Helles", "light-lager"],
    ["Extra Special Bitter", "english-ale"],
    ["Brown Ale", "english-ale"],
    ["Old Ale", "strong-ale"],
  ])("puts %s, which the catalog does not have yet, in %s", (style, group) => {
    expect(beerStyleGroup(style)).toBe(group);
  });

  it.each([
    ["Berliner Weisse", "sour", "a sour before a wheat beer"],
    ["Dunkelweizen", "wheat", "a wheat beer before a brown lager"],
    ["Maibock", "light-lager", "a pale lager before a bock"],
    ["Dark Lager", "brown-lager", "a brown lager before a light one"],
    ["Scotch Ale", "strong-ale", "a strong ale, where a Scottish ale is English-style"],
  ])("puts %s in %s: %s", (style, group) => {
    expect(beerStyleGroup(style)).toBe(group);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(beerStyleGroup("  imperial STOUT ")).toBe("stout");
  });

  it("puts a style no group names in other", () => {
    expect(beerStyleGroup("Mead")).toBe("other");
    expect(beerStyleGroup("")).toBe("other");
  });
});

describe("beerStyleGroups", () => {
  it("has a [data-beer-style] block in globals.css for every group but other, and no block for anything else", () => {
    const css = readFileSync(resolve(import.meta.dirname, "../app/globals.css"), "utf8");
    const blocks = [...css.matchAll(/\[data-beer-style="([^"]+)"\]/g)].map((m) => m[1]).sort();

    expect(blocks).toEqual(beerStyleGroups.filter((g) => g !== "other").sort());
  });
});
