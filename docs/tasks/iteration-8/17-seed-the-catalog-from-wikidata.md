# Task 17: Seed the catalog from Wikidata

- **Status:** done
- **Iteration:** [8](../iteration-8.md)

## Why

[Task 01](01-catalog-data-source.md) decided that Kalia's catalog is seeded
once from Wikidata and owned by Kalia from then on. Until that import exists,
the catalog is still the 54 beers of iteration 1. A user searching for almost
any beer finds nothing, and [task 02](02-add-beer-api.md) would be catching
duplicates against a catalog that is about to grow from 54 beers to roughly 15,000.

## Scope

Kalia's catalog holds the beers and breweries task 01's decision imports from
a pinned Wikidata snapshot. Every row records where it came from. The import
can be reproduced from what is committed without network access. Wikidata is
credited where its data is shown. Every test the larger catalog breaks is
updated.

## Non-goals

- Keeping in step with Wikidata. There is no scheduled or runtime sync. A later
  re-import is a new task, and it only ever adds rows.
- Breweries from Open Brewery DB, or any second source. Task 01 rejected them
  for now.
- Barcodes — [iteration 14](../iteration-14.md).
- Editing imported beers — the [backlog](../backlog.md).
- Caching the larger catalog — tasks [04](04-catalog-caching-decision.md) and
  [05](05-cache-catalog-reads.md).

## Constraints

- **Task 01's decision and its ADR bind this task.** These fail silently if
  got wrong:
  - The import takes **facts only**: a beer's name, ABV and style, and its
    brewery's name, country and city.
  - It never takes an Untappd identifier, link or review score, or any other
    external identifier, description or image.
  - Every row records its source and its Wikidata QID.
  - The existing seed (`V004__catalog_seed_data.sql`) is unchanged, and a
    seeded row is never duplicated or replaced.
- **The extraction runs offline, once, paced, with an identifying User-Agent**
  ([Wikimedia Terms of Use](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use)
  §4, §12). Neither CI nor the app queries Wikidata. What CI and the app see is
  the committed snapshot.
- Flyway owns the schema and the data. One schema per module, and catalog
  migrations stay under the catalog's migration directory
  ([architecture.md §3](../../architecture.md#persistence),
  [backend/README.md](../../../backend/README.md)).
- The catalog's search and detail endpoints keep their contract.
- Any new tool or library is a version question for the product owner
  ([CLAUDE.md](../../../CLAUDE.md)).

**Decided at refinement, 2026-10-15** (product owner):

- **Strict rows.** Only beers with an ABV, a specific style and a
  manufacturer that is a brewery are imported, about 14.7k. `abv` and
  `style` stay `NOT NULL` and the API contract is unchanged. Making them
  nullable to admit about 4k more was rejected.
  [Task 02](02-add-beer-api.md) holds a user-added beer to the same bar.
- **Styles map onto Kalia's own list, and Wikidata extends it.** A committed
  mapping takes each of Wikidata's style classes to a Kalia style name. The
  seed's names are the base, and labels are folded into them only where they
  are the same style under another spelling or casing. A well-known style
  Kalia does not have yet, such as NEIPA, is added to the list rather than
  forced onto a broader one. The seed's list must not limit what styles
  exist. **Where it is unclear whether two styles should merge, ask the
  product owner during implementation; do not decide alone.** The styles in
  the catalog after the import are the vocabulary a user picks from
  ([task 02](02-add-beer-api.md)). Keeping Wikidata's labels as they are, and
  free-text styles, were rejected.
- **One name per beer, no aliases.** The name is the English label if there
  is one. Otherwise it is the multilingual (`mul`) label, then the label in
  the language of the beer's country of origin, then the first label in a
  fixed language order. Other labels are not kept. Aliases are a
  [backlog](../backlog.md) item.
- **Every Wikidata brewery that has a country is imported** (about 5.07k),
  not only those that make an imported beer, so that
  [task 02](02-add-beer-api.md)'s brewery picker knows breweries whose beers
  Wikidata lacks.
- **A brewery is unique by its normalised name and country**, replacing
  today's worldwide-unique `name`. The same rule decides when a brewery a
  user creates is a duplicate ([task 02](02-add-beer-api.md)).
- **Seeded rows are matched by a hand-reviewed list.** A committed list maps
  each of the 20 seeded breweries and 54 seeded beers to its QID, or records
  that it has none. A matched beer is skipped. A matched brewery keeps its
  seeded row, and the imported beers of that brewery (BrewDog's, for example)
  attach to it. Matching on a normalised-name rule, alone or with reviewed
  exceptions, was rejected.
- **Bad ABVs.** A negative ABV, or one above the API's own bound of 100,
  drops the beer. 0% (alcohol-free) and values above 20% are kept, because
  both are real. The 19 beers with conflicting ABVs are dropped rather than
  guessed.
- **Beers that [task 02](02-add-beer-api.md)'s sameness rule treats as one**
  (same brewery, same normalised name) are reduced to one at import. Without
  that, task 02's unique index cannot be created over the imported catalog.
- **Tooling: a dependency-free Node script producing a generated SQL
  migration.** The extractor and the converter live beside the existing
  checkers in `scripts/`, with their own `.test.mjs`. The snapshot is
  committed as JSON and holds only the fields the import takes, so no
  Untappd field is ever in it. The output is a generated SQL migration in
  the catalog's migration directory. A Java tool, and a Java migration
  loading a CSV, were rejected: the data load would become code.
- **Schema changes go into `V003__catalog_schema.sql`**, the provenance
  columns and the brewery uniqueness among them. That is
  [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md) as amended
  on 2026-08-29. `V004__catalog_seed_data.sql` stays unchanged, as task 01
  decided, so any value a seeded row needs in a new column has to come from
  somewhere other than an edit to V004.
- **Tests assert properties, not counts.** A catalog test that counted
  migration data now asserts that every result satisfies its filter, that
  the order holds, and that totals equal a direct SQL count. Seeded
  identities, such as Westvleteren by id, stay exact. Tests run against the
  real migrated catalog, imported rows included. Moving them to test-only
  fixture data was rejected. The import may add **at most about 15 s** to
  `mvn verify`.
- **The Wikidata credit** is a line in the site footer on every page, and a
  "Credits" section at the end of the repository's `README.md`. The footer
  line links to wikidata.org and never to an item page, because an item page
  shows the beer's Untappd ID and link. Wording, adjustable in review: en
  "Beer data includes facts from Wikidata (CC0).", fi "Oluttiedoissa on
  Wikidatan tietoja (CC0)."

## Open questions

**None.**

## Acceptance criteria

- [x] The conversion is unit-tested over a small committed fixture. The fixture
      covers label fallback, rejected and conflicting ABVs, a manufacturer that
      is not a brewery, a beer matching a seeded row, and an Untappd ID in the
      input that never reaches the output.
- [x] A check run in CI fails if the snapshot, the generated migration or the
      schema contains an Untappd identifier, URL or review score
- [x] Regenerating the migration from the committed snapshot reproduces the
      committed file exactly — a check run in CI
- [x] After migration, an imported beer is found by catalog search and its
      detail shows its brewery. Every imported row carries source `wikidata`
      and its QID. Every seeded beer keeps its original id. All three are
      covered by an integration test against a real database.
- [x] The footer credits Wikidata and links to wikidata.org — a component
      test in both locales — and `README.md` ends with a Credits section
- [x] Every test the larger catalog broke is updated rather than deleted, and
      asserts properties rather than counts. `make verify` is green, and the
      import adds no more than about 15 s to `mvn verify`, with the before and
      after timings in the PR
- [x] `docs/architecture.md`'s data model and §8 seed-data trade-off describe
      the imported catalog, and `backend/README.md` says how to regenerate the
      migration from the snapshot

## Notes

Added when [task 01](01-catalog-data-source.md) was refined on 2026-10-15. Its
Notes hold the counts and links quoted above.
