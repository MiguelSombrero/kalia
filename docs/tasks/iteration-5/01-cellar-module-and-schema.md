# Task 01: `cellar` module, schema and domain rules

- **Status:** done
- **Iteration:** [5](../iteration-5.md)
- **Covers:** DW-1, DW-2

## Why

The cellar is the reason Kalia exists and the first per-user data in the app —
the reason authentication was pulled forward
([ADR-0006](../../adr/0006-cellar-first.md)). Nothing can store an owned beer
today: there is no `cellar` module, no schema, and no rule about what a valid
cellar entry is. This task builds that foundation so the API (task 02) has a
domain to expose.

What makes it more than plumbing: cellaring is about *which bottle*. An
AleSmith IPA brewed last month and one brewed two years ago are different
things to the person who owns both, and a model that records "AleSmith IPA ×2"
has thrown away the only fact the cellar exists to keep.

It is also the second backend module the codebase has ever had, so it is the
first real test of the module boundaries ArchUnit and Spring Modulith have
been enforcing against a single module.

## Scope

A `cellar` Spring Modulith module owning the beer a user says they own, in the
two levels the [vision](../../../README.md) requires: an entry per catalog beer,
owning the individual bottles of it, each bottle carrying its own brewed and
best-before dates. Its own schema and migrations, and its domain rules expressed
as unit-tested logic rather than validation scattered over a controller.

The two-level shape is the decision this task is really making, and it rejects
the one-row-per-beer-with-a-quantity model `architecture.md` specified until
2026-08-08 — so it produces an ADR
([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)).

## Non-goals

- The REST API — [task 02](02-cellar-rest-api.md).
- Any UI — [task 11](11-cellar-page.md), [task 13](13-add-bottle-to-cellar.md),
  [task 14](14-edit-remove-bottle.md).
- Resolving the current user from a token: that is `identity`'s job, delivered
  by [iteration 4 task 3](../iteration-4.md).

## Constraints

- Module layout and dependency direction follow
  [ADR-0007](../../adr/0007-backend-package-structure.md): `web → application
  → domain`, entities and repositories in `domain`. `cellar` may depend on
  `catalog` and `identity`, never the reverse
  ([architecture.md §3](../../architecture.md)).
- One schema per module, migrations under the module's own Flyway location;
  `spring.flyway.locations` must gain the new location.
- The cellar is two levels, and quantity is **derived by counting bottles,
  never stored** ([architecture.md §3](../../architecture.md)). A stored count
  alongside the rows it counts is a second source of truth that drifts
  silently.
- Money stays in integer cents; no floating-point currency.
- Brewed date and best-before date are both nullable, full-precision `date`
  columns — no year-only or partial-date support in this task.
- A bottle carries brewed date, best-before date, and container type
  (bottle/can/keg); no purchase price or notes field. Photos are not in scope
  — nothing in the roadmap adds beer images yet ([backlog](../backlog.md)).
- No "drunk" state: removing a bottle is a hard delete. Revisit if iteration
  7's feed wants bottle history.
- Bulk add is in scope as an application-layer operation that creates several
  bottles sharing the same dates and container type in one call. Quantity
  stays derived — each created bottle is its own row, independently
  removable and editable; nothing is stored as a count.
- Entry and bottle both carry `created_at` and `updated_at`.
- Bottle ids are server-assigned. Whether the REST API later accepts a
  client-supplied id is [task 02](02-cellar-rest-api.md)'s call, not this
  task's.

## Open questions

**None.**

## Acceptance criteria

- [x] `cellar` exists as a Modulith module with `domain`/`application`/`web`
      packages; `ModularityTest` and `ArchitectureTest` pass unchanged —
      they are the verification, no new assertions needed
- [x] Flyway migration creates the `cellar` schema and its two tables, and
      applies cleanly against an empty database — verified by the
      Testcontainers-backed `*IT` suite starting from scratch
- [x] A bottle cannot be persisted with a brewed date in the future, or a
      best-before date at or before its brewed date — unit tests (`*Test`)
      covering both boundaries, each confirmed to fail before the rule exists
- [x] A cellar entry reports the quantity its bottles imply, and removing a
      bottle changes it without any stored counter being updated — unit test
      that would fail against an implementation holding a `quantity` column
- [x] The same beer can be held as several bottles with different dates, and
      they stay distinguishable — unit test
- [x] A bottle can be persisted with a null brewed date, a null best-before
      date, or both — unit test, distinct from the boundary-violation cases
      above
- [x] A bottle's container type is one of bottle/can/keg; any other value is
      rejected — unit test, with the schema enforcing it too (checked by the
      `*IT` suite)
- [x] Adding several bottles in one call with shared dates and container type
      produces that many independent rows; removing one leaves the rest and
      the entry's derived quantity correct — unit test
- [x] A newly persisted entry and bottle both have `created_at` and
      `updated_at` set — verified by the Testcontainers-backed `*IT` suite
      starting from an empty database
- [x] An ADR records the two-level model and the rejected flat alternative,
      passing `node scripts/check-adrs.mjs`
- [x] `mvn clean test` and `mvn verify` are green; JaCoCo coverage does not
      drop

## Notes

The `cellar.cellar_item(... quantity, vintage_year ...)` table that
`architecture.md` specified until 2026-08-08 is the alternative this task
rejects, not a spec to implement. See [ADR-0006](../../adr/0006-cellar-first.md)'s
2026-08-08 amendment for where that shape came from.
