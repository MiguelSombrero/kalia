# Task 02: Add-a-beer API

- **Status:** needs-refinement
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

## Non-goals

- Any UI — [task 03](03-add-beer-ui.md).
- Editing or deleting an existing beer. [Task 01](01-catalog-data-source.md)
  decided that iteration 8 only adds beers; editing is in the
  [backlog](../backlog.md).
- A moderation queue or review workflow. Task 01 decided that added beers are
  visible at once.
- A barcode field — [iteration 14](../iteration-14.md).

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

## Open questions

1. **What makes two beers the same beer?** Name plus brewery is the obvious
   answer, and it is wrong often enough to matter. Examples: "IPA" from a
   brewery with three of them, the same beer spelled two ways, a rebrew under a
   new name. The imported catalog adds a new case: a beer named in another
   language, such as "Westvleteren Twaalf" for "Westvleteren 12". Whether
   [task 17](17-seed-the-catalog-from-wikidata.md) keeps aliases decides how
   much a check can see. Whatever is chosen becomes a database constraint, so
   it wants deciding rather than discovering.
2. **What happens on a duplicate** — refuse with a pointer to the existing
   beer, or return the existing one as if it had been created? The second is
   friendlier and hides a user's mistake from them.
3. **Which fields are required?** The catalog's read model has brewery,
   country, style, ABV and description. If task 17 imports only complete rows,
   every imported beer has an ABV and a style. Should a user-added beer meet
   the same bar, or may it say less than its imported neighbours?
4. **Is the brewery picked from existing ones, or can it be created too?** The
   import brings thousands of breweries, but a new beer from a brewery Kalia
   does not know is still common. If a user can create a brewery, what makes
   two breweries the same?
5. **What happens to the contributor record when its user deletes their
   account?** Task 01 decided the contributor is recorded, which makes catalog
   rows personal data. Is the beer kept with the link removed, or does it go?

## Acceptance criteria

- [ ] An authenticated request creates a beer that then appears in search and
      at its detail endpoint — integration test against a real database
- [ ] A created beer records its contributor and is marked user-added, and a
      duplicate of an imported beer is caught as well as a duplicate of a
      user-added one — integration test
- [ ] An unauthenticated request is refused, while catalog reads still answer
      anonymously — one test covering both, so opening the catalog to writes
      cannot silently close it to readers
- [ ] A duplicate is handled as question 2 decides, and cannot produce two rows
      — integration test, plus a database constraint proving it under
      concurrent inserts rather than only in application code
- [ ] Invalid and out-of-range fields are refused with `problem+json` listing
      the violations — integration test
- [ ] A beer created through the API can immediately be added to a cellar —
      integration test spanning both modules, since this is the whole point of
      the iteration
- [ ] The generated OpenAPI client is regenerated and committed; the
      `api-client-drift` CI job passes
      ([ADR-0012](../../adr/0012-orval-api-client.md))
- [ ] `mvn clean verify` is green; `ModularityTest` and `ArchitectureTest` pass

## Notes

**None.**
