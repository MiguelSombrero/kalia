#!/usr/bin/env node
// Fixture self-test for check-no-untappd.mjs. The real files hold nothing from
// Untappd, so the check never fires on them and would stay green even if it
// stopped looking.

import test from "node:test";
import assert from "node:assert/strict";

import { checkNoUntappd } from "./check-no-untappd.mjs";

const snapshot = (beer = {}) =>
  JSON.stringify({
    styles: [{ qid: "Q1543214", label: "India Pale Ale" }],
    breweries: [{ qid: "Q100", name: "Fixture Brewery", countries: ["Netherlands"], cities: [] }],
    beers: [{ qid: "Q1", name: "Fixture IPA", abvs: [5.5], styles: ["Q1543214"], manufacturers: ["Q100"], ...beer }],
  });

const migration = `INSERT INTO catalog.brewery (name, country_code, city, source, wikidata_qid) VALUES
    ('Fixture Brewery', 'NL', NULL, 'WIKIDATA', 'Q100');
INSERT INTO catalog.beer (brewery_id, name, style, abv, source, wikidata_qid)
SELECT b.id, v.name, v.style, v.abv, 'WIKIDATA', v.qid FROM (VALUES ('Q100', 'Fixture IPA', 'IPA', 5.5, 'Q1')) AS v;`;

const schema = "CREATE TABLE catalog.beer (id uuid, name text, style text, abv numeric(4, 1), source text);";

const clean = { snapshot: snapshot(), migration, schema };

test("passes files holding only the imported facts", () => {
  assert.deepEqual(checkNoUntappd(clean), []);
});

test("fails an Untappd link anywhere, naming the file and line", () => {
  const failures = checkNoUntappd({ ...clean, migration: `${migration}\n-- https://untappd.com/b/x/1` });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /V008__catalog_wikidata_import\.sql:5/);
});

test("fails the Wikidata properties holding Untappd IDs and review scores", () => {
  for (const property of ["P13423", "P3002", "P444"]) {
    assert.ok(checkNoUntappd({ ...clean, snapshot: snapshot({ name: `Beer ${property}` }) }).length > 0, property);
  }
});

test("fails a snapshot record carrying a field beyond the imported facts, whatever it is called", () => {
  const failures = checkNoUntappd({ ...clean, snapshot: snapshot({ externalId: "4242424" }) });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /externalId/);
});

test("fails a migration writing a column the import may not write", () => {
  const failures = checkNoUntappd({
    ...clean,
    migration: migration.replace("(brewery_id, name, style, abv,", "(brewery_id, name, style, abv, rating,"),
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /rating/);
});

test("fails a schema declaring a review column", () => {
  assert.equal(checkNoUntappd({ ...clean, schema: schema.replace("source text", "review_score numeric") }).length, 1);
});
