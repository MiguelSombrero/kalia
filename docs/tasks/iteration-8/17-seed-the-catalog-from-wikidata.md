# Task 17: Seed the catalog from Wikidata

- **Status:** needs-refinement
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

## Open questions

1. **Strict or partial rows?** Importing only beers that have an ABV and a
   specific style keeps `abv` and `style` NOT NULL and the API contract
   unchanged, and still yields about 14.7k beers. Making them nullable admits
   about 4k more, and changes the contract.
2. **Which style vocabulary?** Wikidata has 166 style classes, including NEIPA,
   Double NEIPA and Triple IPA. Keep its labels as the style text, or map them
   onto a shorter Kalia list? The answer shapes the style filter users see.
3. **Which name, and are other names kept?** Most beers have no English label
   ("Westvleteren Twaalf"). Which language wins when there are several? Are
   the other labels kept as aliases so that a search for "Westvleteren 12"
   finds the beer? Aliases would be a schema change.
4. **Which breweries?** Only breweries that make an imported beer, or all of
   Wikidata's ~5.2k so that [task 02](02-add-beer-api.md) has more to pick
   from? Only about 40% have a city.
5. **Brewery uniqueness.** `catalog.brewery.name` is unique worldwide today,
   and imported names collide across countries. Should it change to
   `(name, country)`?
6. **What counts as matching a seeded row?** An exact normalised name plus
   brewery, a hand-reviewed list, or both? The rule decides whether Orval is
   imported a second time.
7. **Bad values.** 110 beers have an ABV of 0 or below, or above 20%, and 19
   have conflicting ABVs. Should they be dropped, clamped, or kept when one
   value has a reference?
8. **Where does the import tooling live, and in what?** A dependency-free Node
   script beside the existing checkers in `scripts/`, or a Java tool in
   `backend/`? Where does the committed snapshot live, and in what format?
9. **SQL migration or a Java migration loading a CSV?** About 15k beers and
   about 5k breweries make a generated SQL migration of a few megabytes. A
   Java-based migration with `COPY` is smaller to review but is code rather
   than data.
10. **Tests against a large catalog.** Catalog tests assert exact counts over
    migration data (54 beers, 20 breweries, 3 results). Should they move to
    their own fixture data, or assert relative results? How much CI time may
    the larger catalog add?
11. **The Wikidata credit.** Where is it shown — the footer, the catalog page,
    every imported beer — and in what words, in both locales?

## Acceptance criteria

- [ ] The conversion is unit-tested over a small committed fixture. The fixture
      covers label fallback, rejected and conflicting ABVs, a manufacturer that
      is not a brewery, a beer matching a seeded row, and an Untappd ID in the
      input that never reaches the output.
- [ ] A check run in CI fails if the snapshot, the generated migration or the
      schema contains an Untappd identifier, URL or review score
- [ ] Regenerating the migration from the committed snapshot reproduces the
      committed file exactly — a check run in CI
- [ ] After migration, an imported beer is found by catalog search and its
      detail shows its brewery. Every imported row carries source `wikidata`
      and its QID. Every seeded beer keeps its original id. All three are
      covered by an integration test against a real database.
- [ ] Wikidata is credited where question 11 decides — a component test in
      both locales
- [ ] Every test the larger catalog broke is updated rather than deleted, and
      `make verify` is green
- [ ] `docs/architecture.md`'s data model and §8 seed-data trade-off describe
      the imported catalog, and `backend/README.md` says how to regenerate the
      migration from the snapshot

## Notes

Added when [task 01](01-catalog-data-source.md) was refined on 2026-10-15. Its
Notes hold the counts and links quoted above.
