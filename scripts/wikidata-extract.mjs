#!/usr/bin/env node
// Pulls the facts the catalog imports from the Wikidata Query Service and reduces
// them to scripts/wikidata/snapshot.json. It runs offline, by hand, once —
// never from CI or the app (ADR-0077). Wikimedia's Terms of Use (§4, §12) ask
// for an identifying User-Agent and no undue load, hence USER_AGENT and the
// pause between queries.
//
//   node scripts/wikidata-extract.mjs [--raw <dir>]
//
// --raw keeps each query's response, for inspecting what the reduction threw
// away; it is never committed. The reduction is a pure function, `reduce`,
// tested over scripts/wikidata/fixture/ in wikidata-extract.test.mjs.
//
// The snapshot holds facts only: a beer's one name, ABVs, style classes and
// manufacturers, and a brewery's name, country and city. `reduce` reads named
// variables and nothing else, so an Untappd ID or review score in a response
// can never reach it.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
export const SNAPSHOT_PATH = resolve(SELF_DIR, "wikidata/snapshot.json");

const ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "KaliaCatalogSeed/1.0 (https://github.com/MiguelSombrero/kalia; one-time catalog import)";
const PAUSE_MS = 5000;

const BEER = "?beer wdt:P31/wdt:P279* wd:Q44 .";
const BREWERY = "?brewery wdt:P31/wdt:P279* wd:Q131734 .";

/** Wikimedia language codes of each country's labels, in preference order, for the third step of the name rule. */
export const COUNTRY_LANGUAGES = {
  Q16: ["en", "fr"], // Canada
  Q17: ["ja"],
  Q20: ["nb", "nn", "no"],
  Q27: ["en", "ga"], // Ireland
  Q28: ["hu"],
  Q29: ["es", "ca", "eu", "gl"],
  Q30: ["en"],
  Q31: ["nl", "fr", "de"], // Belgium
  Q32: ["lb", "fr", "de"],
  Q33: ["fi", "sv"],
  Q34: ["sv"],
  Q35: ["da"],
  Q36: ["pl"],
  Q37: ["lt"],
  Q38: ["it"],
  Q39: ["de", "fr", "it"], // Switzerland
  Q40: ["de"], // Austria
  Q41: ["el"],
  Q43: ["tr"],
  Q45: ["pt"],
  Q55: ["nl"],
  Q142: ["fr"],
  Q145: ["en"],
  Q148: ["zh"],
  Q155: ["pt"],
  Q159: ["ru"],
  Q183: ["de"],
  Q189: ["is"],
  Q191: ["et"],
  Q211: ["lv"],
  Q212: ["uk"],
  Q213: ["cs"],
  Q214: ["sk"],
  Q215: ["sl"],
  Q218: ["ro"],
  Q219: ["bg"],
  Q224: ["hr"],
  Q233: ["mt", "en"],
  Q403: ["sr"],
  Q408: ["en"], // Australia
  Q414: ["es"],
  Q664: ["en"], // New Zealand
  Q884: ["ko"],
  Q96: ["es"], // Mexico
  Q298: ["es"],
  Q739: ["es"],
  Q865: ["zh"],
  Q869: ["th"],
  Q881: ["vi"],
  Q258: ["en", "af"], // South Africa
  Q29999: ["nl"], // Kingdom of the Netherlands
};

/** The last step of the name rule: the first label in this order, then the alphabetically first language. */
export const LANGUAGE_ORDER = [
  "en", "mul", "nl", "de", "fr", "sv", "da", "nb", "fi", "et", "es", "it", "pt", "pl", "cs", "ja",
];

const QUERIES = {
  beerClasses: `SELECT ?beer ?class WHERE { ?beer wdt:P31 ?class . ?class wdt:P279* wd:Q44 . }`,
  beerAbvs: `SELECT ?beer ?amount ?unit WHERE { ${BEER} ?beer p:P2665 ?statement .
    ?statement a wikibase:BestRank ; psv:P2665 [ wikibase:quantityAmount ?amount ; wikibase:quantityUnit ?unit ] . }`,
  beerManufacturers: `SELECT ?beer ?manufacturer WHERE { ${BEER} ?beer wdt:P176 ?manufacturer . }`,
  beerCountries: `SELECT ?beer ?country WHERE { ${BEER} ?beer wdt:P495 ?country . }`,
  beerLabels: `SELECT ?beer ?label WHERE { ${BEER} ?beer rdfs:label ?label . }`,
  breweries: `SELECT ?brewery WHERE { ${BREWERY} }`,
  breweryCountries: `SELECT ?brewery ?country WHERE { ${BREWERY} ?brewery wdt:P17 ?country . }`,
  breweryLocations: `SELECT ?brewery ?location WHERE { ${BREWERY} ?brewery wdt:P131 ?location . }`,
  breweryLabels: `SELECT ?brewery ?label WHERE { ${BREWERY} ?brewery rdfs:label ?label . }`,
  countryLabels: `SELECT DISTINCT ?country ?label WHERE { ${BREWERY} ?brewery wdt:P17 ?country .
    ?country rdfs:label ?label . FILTER(LANG(?label) = "en") }`,
  locationLabels: `SELECT DISTINCT ?location ?label WHERE { ${BREWERY} ?brewery wdt:P131 ?location .
    ?location rdfs:label ?label . FILTER(LANG(?label) IN (${[...new Set([...LANGUAGE_ORDER, ...Object.values(COUNTRY_LANGUAGES).flat()])].map((l) => `"${l}"`).join(", ")})) }`,
  styleClasses: `SELECT ?class ?label WHERE { ?class wdt:P279+ wd:Q44 ; rdfs:label ?label .
    FILTER(LANG(?label) IN (${LANGUAGE_ORDER.map((l) => `"${l}"`).join(", ")})) }`,
};

const qid = (uri) => uri.slice(uri.lastIndexOf("/") + 1);
const rows = (response) => response.results.bindings;

const groupBy = (response, key, value) => {
  const map = new Map();
  for (const row of rows(response)) {
    if (!row[key] || !row[value]) continue;
    const k = qid(row[key].value);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row[value]);
  }
  return map;
};

const uniqueSorted = (values) => [...new Set(values)].sort();
const byQid = (a, b) => Number(a.qid.slice(1)) - Number(b.qid.slice(1));

/**
 * The name rule decided at refinement: English, then multilingual, then the
 * language of the item's country, then LANGUAGE_ORDER, then the
 * alphabetically first language.
 * @param {{lang: string, text: string}[]} labels
 * @param {string[]} countryLanguages
 */
export function chooseLabel(labels, countryLanguages = []) {
  const byLang = new Map();
  for (const { lang, text } of labels) if (!byLang.has(lang)) byLang.set(lang, text.trim());
  for (const lang of ["en", "mul", ...countryLanguages, ...LANGUAGE_ORDER]) {
    if (byLang.get(lang)) return byLang.get(lang);
  }
  const [first] = [...byLang.keys()].filter((lang) => byLang.get(lang)).sort();
  return first === undefined ? null : byLang.get(first);
}

const labelsOf = (response, key) => {
  const map = new Map();
  for (const row of rows(response)) {
    if (!row[key] || !row.label) continue;
    const k = qid(row[key].value);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push({ lang: row.label["xml:lang"], text: row.label.value });
  }
  return map;
};

const PERCENT_UNITS = new Set(["Q11229", "Q2080811"]);

/**
 * Reduces the raw query responses to the snapshot. Only the variables named
 * in QUERIES are read.
 * @param {Record<keyof typeof QUERIES, {results: {bindings: object[]}}>} raw
 */
export function reduce(raw) {
  const countryNames = new Map(
    [...labelsOf(raw.countryLabels, "country")].map(([k, labels]) => [k, chooseLabel(labels)]),
  );
  const languagesOf = (countryQids) => countryQids.flatMap((c) => COUNTRY_LANGUAGES[c] ?? []);

  const breweryCountries = groupBy(raw.breweryCountries, "brewery", "country");
  const breweryLocations = groupBy(raw.breweryLocations, "brewery", "location");
  const breweryLabels = labelsOf(raw.breweryLabels, "brewery");
  const locationLabels = labelsOf(raw.locationLabels, "location");

  const breweries = uniqueSorted(rows(raw.breweries).map((row) => qid(row.brewery.value)))
    .map((k) => {
      const countries = uniqueSorted((breweryCountries.get(k) ?? []).map((v) => qid(v.value)));
      const languages = languagesOf(countries);
      const cities = uniqueSorted(
        (breweryLocations.get(k) ?? [])
          .map((v) => chooseLabel(locationLabels.get(qid(v.value)) ?? [], languages))
          .filter(Boolean),
      );
      return {
        qid: k,
        name: chooseLabel(breweryLabels.get(k) ?? [], languages),
        countries: countries.map((c) => countryNames.get(c)).filter(Boolean),
        cities,
      };
    })
    .filter((brewery) => brewery.name)
    .sort(byQid);

  const classes = groupBy(raw.beerClasses, "beer", "class");
  const abvs = groupBy(raw.beerAbvs, "beer", "amount");
  const units = groupBy(raw.beerAbvs, "beer", "unit");
  const manufacturers = groupBy(raw.beerManufacturers, "beer", "manufacturer");
  const beerCountries = groupBy(raw.beerCountries, "beer", "country");
  const beerLabels = labelsOf(raw.beerLabels, "beer");

  const beers = [...classes.keys()]
    .filter((k) => abvs.has(k) && manufacturers.has(k))
    .map((k) => {
      const percentAbvs = abvs
        .get(k)
        .filter((_, i) => PERCENT_UNITS.has(qid(units.get(k)[i].value)))
        .map((v) => Number(v.value));
      const countries = uniqueSorted((beerCountries.get(k) ?? []).map((v) => qid(v.value)));
      return {
        qid: k,
        name: chooseLabel(beerLabels.get(k) ?? [], languagesOf(countries)),
        abvs: uniqueSorted(percentAbvs).sort((a, b) => a - b),
        styles: uniqueSorted(classes.get(k).map((v) => qid(v.value))),
        manufacturers: uniqueSorted(manufacturers.get(k).map((v) => qid(v.value))),
      };
    })
    .filter((beer) => beer.name && beer.abvs.length > 0)
    .sort(byQid);

  const usedStyles = new Set(beers.flatMap((beer) => beer.styles));
  const styles = [...labelsOf(raw.styleClasses, "class")]
    .filter(([k]) => usedStyles.has(k))
    .map(([k, labels]) => ({ qid: k, label: chooseLabel(labels) }))
    .sort(byQid);

  return { breweries, beers, styles };
}

/** One record per line, so a re-import's diff reads row by row. */
export function formatSnapshot(snapshot) {
  const section = (name, items) =>
    `  "${name}": [\n${items.map((item) => `    ${JSON.stringify(item)}`).join(",\n")}\n  ]`;
  return `{\n${["styles", "breweries", "beers"].map((name) => section(name, snapshot[name])).join(",\n")}\n}\n`;
}

async function query(sparql) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ query: sparql }),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response.json();
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const rawFlag = process.argv.indexOf("--raw");
  const rawDir = rawFlag === -1 ? null : resolve(process.argv[rawFlag + 1]);
  if (rawDir) mkdirSync(rawDir, { recursive: true });

  const raw = {};
  for (const [name, sparql] of Object.entries(QUERIES)) {
    const cached = rawDir && (() => { try { return JSON.parse(readFileSync(resolve(rawDir, `${name}.json`), "utf8")); } catch { return null; } })();
    if (cached) {
      raw[name] = cached;
      console.log(`${name}: ${rows(cached).length} rows (cached)`);
      continue;
    }
    raw[name] = await query(sparql);
    console.log(`${name}: ${rows(raw[name]).length} rows`);
    if (rawDir) writeFileSync(resolve(rawDir, `${name}.json`), JSON.stringify(raw[name]));
    await new Promise((done) => setTimeout(done, PAUSE_MS));
  }

  const snapshot = reduce(raw);
  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, formatSnapshot(snapshot));
  console.log(
    `\nWrote ${SNAPSHOT_PATH}: ${snapshot.breweries.length} breweries, ${snapshot.beers.length} beers, ${snapshot.styles.length} style classes`,
  );
}
