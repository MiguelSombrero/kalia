# Task 02: Add-a-beer API

- **Status:** done
- **Iteration:** [8](../iteration-8.md)

## Why

`catalog` has been read-only since iteration 1. Every beer in it arrived through
a Flyway migration, so a user who owns a beer Kalia has never heard of cannot
put it in their cellar at all — the app simply has no answer for them.

This is the first write path into the catalog, and the first data in Kalia that
one user creates and everyone else reads. Both make it the task where getting
validation and duplicate handling right matters more than usual: a bad row in
the catalog is visible to every user forever, not just to whoever added it.

## Scope

Creating a beer in Kalia's own catalog from an authenticated request. After
[task 17](17-seed-the-catalog-from-wikidata.md), that catalog also holds about
15k beers imported from Wikidata. A created beer is visible to everyone at
once, records who added it, and is recorded as user-added. A duplicate is
caught whatever the existing beer's source — imported, seeded or user-added —
rather than accumulated.

When the beer's brewery is not in the catalog yet, the same flow creates the
brewery too. The API also answers the two reads the form in
[task 03](03-add-beer-ui.md) needs: finding a brewery by name, and the styles
a beer may have.

## Non-goals

- Any UI — [task 03](03-add-beer-ui.md).
- Editing or deleting an existing beer. [Task 01](01-catalog-data-source.md)
  decided that iteration 8 only adds beers; editing is in the
  [backlog](../backlog.md).
- A moderation queue or review workflow. Task 01 decided that added beers are
  visible at once.
- A barcode field — [iteration 14](../iteration-14.md).
- A description on a user-added beer. See Constraints.

## Constraints

- **This task cannot be refined before [task 01](01-catalog-data-source.md) is
  done**, and it is built after
  [task 17](17-seed-the-catalog-from-wikidata.md). Duplicate detection has to
  be designed against the imported catalog, not the 54-beer seed.
- Task 01's decisions bind this task. The contributor is recorded. A
  user-added row is marked user-added, using the provenance columns task 17
  introduces.
- Catalog reads stay public; this write requires authentication
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)). Default
  deny means the new route is protected unless deliberately listed otherwise.
- Bean Validation bounds every field, following the convention `catalog`'s
  controller already applies; errors are RFC 9457 `problem+json`
  ([ADR-0014](../../adr/0014-shared-exception-handling.md)).
- Controllers live in `catalog.web` and depend only on `catalog.application`
  ([ADR-0007](../../adr/0007-backend-package-structure.md)).
- The existing search and detail endpoints keep their contract. A catalog that
  grows must not change shape.

**Decided at refinement, 2026-10-15** (product owner):

- **Two beers are the same when they have the same brewery and the same name
  after case, whitespace and punctuation are folded.** A unique index on that
  normalised form enforces it, in place of today's case-sensitive
  `UNIQUE (brewery_id, name)`. The index does not catch two spellings of one
  name, so [task 03](03-add-beer-ui.md)'s form shows the brewery's
  similarly named beers before the user submits. Keeping today's exact rule,
  and the normalised rule without the hint, were rejected.
  [Task 17](17-seed-the-catalog-from-wikidata.md) has already reduced
  imported beers to one per normalised name, so the index can be created.
- **A duplicate is refused with `409` `problem+json` carrying the existing
  beer's id.** Answering as if the beer had been created was rejected, because
  it hides the user's mistake from them.
- **A user-added beer meets the imported catalog's bar.** It has a name, a
  brewery, a style and an ABV, all required. The style is one the catalog
  already has, which is [task 17](17-seed-the-catalog-from-wikidata.md)'s
  vocabulary, and the API refuses any other. The ABV is within the bounds the
  search API already uses (0–100).
- **No description.** A user-added beer carries facts only, as the import
  does. A free-text field everyone sees at once, with no review queue and no
  editing, is where abuse would land.
- **The brewery is picked, or created in the same flow.** A new brewery has a
  name, a country picked from a fixed list rather than typed, and an optional
  city. The country is stored in the same English form the catalog already
  uses, so the country filter still matches. A brewery is a duplicate when its
  normalised name and country match an existing one
  ([task 17](17-seed-the-catalog-from-wikidata.md)'s rule). It is refused the
  same way as a duplicate beer, with the existing brewery's id. Allowing only
  existing breweries, and a free-text name the backend finds or creates, were
  rejected.
- **The contributor is recorded and never exposed.** No read response
  carries it, so no page can show it ([task 03](03-add-beer-ui.md)). Kalia
  gets no signal when an account is deleted and keeps profiles forever
  ([task 09](09-a-username-is-a-permanent-address.md)), so the link stays.
  When account deletion arrives ([backlog](../backlog.md)), the beer is kept
  and the contributor link removed.

## Open questions

**None.**

## Acceptance criteria

- [x] An authenticated request creates a beer that then appears in search and
      at its detail endpoint — integration test against a real database
- [x] A created beer records its contributor and is marked user-added, and a
      duplicate of an imported beer is caught as well as a duplicate of a
      user-added one — integration test
- [x] An unauthenticated request is refused, while catalog reads still answer
      anonymously — one test covering both, so opening the catalog to writes
      cannot silently close it to readers
- [x] A duplicate beer, including one differing only in case, whitespace or
      punctuation, is refused with `409` `problem+json` carrying the existing
      beer's id, and cannot produce two rows — integration test, plus a
      database constraint proving it under concurrent inserts rather than only
      in application code
- [x] A beer whose brewery is new creates that brewery, and a duplicate
      brewery (same normalised name and country) is refused the same way —
      integration test
- [x] A style the catalog does not have, or a missing ABV, is refused —
      integration test. The create request has no description field
- [x] No catalog read response carries the contributor — integration test
      against the search and detail responses
- [x] Breweries can be found by name, and the catalog's styles listed, through
      the API — integration test
- [x] Invalid and out-of-range fields are refused with `problem+json` listing
      the violations — integration test
- [x] A beer created through the API can immediately be added to a cellar —
      integration test spanning both modules, since this is the whole point of
      the iteration
- [x] The generated OpenAPI client is regenerated and committed; the
      `api-client-drift` CI job passes
      ([ADR-0012](../../adr/0012-orval-api-client.md))
- [x] `mvn clean verify` is green; `ModularityTest` and `ArchitectureTest` pass

## Notes

**None.**
