import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { beerStyleGroup, beerStyleGroups } from "./beer-style";

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
    ["Fruit Beer", "sour"],
    ["Brett Beer", "sour"],
    ["Faro", "sour"],
    ["Winter Warmer", "strong-ale"],
    ["Adambier", "strong-ale"],
    ["Ice Beer", "light-lager"],
    ["Light Beer", "light-lager"],
    ["Zwickelbier", "light-lager"],
    ["Rice Beer", "light-lager"],
    ["Smoked Beer", "brown-lager"],
    ["Smoked Lager", "brown-lager"],
    ["Steam Beer", "brown-lager"],
    ["Cream Ale", "pale-ale"],
    ["Champagne Beer", "belgian-light"],
    ["Farmhouse Ale", "belgian-light"],
    ["Altbier", "english-ale"],
    ["Pumpkin Ale", "english-ale"],
    ["Bière de Garde", "english-ale"],
    ["Biere de Garde", "english-ale"],
  ])("puts the Wikidata import's %s in %s", (style, group) => {
    expect(beerStyleGroup(style)).toBe(group);
  });

  it.each([
    ["Berliner Weisse", "sour", "a sour before a wheat beer"],
    ["Wheatwine", "strong-ale", "a strong ale before a wheat beer"],
    ["Fruited Imperial Stout", "stout", "a stout before a fruit beer"],
    ["Brett IPA", "ipa", "an IPA before a wild ale"],
    ["Smoked Porter", "porter", "a porter before a smoked beer"],
    ["Farmhouse IPA", "ipa", "an IPA before a farmhouse ale"],
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

  it.each(["Low-Alcohol Beer", "Chili Beer", "Small Beer", "Rye Beer", "Keut"])(
    "leaves %s in other, because its name says nothing reliable about colour",
    (style) => {
      expect(beerStyleGroup(style)).toBe("other");
    },
  );

  it("puts no Wikidata-imported style in other except those that stay grey on purpose", () => {
    const sql = readFileSync(
      resolve(import.meta.dirname, "../../../../backend/src/main/resources/db/migration/catalog/V008__catalog_wikidata_import.sql"),
      "utf8",
    );
    const styles = new Set(
      [...sql.matchAll(/^\s+\('Q\d+', '(?:[^']|'')*', '((?:[^']|'')*)', [\d.]+, 'Q\d+'\)/gm)].map((m) => m[1].replaceAll("''", "'")),
    );

    expect(styles.size).toBeGreaterThan(100);
    expect([...styles].filter((s) => beerStyleGroup(s) === "other").sort()).toEqual(
      ["Chili Beer", "Keut", "Low-Alcohol Beer", "Rye Beer", "Small Beer"],
    );
  });
});

describe("beerStyleGroups", () => {
  it("has a generated block for every group but other, and no block for anything else", () => {
    const css = readFileSync(resolve(import.meta.dirname, "../../../../web/app/tokens.generated.css"), "utf8");
    const blocks = [...css.matchAll(/\[data-beer-style="([^"]+)"\]/g)].map((m) => m[1]).sort();

    expect(blocks).toEqual(beerStyleGroups.filter((g) => g !== "other").sort());
  });
});
