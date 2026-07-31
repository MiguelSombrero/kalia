# Task 01: `cellar` module, schema and domain rules

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)

## Why

The cellar is the first per-user data in the app and the reason authentication
was pulled forward ([ADR-0006](../../adr/0006-cellar-first.md)). Nothing can
store an owned beer today: there is no `cellar` module, no schema, and no rule
about what a valid cellar entry is. This task builds that foundation so the
API (task 02) has a domain to expose.

It is also the second backend module the codebase has ever had, so it is the
first real test of the module boundaries ArchUnit and Spring Modulith have
been enforcing against a single module.

## Scope

A `cellar` Spring Modulith module owning the beers a user says they own —
quantity, vintage/bottled year, purchase date and price, notes — with its own
schema and migrations, and its domain rules expressed as unit-tested logic
rather than validation scattered over a controller.

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
- One schema per module, migrations under the module's own Flyway location —
  `architecture.md` §4 already names the table shape
  (`cellar.cellar_item(...)`) and `spring.flyway.locations` must gain the new
  location.
- Money stays in integer cents, matching `purchase_price_cents` in that same
  section; no floating-point currency.

## Open questions

1. **Is vintage year optional?** Plenty of beers carry no bottling year, and
   `architecture.md` §4 does not say. If it is optional, "age" in task 03 has
   to render something sensible for a bottle that has none.
2. **Is quantity 0 a legal state**, meaning "I drank the last one but want to
   keep the entry", or does removing the last bottle remove the entry? This
   decides whether the domain rule is `quantity > 0` or `quantity >= 0`, and
   whether task 03 needs a distinct "drunk it" action.
3. **May the same beer appear twice in one cellar** — say two vintages of the
   same beer? If yes, `(user_id, beer_id)` is not unique and vintage becomes
   part of the identity of an entry.

## Acceptance criteria

- [ ] `cellar` exists as a Modulith module with `domain`/`application`/`web`
      packages; `ModularityTest` and `ArchitectureTest` pass unchanged —
      they are the verification, no new assertions needed
- [ ] Flyway migration creates the `cellar` schema and `cellar_item` table
      matching `architecture.md` §4, and applies cleanly against an empty
      database — verified by the Testcontainers-backed `*IT` suite starting
      from scratch
- [ ] A cellar item cannot be persisted with a non-positive quantity, or a
      vintage year in the future — unit tests (`*Test`) covering both
      boundaries, each confirmed to fail before the rule exists
- [ ] `mvn clean test` and `mvn verify` are green; JaCoCo coverage does not
      drop

## Notes

`architecture.md` §4 already specifies the table and the authenticated
endpoints, so the shape is settled — this task implements what is documented
rather than deciding it.
