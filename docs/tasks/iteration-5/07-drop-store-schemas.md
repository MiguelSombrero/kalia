# Task 07: Drop the empty `cart`, `ordering` and `payment` schemas

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)

## Why

`V001__create_module_schemas.sql` creates four PostgreSQL schemas. One of them,
`catalog`, holds tables. The other three have been empty since 2026-07-15 and
now always will be: the [vision](../../../README.md) changed on 2026-08-08 and
Kalia does not sell beer, so there is no cart, no order and no payment to store.
[ADR-0004](../../adr/0004-backend-cart.md) and
[ADR-0005](../../adr/0005-defer-auth-mock-payments.md), which put them there,
are both `deprecated`.

Empty schemas were justified as harmless — "they keep the seams visible"
([ADR-0006](../../adr/0006-cellar-first.md)). That was wrong in a way worth
being specific about. They were the store's only physical trace, so anyone
reading the database, the migration or `KaliaApplicationIT` saw a system that
was going to sell beer. A rejected shape that persists in the schema stops
looking rejected.

This is also the last thing standing between quality finding **SHOULD-3** and
retirement, which raised the same bias from the opposite direction.

## Scope

A migration removing the three schemas, and the assertion in
`KaliaApplicationIT` that currently requires them to exist.

## Non-goals

- Touching `catalog`, or the `public` schema holding Spring Modulith's
  `event_publication` table.
- The `cellar` schema — [task 01](01-cellar-module-and-schema.md) creates it.
  This task and that one both edit Flyway's `common/` and module locations, so
  whichever lands second rebases.

## Constraints

- Forward migration only, following the layout and version-numbering rules in
  [backend/README.md](../../../backend/README.md). `V001` is applied history and
  is never edited — a checksum change breaks every existing database.
- `DROP SCHEMA` without `CASCADE`, so the migration fails loudly if anything
  has been created in one of them since. The point is to remove three empty
  schemas, not to delete whatever is in them.
- [architecture.md §3](../../architecture.md) already states one schema per
  module and no longer lists these three; it needs no further edit, but
  re-check it in the PR.

## Open questions

1. **Is a `DROP SCHEMA` migration the right instrument, or should V001 be
   replaced via a baseline?** Dropping forward leaves a migration whose only
   purpose is undoing an earlier one, which reads oddly in five years. A
   baseline is cleaner to read and much riskier to apply. Recommendation is to
   drop forward; worth a moment of the product owner's time because it sets the
   precedent for every later removal.

## Acceptance criteria

- [ ] A new Flyway migration drops `cart`, `ordering` and `payment`, and
      applies cleanly against an empty database — verified by the
      Testcontainers-backed integration test suite migrating from scratch
- [ ] `KaliaApplicationIT` asserts the schemas that exist and asserts these
      three are **absent** — this negative assertion is the test that would
      catch a later migration reintroducing them
- [ ] `mvn clean verify` is green
- [ ] SHOULD-3 moves to Retired in
      [quality-backlog.md](../quality-backlog.md) in this task's PR

## Notes

Quality backlog **SHOULD-3**. The lesson these schemas taught is recorded in
[ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s 2026-08-08
amendment, not here.
