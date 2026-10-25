#!/usr/bin/env node
// Generates the catalog's Wikidata import migration from the committed
// snapshot, so the import is reproducible offline (ADR-0077).
//
//   node scripts/wikidata-migration.mjs          write the migration
//   node scripts/wikidata-migration.mjs --check  fail if it differs from what is committed
//
// Every import rule (docs/tasks/iteration-8/17-seed-the-catalog-from-wikidata.md,
// ADR-0077's amendment) is applied here rather than at extraction, so a
// changed rule needs no network: strict rows, the style mapping in
// wikidata/styles.json, the hand-reviewed seed matches in
// wikidata/seed-matches.json, dropping what conflicts rather than guessing
// unless wikidata/brewery-countries.json settles it by hand, and reducing what
// the unique indexes would refuse to one row. A brewery's country is stored as
// its ISO code (ADR-0079): wikidata/country-codes.json codes each Wikidata
// country label, and wikidata/present-day-countries.json codes, brewery by
// brewery, those whose label names a state with no code.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SELF_DIR, "..");
const MIGRATIONS = resolve(ROOT, "backend/src/main/resources/db/migration/catalog");
export const MIGRATION_PATH = resolve(MIGRATIONS, "V008__catalog_wikidata_import.sql");
export const SEED_PATH = resolve(MIGRATIONS, "V004__catalog_seed_data.sql");
const DATA = resolve(SELF_DIR, "wikidata");

const MAX_ABV = 100;
const ROWS_PER_INSERT = 1000;

/**
 * Two names are the same once case, whitespace and punctuation are folded.
 * Do not make this fold less than V003's catalog.fold_name(): the import
 * relies on it folding at least as much, so the unique index never trips.
 */
export const foldName = (name) => name.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");

/**
 * The key catalog.brewery.name_sort_key stores, so that ordering by it under
 * COLLATE "C" gives java.lang.String.CASE_INSENSITIVE_ORDER's order (ADR-0087).
 * That comparator folds one UTF-16 code unit at a time with Character's
 * one-to-one case mappings, so this folds code units too, and keeps a unit
 * whose JavaScript mapping is not one unit: "ß" and "ŉ" have no one-to-one
 * mapping in Java either. Keep it equal to BrewerySortKey.of in the backend;
 * BreweryReadIT checks every stored key against it.
 */
export const sortKey = (name) => {
  let key = "";
  for (let i = 0; i < name.length; i++) {
    const unit = name[i];
    const upper = unit.toUpperCase();
    const folded = upper.length === 1 ? upper : unit;
    const lower = folded.toLowerCase();
    key += folded === "\u0130" ? "i" : lower.length === 1 ? lower : folded;
  }
  return key;
};

const breweryKey = (name, countryCode) => `${foldName(name)}\u0000${countryCode}`;

/** The value catalog.beer's numeric(4, 1) stores: one decimal, half away from zero, done on the digits to avoid binary rounding. */
export function storedAbv(abv) {
  const [whole, fraction = ""] = String(Math.abs(abv)).split(".");
  const tenths = Number(whole) * 10 + Number(fraction[0] ?? 0) + (Number(fraction[1] ?? 0) >= 5 ? 1 : 0);
  return (Math.sign(abv) * tenths) / 10;
}
const qidNumber = (qid) => Number(qid.slice(1));
const byQid = (a, b) => qidNumber(a.qid) - qidNumber(b.qid);

/**
 * Reads the seeded breweries and beers out of V004, which ADR-0077 keeps unchanged.
 * @param {string} sql
 */
export function parseSeed(sql) {
  const literal = "'((?:[^']|'')*)'";
  const unquote = (s) => s.replaceAll("''", "'");
  const breweries = [];
  const breweryBlock = sql.slice(sql.indexOf("INSERT INTO catalog.brewery"), sql.indexOf("INSERT INTO catalog.beer"));
  for (const m of breweryBlock.matchAll(new RegExp(`\\(${literal}, ${literal}, ${literal}\\)`, "g"))) {
    breweries.push({ name: unquote(m[1]), country: unquote(m[2]), city: unquote(m[3]) });
  }
  const beers = [];
  for (const block of sql.split("INSERT INTO catalog.beer").slice(1)) {
    const brewery = unquote(block.match(new RegExp(`b\\.name = ${literal}`))[1]);
    for (const m of block.matchAll(new RegExp(`^\\s+\\(${literal}, ${literal}, [\\d.]+, `, "gm"))) {
      beers.push({ brewery, name: unquote(m[1]), style: unquote(m[2]) });
    }
  }
  return { breweries, beers };
}

/**
 * Applies the import rules to the snapshot.
 * @param {{breweries: object[], beers: object[], styles: object[]}} snapshot
 * @param {{qid: string, style: string|null}[]} styleMap
 * @param {{breweries: {name: string, country: string, qid: string|null}[], beers: {brewery: string, name: string, qid: string|null}[]}} seed
 * @param {{codes: Record<string, string>, overrides?: {qid: string, country: string}[], presentDay?: {qid: string, country: string, countryCode: string}[]}} countries
 * @returns {{breweries: object[], beers: object[], seedCountries: {country: string, countryCode: string}[], dropped: Record<string, number>}}
 */
export function convert(snapshot, styleMap, seed, { codes, overrides: countryOverrides = [], presentDay = [] }) {
  const styleOf = new Map(styleMap.map((entry) => [entry.qid, entry.style]));
  const unmapped = snapshot.styles.filter((s) => !styleOf.has(s.qid)).map((s) => `${s.qid} ${s.label}`);
  if (unmapped.length > 0) throw new Error(`Style classes missing from styles.json: ${unmapped.join(", ")}`);

  const dropped = {};
  const drop = (reason) => (dropped[reason] = (dropped[reason] ?? 0) + 1);

  const snapshotBreweries = new Map(snapshot.breweries.map((b) => [b.qid, b]));
  for (const { qid, country } of countryOverrides) {
    const brewery = snapshotBreweries.get(qid);
    if (!brewery?.countries.includes(country) || brewery.countries.length < 2) {
      throw new Error(`brewery-countries.json: ${qid} is not a brewery whose countries include ${country} among others`);
    }
    snapshotBreweries.set(qid, { ...brewery, countries: [country] });
  }
  const codeOf = new Map(Object.entries(codes));
  const presentDayOf = new Map();
  for (const { qid, country, countryCode } of presentDay) {
    const brewery = snapshotBreweries.get(qid);
    if (brewery?.countries.length !== 1 || brewery.countries[0] !== country || codeOf.has(country)) {
      throw new Error(`present-day-countries.json: ${qid} is not a brewery whose one country is ${country}, a country with no code`);
    }
    presentDayOf.set(qid, countryCode);
  }
  const countryCodeOf = (brewery) => {
    const code = codeOf.get(brewery.countries[0]) ?? presentDayOf.get(brewery.qid);
    if (!code) {
      throw new Error(
        `${brewery.qid} "${brewery.name}" is in ${brewery.countries[0]}, which has no code in country-codes.json or present-day-countries.json`,
      );
    }
    return code;
  };
  const seedCountries = [...new Set(seed.breweries.map((b) => b.country))].sort().map((country) => {
    if (!codeOf.has(country)) throw new Error(`Seeded country ${country} has no code in country-codes.json`);
    return { country, countryCode: codeOf.get(country) };
  });
  const seedCodeOf = new Map(seedCountries.map((c) => [c.country, c.countryCode]));
  const seedKey = (b) => breweryKey(b.name, seedCodeOf.get(b.country));
  const seedByName = new Map(seed.breweries.map((b) => [b.name, b]));
  const seedByKey = new Map(seed.breweries.map((b) => [seedKey(b), b]));
  const seedByQid = new Map(seed.breweries.filter((b) => b.qid).map((b) => [b.qid, b]));

  const groupOf = new Map();
  for (const brewery of snapshotBreweries.values()) {
    if (brewery.countries.length !== 1) {
      drop(brewery.countries.length === 0 ? "brewery without a country" : "brewery with conflicting countries");
      continue;
    }
    groupOf.set(brewery.qid, breweryKey(brewery.name, countryCodeOf(brewery)));
  }
  const seedOfGroup = new Map();
  for (const [qid, seeded] of seedByQid) {
    if (!groupOf.has(qid)) {
      throw new Error(`seed-matches.json maps "${seeded.name}" to ${qid}, which is not a brewery with one country in the snapshot`);
    }
    seedOfGroup.set(groupOf.get(qid), seeded);
  }
  for (const [qid, key] of groupOf) {
    const seeded = seedByKey.get(key);
    if (seeded && seedOfGroup.get(key) !== seeded) {
      throw new Error(`${qid} has the same name and country as seeded brewery "${seeded.name}" but seed-matches.json does not map them`);
    }
  }

  const seededBeerQids = new Set(seed.beers.filter((b) => b.qid).map((b) => b.qid));
  const snapshotBeerQids = new Set(snapshot.beers.map((b) => b.qid));
  for (const qid of seededBeerQids) {
    if (!snapshotBeerQids.has(qid)) throw new Error(`seed-matches.json maps a seeded beer to ${qid}, which is not in the snapshot`);
  }
  const candidates = [];
  for (const beer of snapshot.beers) {
    if (seededBeerQids.has(beer.qid)) {
      drop("beer matching a seeded beer");
      continue;
    }
    const styles = new Set(beer.styles.filter((c) => styleOf.get(c)).map((c) => styleOf.get(c)));
    if (styles.size !== 1) {
      drop(styles.size === 0 ? "beer without a specific style" : "beer with conflicting styles");
      continue;
    }
    const abvs = new Set(beer.abvs.map(storedAbv));
    if (abvs.size !== 1) {
      drop("beer with conflicting ABVs");
      continue;
    }
    const [abv] = abvs;
    if (abv < 0 || abv > MAX_ABV) {
      drop("beer with an ABV out of range");
      continue;
    }
    const makers = beer.manufacturers.filter((m) => snapshotBreweries.has(m));
    if (makers.length === 0) {
      drop("beer whose manufacturer is not a brewery");
      continue;
    }
    const groups = new Set(makers.map((m) => groupOf.get(m) ?? `dropped:${m}`));
    if (groups.size > 1) {
      drop("beer made by several breweries");
      continue;
    }
    const [group] = groups;
    if (!groupOf.has(makers[0])) {
      drop("beer whose brewery was dropped");
      continue;
    }
    candidates.push({ ...beer, abv, style: [...styles][0], group, maker: makers[0] });
  }

  const beersPerMaker = new Map();
  for (const beer of candidates) beersPerMaker.set(beer.maker, (beersPerMaker.get(beer.maker) ?? 0) + 1);
  const survivorOf = new Map();
  for (const [qid, key] of groupOf) {
    if (seedOfGroup.has(key)) continue;
    const current = survivorOf.get(key);
    const better =
      !current ||
      (beersPerMaker.get(qid) ?? 0) > (beersPerMaker.get(current) ?? 0) ||
      ((beersPerMaker.get(qid) ?? 0) === (beersPerMaker.get(current) ?? 0) && qidNumber(qid) < qidNumber(current));
    if (better) survivorOf.set(key, qid);
  }
  for (const [qid, key] of groupOf) if (survivorOf.has(key) && survivorOf.get(key) !== qid) drop("brewery merged into a same-named one");

  const taken = new Map();
  for (const seeded of seed.beers) {
    const brewery = seedByName.get(seeded.brewery);
    taken.set(`${seedKey(brewery)}\u0000${foldName(seeded.name)}`, `seeded "${seeded.name}"`);
  }
  const beers = [];
  for (const beer of candidates.sort(byQid)) {
    const seeded = seedOfGroup.get(beer.group);
    const key = `${seeded ? seedKey(seeded) : beer.group}\u0000${foldName(beer.name)}`;
    const holder = taken.get(key);
    if (holder?.startsWith("seeded")) {
      throw new Error(`${beer.qid} "${beer.name}" has the same name as ${holder} but seed-matches.json does not map them`);
    }
    if (holder) {
      drop("beer duplicating another of its brewery");
      continue;
    }
    taken.set(key, beer.qid);
    beers.push({
      qid: beer.qid,
      name: beer.name,
      style: beer.style,
      abv: beer.abv,
      brewery: seeded ? { seed: seeded.name } : { qid: survivorOf.get(beer.group) },
    });
  }

  const breweries = [...survivorOf.values()]
    .map((qid) => snapshotBreweries.get(qid))
    .map((b) => ({ qid: b.qid, name: b.name, countryCode: countryCodeOf(b), city: b.cities.length === 1 ? b.cities[0] : null }))
    .sort(byQid);

  return { breweries, beers, seedCountries, seedBreweries: seed.breweries.map((b) => b.name).sort(), dropped };
}

const sqlString = (value) => {
  if (value === null) return "NULL";
  if (value.includes("${")) throw new Error(`Flyway would read ${JSON.stringify(value)} as a placeholder`);
  return `'${value.replaceAll("'", "''")}'`;
};

const chunks = (items) => {
  const out = [];
  for (let i = 0; i < items.length; i += ROWS_PER_INSERT) out.push(items.slice(i, i + ROWS_PER_INSERT));
  return out;
};

/** @param {ReturnType<typeof convert>} converted */
export function toSql({ breweries, beers, seedCountries, seedBreweries }) {
  const lines = [
    "-- Generated by scripts/wikidata-migration.mjs from scripts/wikidata/snapshot.json.",
    "-- Do not edit: regenerate it as backend/README.md describes.",
    "",
    "-- V003 defaults source to SEED so that V004's rows carry it. From here on the",
    "-- only rows inserted without a source are the ones the app writes: a user's.",
    "ALTER TABLE catalog.brewery ALTER COLUMN source SET DEFAULT 'USER';",
    "ALTER TABLE catalog.beer ALTER COLUMN source SET DEFAULT 'USER';",
    "",
    "-- V004's rows name their country in English, in the column V003 keeps for them",
    "-- alone. They get its code here, and the column goes (ADR-0079).",
    "UPDATE catalog.brewery b SET country_code = v.country_code",
    "FROM (VALUES",
    seedCountries.map((c) => `    (${sqlString(c.country)}, ${sqlString(c.countryCode)})`).join(",\n"),
    ") AS v(country, country_code)",
    "WHERE b.source = 'SEED' AND b.country = v.country;",
    "ALTER TABLE catalog.brewery ALTER COLUMN country_code SET NOT NULL, DROP COLUMN country;",
    "",
    "-- V004's rows predate name_sort_key too; every row from here on carries its own",
    "-- (ADR-0087), so the column is NOT NULL once these have theirs.",
    "UPDATE catalog.brewery b SET name_sort_key = v.name_sort_key",
    "FROM (VALUES",
    seedBreweries.map((name) => `    (${sqlString(name)}, ${sqlString(sortKey(name))})`).join(",\n"),
    ") AS v(name, name_sort_key)",
    "WHERE b.source = 'SEED' AND b.name = v.name;",
    "ALTER TABLE catalog.brewery ALTER COLUMN name_sort_key SET NOT NULL;",
  ];

  for (const chunk of chunks(breweries)) {
    lines.push("", "INSERT INTO catalog.brewery (name, name_sort_key, country_code, city, source, wikidata_qid) VALUES");
    lines.push(
      chunk
        .map((b) => `    (${sqlString(b.name)}, ${sqlString(sortKey(b.name))}, ${sqlString(b.countryCode)}, ${sqlString(b.city)}, 'WIKIDATA', ${sqlString(b.qid)})`)
        .join(",\n") + ";",
    );
  }

  const insertBeers = (rows, keyColumn, join) => {
    for (const chunk of chunks(rows)) {
      lines.push(
        "",
        "INSERT INTO catalog.beer (brewery_id, name, style, abv, source, wikidata_qid)",
        "SELECT b.id, v.name, v.style, v.abv, 'WIKIDATA', v.qid",
        "FROM (VALUES",
        chunk
          .map((beer) => `    (${sqlString(keyColumn(beer))}, ${sqlString(beer.name)}, ${sqlString(beer.style)}, ${beer.abv}, ${sqlString(beer.qid)})`)
          .join(",\n"),
        `) AS v(brewery, name, style, abv, qid)`,
        `JOIN catalog.brewery b ON ${join};`,
      );
    }
  };
  insertBeers(beers.filter((b) => b.brewery.qid), (b) => b.brewery.qid, "b.wikidata_qid = v.brewery");
  insertBeers(beers.filter((b) => b.brewery.seed), (b) => b.brewery.seed, "b.source = 'SEED' AND b.name = v.brewery");

  lines.push(
    "",
    "-- A join that missed a brewery would drop its beers silently.",
    "DO $$",
    "BEGIN",
    `    IF (SELECT count(*) FROM catalog.brewery WHERE source = 'WIKIDATA') <> ${breweries.length}`,
    `        OR (SELECT count(*) FROM catalog.beer WHERE source = 'WIKIDATA') <> ${beers.length} THEN`,
    "        RAISE EXCEPTION 'Wikidata import row counts differ from the generated migration';",
    "    END IF;",
    "END",
    "$$;",
    "",
  );
  return lines.join("\n");
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/** Reads the committed inputs and returns the migration text with the conversion's tallies. */
export function generate() {
  const seedRows = parseSeed(readFileSync(SEED_PATH, "utf8"));
  const matches = readJson(resolve(DATA, "seed-matches.json"));
  const countryOf = new Map(seedRows.breweries.map((b) => [b.name, b.country]));
  const seed = {
    breweries: matches.breweries.map((b) => ({ ...b, country: countryOf.get(b.name) })),
    beers: matches.beers,
  };
  const converted = convert(readJson(resolve(DATA, "snapshot.json")), readJson(resolve(DATA, "styles.json")), seed, {
    codes: readJson(resolve(DATA, "country-codes.json")),
    overrides: readJson(resolve(DATA, "brewery-countries.json")),
    presentDay: readJson(resolve(DATA, "present-day-countries.json")),
  });
  return { sql: toSql(converted), converted, seedRows, matches };
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const { sql, converted } = generate();
  if (process.argv.includes("--check")) {
    console.log("Checking that the Wikidata import migration matches the committed snapshot\n");
    let committed = "";
    try {
      committed = readFileSync(MIGRATION_PATH, "utf8");
    } catch {
      // A missing file is reported as a mismatch below.
    }
    if (committed !== sql) {
      console.log(`  FAIL  ${MIGRATION_PATH} differs from what scripts/wikidata/ generates; run node scripts/wikidata-migration.mjs\n`);
      process.exit(1);
    }
    console.log("OK\n");
  } else {
    writeFileSync(MIGRATION_PATH, sql);
    console.log(`Wrote ${MIGRATION_PATH}: ${converted.breweries.length} breweries, ${converted.beers.length} beers`);
    for (const [reason, count] of Object.entries(converted.dropped).sort()) console.log(`  dropped ${count}: ${reason}`);
  }
}
