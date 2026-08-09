# ADR-0036: Applied Flyway migrations may be edited before Kalia's first deployment

- **Status:** accepted
- **Date:** 2026-08-09

## Context

Flyway validates a checksum for every migration it has already applied, so
the normal discipline — and the one [backend/README.md](../../backend/README.md)
assumed until now — is forward-only: an applied migration is never edited,
and undoing one means writing a new migration that reverses it. The reason is
that a changed checksum breaks validation on any database that already ran
the old version.

[Iteration 5 task 07](../tasks/iteration-5/07-drop-store-schemas.md) needs to
remove the `cart`, `ordering` and `payment` schemas that
`V001__create_module_schemas.sql` created for a store model the vision no
longer includes ([ADR-0004](0004-backend-cart.md),
[ADR-0005](0005-defer-auth-mock-payments.md), both deprecated 2026-07-15).
The task's first draft followed forward-only discipline: a new migration
issuing `DROP SCHEMA`, leaving `V001` untouched. The product owner pushed
back — Kalia has never been deployed anywhere, so the checksum-break the
discipline guards against cannot happen to a real database, and forward-only
would permanently encode a rejected design in migration history that every
future reader of `V001` sees, for no one's benefit.

Checked before deciding: CI runs `mvn verify` against a Testcontainers
Postgres, fresh per job with no state carried between runs, so an edited
checksum is invisible there. The only databases that exist anywhere are
those ephemeral CI containers and developers' own `docker compose` Postgres
volumes.

## Decision

**Before Kalia is deployed anywhere, an applied Flyway migration may be
edited or have statements removed directly, instead of reversed by a later
migration, when forward-only would otherwise encode a rejected design
permanently into migration history.** Task 07 edits
`V001__create_module_schemas.sql` in place, removing the `cart`, `ordering`
and `payment` lines, rather than adding a migration that drops them.

This exception ends the moment anything is deployed outside a developer's own
machine or CI — a database instance whose schema state actually matters,
that isn't simply recreated on the next `docker compose up --build` or test
run. From that point on, forward-only applies without exception: an applied
migration is immutable, full stop, and undoing one is a new migration.

## Alternatives considered

**Forward `DROP SCHEMA` migration, `V001` left untouched.** The task's
original recommendation, and the generally safer default — it never touches
applied history, so it carries no checksum risk. Rejected here specifically
because that safety is bought by keeping `cart`/`ordering`/`payment` visible
in `V001` forever, which is the exact bias
[quality-backlog SHOULD-3](../tasks/quality-backlog.md) flagged: a rejected
shape that persists in the schema stops looking rejected. With no real
database anywhere for the checksum change to break, the safety has no
matching benefit to justify that cost.

## Consequences

- Good, because `V001` describes only the schemas Kalia actually has —
  nothing in migration history has to be read past to know the current
  shape.
- Bad, because any developer's `docker compose` Postgres volume that already
  ran the old `V001` fails Flyway's checksum validation on next boot until
  the volume is wiped (`docker compose down -v`) or the schema history
  repaired. This is a one-time, self-inflicted cost each developer pays on
  their own machine, not a shared or production one.
- Neutral, because the exception has no automated check for "has this been
  deployed yet" — applying it correctly is a judgment call each time, same
  as ADR-0027's process-weight judgment.
- **Revisit trigger:** Kalia's first deployment anywhere its schema state
  persists beyond a developer's own machine or CI. At that point this ADR's
  exception ends, and this decision should be marked superseded or amended
  accordingly.
