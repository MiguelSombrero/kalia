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

Creating a beer in the catalog from an authenticated request, under whatever
model [task 01](01-catalog-data-source.md) settles, with duplicates caught
rather than accumulated.

## Non-goals

- Any UI — [task 03](03-add-beer-ui.md).
- Editing or deleting an existing beer, unless
  [task 01](01-catalog-data-source.md) decides editing is part of the model.
- Breweries as user-created data, if the decision does not require it.
- Admin tooling or a moderation queue beyond what task 01 decides. If
  moderation is chosen, its workflow is its own task.

## Constraints

- **This task cannot be refined before [task 01](01-catalog-data-source.md) is
  done.** Its Scope and Open questions are written against a model that has not
  been chosen yet and get rewritten when it is.
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
   answer and wrong often enough to matter — "IPA" from a brewery with three of
   them, the same beer spelled two ways, a rebrew under a new name. Whatever is
   chosen becomes a database constraint, so it wants deciding rather than
   discovering.
2. **What happens on a duplicate** — refuse with a pointer to the existing
   beer, or return the existing one as if it had been created? The second is
   friendlier and hides a user's mistake from them.
3. **Which fields are required?** The catalog's read model has brewery,
   country, style, ABV, description and price. Requiring all of them stops a
   user adding the beer in their hand; requiring none fills the catalog with
   name-only rows.
4. **Is the brewery picked from existing ones, or can it be created too?** A
   new beer from a brewery Kalia does not know is the common case, not the edge
   one.
5. **Does the price field make sense for a user-added beer at all?** It exists
   because the original vision included a store, which it no longer does.
6. **Is the contributor recorded?** Useful for moderation and attribution, and
   it makes catalog data personal data.

## Acceptance criteria

- [ ] An authenticated request creates a beer that then appears in search and
      at its detail endpoint — integration test against a real database
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
