#!/usr/bin/env node
// Fixture-driven tests for wikidata-extract.mjs's reduction. The extraction
// itself queries Wikidata and never runs in CI; scripts/wikidata/fixture/raw.json
// stands in for its responses, Untappd bindings included.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chooseLabel, formatSnapshot, reduce } from "./wikidata-extract.mjs";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(resolve(SELF_DIR, "wikidata/fixture/raw.json"), "utf8"));
const snapshot = reduce(raw);
const beer = (qid) => snapshot.beers.find((b) => b.qid === qid);

test("the name is the English label when there is one", () => {
  assert.equal(beer("Q1").name, "English Name");
});

test("without English the name falls back to the multilingual label", () => {
  assert.equal(beer("Q2").name, "Multilingual Name");
});

test("then to the language of the beer's country of origin, ahead of the fixed order", () => {
  assert.equal(beer("Q3").name, "Suomenkielinen Nimi");
});

test("then to the first label in the fixed language order", () => {
  assert.equal(beer("Q4").name, "日本語の名前");
});

test("and last to the alphabetically first language", () => {
  assert.equal(beer("Q5").name, "Abkhaz Name");
  assert.equal(chooseLabel([]), null);
});

test("every ABV is kept as found, conflicts and bad values included, for the migration to judge", () => {
  assert.deepEqual(beer("Q6").abvs, [-1]);
  assert.deepEqual(beer("Q7").abvs, [150]);
  assert.deepEqual(beer("Q8").abvs, [5, 6]);
  assert.deepEqual(beer("Q2").abvs, [0]);
});

test("an ABV in a unit other than percent is not an ABV", () => {
  assert.equal(beer("Q17"), undefined);
});

test("a brewery keeps every country and city it has, for the migration to judge", () => {
  const twin = snapshot.breweries.find((b) => b.qid === "Q103");
  assert.deepEqual(twin.countries, ["Netherlands"]);
  assert.deepEqual(twin.cities, ["Alkmaar", "Heiloo"]);
  assert.deepEqual(snapshot.breweries.find((b) => b.qid === "Q105").countries, []);
});

test("only the style classes the snapshot's beers use are kept", () => {
  assert.deepEqual(snapshot.styles.map((s) => s.qid).sort(), ["Q1543214", "Q2493192", "Q85745517"]);
});

test("an Untappd ID or review score in a response never reaches the snapshot", () => {
  assert.ok(JSON.stringify(raw).includes("U-4242424"), "the fixture must carry the Untappd binding");
  const written = formatSnapshot(snapshot);
  assert.doesNotMatch(written, /U-4242424|3\.87\/5|untappd|reviewScore/i);
  assert.deepEqual(Object.keys(beer("Q1")).sort(), ["abvs", "manufacturers", "name", "qid", "styles"]);
});

test("the written snapshot is one record per line and parses back to what was reduced", () => {
  const written = formatSnapshot(snapshot);
  assert.deepEqual(JSON.parse(written), {
    styles: snapshot.styles,
    breweries: snapshot.breweries,
    beers: snapshot.beers,
  });
  assert.ok(written.split("\n").some((line) => line.trim().startsWith('{"qid":"Q1",')));
});
