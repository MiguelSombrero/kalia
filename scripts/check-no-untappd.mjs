#!/usr/bin/env node
// Fails when the Wikidata snapshot, the migration generated from it or the
// catalog schema could carry anything from Untappd: its identifiers, links or
// review scores (ADR-0077). Sibling of the other check-*.mjs checkers: plain
// Node, no dependencies, and a fixture self-test in check-no-untappd.test.mjs.
//
// Two kinds of check, because a text search alone cannot see a field that was
// renamed on its way in. Every file is searched for Untappd's name and for the
// Wikidata properties that hold its IDs (P13423 beer, P3002 brewery) and
// review scores (P444). The snapshot's records and the migration's columns
// must also be exactly the facts ADR-0077 lists, so any added field fails.

import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SELF_DIR, "..");
const CATALOG = "backend/src/main/resources/db/migration/catalog";

export const FILES = {
  snapshot: "scripts/wikidata/snapshot.json",
  migration: `${CATALOG}/V008__catalog_wikidata_import.sql`,
  schema: `${CATALOG}/V003__catalog_schema.sql`,
};

const FORBIDDEN = [/untappd/i, /\bP13423\b/, /\bP3002\b/, /\bP444\b/];

const SNAPSHOT_FIELDS = {
  styles: ["label", "qid"],
  breweries: ["cities", "countries", "name", "qid"],
  beers: ["abvs", "manufacturers", "name", "qid", "styles"],
};

const MIGRATION_COLUMNS = new Set([
  "catalog.brewery (name, name_sort_key, country_code, city, source, wikidata_qid)",
  "catalog.beer (brewery_id, name, style, abv, source, wikidata_qid)",
]);

const SCHEMA_COLUMN = /\b\w*(untappd|score|rating|review)\w*\b/i;

/**
 * @param {{snapshot: string, migration: string, schema: string}} contents the three files' text
 * @returns {string[]} one message per failure; empty means OK
 */
export function checkNoUntappd(contents) {
  const failures = [];
  for (const [kind, text] of Object.entries(contents)) {
    for (const pattern of FORBIDDEN) {
      const line = text.split("\n").findIndex((l) => pattern.test(l));
      if (line !== -1) failures.push(`${FILES[kind]}:${line + 1} matches ${pattern}`);
    }
  }

  let snapshot;
  try {
    snapshot = JSON.parse(contents.snapshot);
  } catch (error) {
    failures.push(`${FILES.snapshot} is not JSON: ${error.message}`);
  }
  for (const [section, fields] of Object.entries(SNAPSHOT_FIELDS)) {
    if (!snapshot) break;
    for (const record of snapshot[section] ?? []) {
      const keys = Object.keys(record).sort();
      if (keys.join() !== fields.join()) {
        failures.push(`${FILES.snapshot}: ${section} record ${record.qid} has fields ${keys.join(", ")}; only ${fields.join(", ")} are imported`);
        break;
      }
    }
  }

  for (const [, columns] of contents.migration.matchAll(/INSERT INTO (catalog\.\w+ \([^)]*\))/g)) {
    if (!MIGRATION_COLUMNS.has(columns)) failures.push(`${FILES.migration} inserts ${columns}, which is not a column list the import may write`);
  }

  const column = contents.schema.match(SCHEMA_COLUMN);
  if (column) failures.push(`${FILES.schema} declares ${column[0]}; the catalog stores no review data`);

  return failures;
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const contents = Object.fromEntries(
    Object.entries(FILES).map(([kind, path]) => [kind, readFileSync(resolve(ROOT, path), "utf8")]),
  );
  const failures = checkNoUntappd(contents);
  console.log(`Checking that ${Object.values(FILES).map((p) => relative(ROOT, resolve(ROOT, p))).join(", ")} carry nothing from Untappd\n`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
