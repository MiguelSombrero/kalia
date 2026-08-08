# Task 01: `cellar` module, schema and domain rules

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)

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
- Any UI — [task 03](03-cellar-frontend.md).
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

## Open questions

1. **Are brewed date and best-before date both optional, and at what
   precision?** Many bottles carry only a year, some carry neither, and a few
   carry a full date. The answer decides the column type and what task 03 has
   to render for a bottle that has neither.
2. **What else does a bottle carry, and what belongs to the entry instead?**
   Purchase date, purchase price, notes and container type (bottle/can/keg)
   are all candidates. Anything per-bottle multiplies the form task 03 shows
   when someone adds four of the same beer.
3. **Can a bottle be marked drunk, or is it only deleted?** "Drunk" keeps a
   history worth having later — the feed in iteration 7 could use it — but it
   is a state machine this task would have to build now.
4. **Is there a bulk add** — "I bought six of these, same dates" — or is a
   bottle always added one at a time? This is a domain question before it is a
   UI one, because six identical bottles are either six rows or one row with a
   count, and the second contradicts the constraint above.
5. **Do an entry and a bottle carry `created_at` and `updated_at`?** Nothing
   needs them yet — the cellar has one client and it reads the whole thing
   every time. They are what separates a future client that can ask "what
   changed since I last looked" from one that must refetch everything, and a
   conflicting edit that can be detected from one that silently overwrites.
   `catalog.beer` has `created_at` and no `updated_at`, so this is also a
   question about which convention the next module sets. Two columns now
   against a migration and a contract change later
   ([backlog](../backlog.md) — mobile client).
6. **Does the caller supply a bottle's id, or does the server assign it?** Ids
   are already `UUID`, so a client *can* generate one. Accepting it makes
   creating a bottle idempotent — a retried request cannot produce a seventh
   bottle — and it is the precondition for a client that records bottles while
   offline. Server-assigned is simpler and is the right answer unless either of
   those is wanted. The point of asking now is that it is a contract, not an
   implementation detail: it is [task 02](02-cellar-rest-api.md)'s to expose but
   this task's to make possible.

## Acceptance criteria

- [ ] `cellar` exists as a Modulith module with `domain`/`application`/`web`
      packages; `ModularityTest` and `ArchitectureTest` pass unchanged —
      they are the verification, no new assertions needed
- [ ] Flyway migration creates the `cellar` schema and its two tables, and
      applies cleanly against an empty database — verified by the
      Testcontainers-backed `*IT` suite starting from scratch
- [ ] A bottle cannot be persisted with a brewed date in the future, or a
      best-before date at or before its brewed date — unit tests (`*Test`)
      covering both boundaries, each confirmed to fail before the rule exists
- [ ] A cellar entry reports the quantity its bottles imply, and removing a
      bottle changes it without any stored counter being updated — unit test
      that would fail against an implementation holding a `quantity` column
- [ ] The same beer can be held as several bottles with different dates, and
      they stay distinguishable — unit test
- [ ] An ADR records the two-level model and the rejected flat alternative,
      passing `node scripts/check-adrs.mjs`
- [ ] `mvn clean test` and `mvn verify` are green; JaCoCo coverage does not
      drop

## Notes

The `cellar.cellar_item(... quantity, vintage_year ...)` table that
`architecture.md` specified until 2026-08-08 is the alternative this task
rejects, not a spec to implement. See [ADR-0006](../../adr/0006-cellar-first.md)'s
2026-08-08 amendment for where that shape came from.
