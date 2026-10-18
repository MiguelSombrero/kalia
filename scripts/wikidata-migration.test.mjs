#!/usr/bin/env node
// Tests for wikidata-migration.mjs: its rules over the fixture in
// scripts/wikidata/fixture/, and the committed mapping files against the real
// snapshot and seed. `make check` separately diffs the committed migration
// against a fresh generation.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { reduce } from "./wikidata-extract.mjs";
import { SEED_PATH, convert, foldName, parseSeed, storedAbv, toSql } from "./wikidata-migration.mjs";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(resolve(SELF_DIR, path), "utf8"));

const snapshot = reduce(readJson("wikidata/fixture/raw.json"));
const styles = [
  { qid: "Q1543214", style: "IPA" },
  { qid: "Q2493192", style: "Imperial Stout" },
  { qid: "Q85745517", style: null },
];
const seed = {
  breweries: [{ name: "Seed Brouwerij", country: "Belgium", qid: "Q101" }],
  beers: [{ brewery: "Seed Brouwerij", name: "Seeded Beer", qid: "Q11" }],
};
const converted = convert(snapshot, styles, seed);
const imported = new Map(converted.beers.map((b) => [b.qid, b]));

test("strict rows: a beer with a specific style, one in-range ABV and one brewery is imported", () => {
  assert.deepEqual(imported.get("Q1"), {
    qid: "Q1",
    name: "English Name",
    style: "IPA",
    abv: 5.5,
    brewery: { qid: "Q100" },
  });
});

test("a negative ABV, or one above 100, drops the beer; 0% and above 20% are kept", () => {
  assert.equal(imported.has("Q6"), false);
  assert.equal(imported.has("Q7"), false);
  assert.equal(imported.get("Q2").abv, 0);
  assert.equal(imported.get("Q9").abv, 25);
});

test("a beer with conflicting ABVs is dropped rather than guessed", () => {
  assert.equal(imported.has("Q8"), false);
  assert.equal(converted.dropped["beer with conflicting ABVs"], 1);
});

test("a beer whose manufacturer is not a brewery is dropped", () => {
  assert.equal(imported.has("Q10"), false);
  assert.equal(converted.dropped["beer whose manufacturer is not a brewery"], 1);
});

test("ABVs are judged as the column stores them: one decimal, half away from zero", () => {
  assert.deepEqual([5.25, 5.3, 4.15, 4.149, 0, 12, -0.04].map(storedAbv), [5.3, 5.3, 4.2, 4.1, 0, 12, -0]);
  const sameOnceStored = { ...snapshot, beers: snapshot.beers.map((b) => (b.qid === "Q8" ? { ...b, abvs: [5.25, 5.3] } : b)) };
  assert.equal(new Map(convert(sameOnceStored, styles, seed).beers.map((b) => [b.qid, b])).get("Q8").abv, 5.3);
});

test("two imported beers of a seeded brewery with the same folded name are reduced to one", () => {
  const twins = {
    ...snapshot,
    beers: [...snapshot.beers, { qid: "Q23", name: "SEED'S other beer", abvs: [5], styles: ["Q1543214"], manufacturers: ["Q101"] }],
  };
  const result = convert(twins, styles, seed).beers.map((b) => b.qid);
  assert.ok(result.includes("Q22"));
  assert.equal(result.includes("Q23"), false);
});

test("a seed match naming a QID the snapshot lacks stops the conversion", () => {
  assert.throws(() => convert(snapshot, styles, { ...seed, breweries: [{ ...seed.breweries[0], qid: "Q999" }] }), /Q999/);
  assert.throws(() => convert(snapshot, styles, { ...seed, beers: [{ ...seed.beers[0], qid: "Q998" }] }), /Q998/);
});

test("a beer matching a seeded row is skipped, and the seeded brewery's other beers attach to its row", () => {
  assert.equal(imported.has("Q11"), false);
  assert.deepEqual(imported.get("Q22").brewery, { seed: "Seed Brouwerij" });
  assert.equal(converted.breweries.some((b) => b.qid === "Q101"), false);
});

test("a beer made by several breweries is dropped", () => {
  assert.equal(imported.has("Q12"), false);
});

test("breweries sharing a folded name and country merge into the one making the most beers", () => {
  assert.deepEqual(
    converted.breweries.filter((b) => b.name === "Twin Brewery").map((b) => b.qid),
    ["Q103"],
  );
  assert.deepEqual(imported.get("Q13").brewery, { qid: "Q103" });
});

test("a brewery with several cities keeps none rather than guess one", () => {
  assert.equal(converted.breweries.find((b) => b.qid === "Q103").city, null);
  assert.equal(converted.breweries.find((b) => b.qid === "Q100").city, "Alkmaar");
});

test("a brewery with no country or conflicting countries is dropped, and with it its beers", () => {
  const qids = converted.breweries.map((b) => b.qid);
  assert.equal(qids.includes("Q104"), false);
  assert.equal(qids.includes("Q105"), false);
  assert.equal(imported.has("Q21"), false);
});

test("a hand-reviewed country settles a brewery's conflicting countries", () => {
  const settled = convert(snapshot, styles, seed, [{ qid: "Q104", country: "Netherlands" }]);
  assert.equal(settled.breweries.find((b) => b.qid === "Q104").country, "Netherlands");
  assert.throws(() => convert(snapshot, styles, seed, [{ qid: "Q104", country: "France" }]), /brewery-countries/);
});

test("two beers of one brewery with the same folded name are reduced to the earliest", () => {
  assert.equal(foldName("english-name"), foldName("English Name"));
  assert.equal(imported.has("Q16"), false);
  assert.equal(imported.has("Q1"), true);
});

test("a beer needs exactly one style once classes that are not styles are set aside", () => {
  assert.equal(imported.has("Q18"), false);
  assert.equal(imported.has("Q19"), false);
  assert.equal(imported.get("Q20").style, "IPA");
});

test("a style class missing from the mapping stops the conversion", () => {
  assert.throws(() => convert(snapshot, styles.slice(1), seed), /missing from styles\.json: Q1543214/);
});

test("a brewery or beer that collides with an unmapped seeded row stops the conversion", () => {
  const unmappedBrewery = { ...seed, breweries: [{ name: "Fixture Brewery", country: "Netherlands", qid: null }] };
  assert.throws(() => convert(snapshot, styles, { ...unmappedBrewery, beers: [] }), /Fixture Brewery/);
  const unmappedBeer = { ...seed, beers: [{ brewery: "Seed Brouwerij", name: "Seed's other BEER", qid: null }] };
  assert.throws(() => convert(snapshot, styles, unmappedBeer), /Q22/);
});

test("the SQL escapes quotes and carries provenance on every imported row", () => {
  const sql = toSql(converted);
  assert.match(sql, /'Greater Twin''s Other Beer'/);
  assert.match(sql, /\('Fixture Brewery', 'Netherlands', 'Alkmaar', 'WIKIDATA', 'Q100'\)/);
  assert.match(sql, new RegExp(`source = 'WIKIDATA'\\) <> ${converted.breweries.length}\n`));
  assert.match(sql, new RegExp(`source = 'WIKIDATA'\\) <> ${converted.beers.length} THEN`));
});

test("an Untappd ID or review score in the input never reaches the migration", () => {
  assert.doesNotMatch(toSql(converted), /U-4242424|3\.87\/5|untappd/i);
});

test("a value Flyway would read as a placeholder stops the conversion", () => {
  const sneaky = { ...converted, beers: [{ ...converted.beers[0], name: "${user}" }] };
  assert.throws(() => toSql(sneaky), /placeholder/);
});

test("seed-matches.json names every seeded brewery and beer in V004, and nothing else", () => {
  const seeded = parseSeed(readFileSync(SEED_PATH, "utf8"));
  const matches = readJson("wikidata/seed-matches.json");
  assert.equal(seeded.breweries.length, 20);
  assert.equal(seeded.beers.length, 54);
  assert.deepEqual(matches.breweries.map((b) => b.name).sort(), seeded.breweries.map((b) => b.name).sort());
  assert.deepEqual(
    matches.beers.map((b) => `${b.brewery}/${b.name}`).sort(),
    seeded.beers.map((b) => `${b.brewery}/${b.name}`).sort(),
  );
});

test("styles.json maps exactly the style classes the snapshot uses, onto a vocabulary holding the seed's", () => {
  const real = readJson("wikidata/snapshot.json");
  const mapping = readJson("wikidata/styles.json");
  assert.deepEqual(mapping.map((s) => s.qid).sort(), real.styles.map((s) => s.qid).sort());
  const vocabulary = new Set(mapping.map((s) => s.style).filter(Boolean));
  const seeded = parseSeed(readFileSync(SEED_PATH, "utf8"));
  for (const { style } of seeded.beers) {
    const folded = [...vocabulary].filter((v) => v.toLowerCase() === style.toLowerCase() && v !== style);
    assert.deepEqual(folded, [], `"${style}" is spelled differently in styles.json`);
  }
});
