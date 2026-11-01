# Task 13: A cellar read or write never answers 500 under a concurrent change

- **Status:** needs-refinement
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

Three races in the cellar answer the wrong thing, and
[iteration 12](../iteration-12.md)'s replayed offline writes turn rare
interleavings into ordinary ones:

- A concurrent remove or update of one bottle can answer 500.
  `CellarService.ownerOf` loads the entry with its bottles lazy, the bottles
  load in a second `SELECT`, and if another request deleted the bottle in
  between, `Entry.bottleWithId` throws an `IllegalStateException` that is
  neither retried nor mapped. A double-tapped delete triggers it (SHOULD-74).
- `CellarService.readPublicCellar` reads counts and shown bottles in separate
  statements, and if the owner deleted an entry's last bottle in between,
  `PublicCellarEntryDto.from` throws on a null and answers 500 (COULD-76).
- Bottles added together read back in no fixed order: `Entry.bottles` is
  `@OrderBy("createdAt")` with no tiebreaker, and each bulk-added bottle reads
  `clock.instant()`, so a fixed `Clock` — every test — gives them one
  timestamp, and a real one can tie at the column's microsecond precision
  (COULD-96). A client that reconciles a local copy by position will see the
  bottles shuffle.

## Scope

Removing or updating a bottle that another request has just removed answers
the documented `404`, the public cellar never answers 500 for an entry whose
last bottle has just gone, and an entry's bottles always read back in the same
order.

## Constraints

- [ADR-0057](../../adr/0057-retry-on-constraint-violation-for-get-or-create.md)'s
  2026-10-24 amendment: a lost write to an entry is retried once, and a second
  loss answers `409`.
- [ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md):
  how a cellar read is joined.
- The `404` and `409` are already documented operations' responses; no new
  status reaches the API contract
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
- Order by `createdAt, id`, as the repository queries already do (COULD-96).

## Open questions

1. **SHOULD-74's fix:** fetch the bottles in the same query as the entry, or
   map the missing bottle to `BottleNotFoundException` — or both.
2. **COULD-76's fix:** one statement for counts and bottles, a repeatable-read
   transaction, or skipping an entry whose shown bottles have vanished.

## Acceptance criteria

- [ ] An integration test removes one bottle from two concurrent requests and
      gets one `204` and one `404`, and it failed before the fix
- [ ] An integration test deletes an entry's last bottle between the public
      cellar's two reads and gets a `200` without that entry
- [ ] A unit test adds three bottles under a fixed `Clock` and reads them back
      in insertion order, repeatedly
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-74, COULD-76 and
COULD-96 (deferred in PR #400).
