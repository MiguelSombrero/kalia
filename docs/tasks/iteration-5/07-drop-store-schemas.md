# Task 07: Drop the empty `cart`, `ordering` and `payment` schemas

- **Status:** done
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

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

Editing `V001__create_module_schemas.sql` in place to remove the `cart`,
`ordering` and `payment` lines, and the assertion in `KaliaApplicationIT`
that currently requires them to exist. No new migration file.

## Non-goals

- Touching `catalog`, or the `public` schema holding Spring Modulith's
  `event_publication` table.
- The `cellar` schema. [Task 01](01-cellar-module-and-schema.md) already
  landed it as its own `V005__cellar_schema.sql`, so there is no longer a
  shared file to rebase on — this task only touches `V001`.

## Constraints

- Editing `V001` directly, rather than a new migration that reverses it,
  follows [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md):
  decided in this task's refinement, since Kalia has never been deployed
  anywhere and forward-only would otherwise keep the rejected store schemas
  permanently visible in migration history. Version numbering elsewhere still
  follows [backend/README.md](../../../backend/README.md) — this is a named
  exception, not a change to the general rule.
- Anyone with an existing local `docker compose` Postgres volume must wipe it
  (`docker compose down -v`) after this lands — Flyway rejects the changed
  `V001` checksum against already-applied history. Say so in the PR
  description; CI and Testcontainers-backed tests are unaffected (fresh
  container per run).
- [architecture.md §3](../../architecture.md) already states one schema per
  module and no longer lists these three; it needs no further edit, but
  re-check it in the PR.

## Open questions

**None.**

## Acceptance criteria

- [x] `V001__create_module_schemas.sql` no longer creates `cart`, `ordering`
      or `payment`; migrating from scratch against an empty database creates
      only `catalog` and `cellar` (plus `public`) — verified by the
      Testcontainers-backed integration test suite migrating from scratch
- [x] `KaliaApplicationIT` asserts the schemas that exist and asserts these
      three are **absent** — this negative assertion is the test that would
      catch a later migration reintroducing them
- [x] `mvn clean verify` is green — `clean` matters here since the migration
      file changed
- [x] SHOULD-3 moves to Retired in
      [quality-backlog.md](../quality-backlog.md) in this task's PR

## Notes

Quality backlog **SHOULD-3**. The lesson these schemas taught is recorded in
[ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s 2026-08-08
amendment, not here. The instrument for removing them —
editing `V001` instead of dropping forward — is recorded in
[ADR-0036](../../adr/0036-pre-deployment-migration-edits.md).
