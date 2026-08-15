# Task 09: Reconcile the `Bottle` / `Beer` naming across `cellar` and `catalog`

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

## Why

Reviewing [task 01](01-cellar-module-and-schema.md) (PR #114), the product
owner raised a naming concern: `cellar.Bottle` shares a name with
`ContainerType.BOTTLE`, one of its own field's possible values — a can of
AleSmith IPA is a `Bottle` whose `containerType` is `CAN`. Underneath that is
a bigger question: `catalog.Beer` already names the product concept
("AleSmith IPA" the brand/recipe), but a person buying a beer more often
means the physical thing in their hand — which is what `cellar.Bottle`
actually models. Two different concepts are candidates for the same English
word, and the codebase currently gives `Beer` to one of them and nothing to
the other.

This is worth resolving deliberately rather than living with whichever name
task 01 happened to pick first, because every layer above the entity —
REST paths, the OpenAPI schema, generated frontend types, and the prose in
`architecture.md` and several ADRs — inherits whatever is decided here, and
gets more expensive to change the longer it waits.

## Scope

Decide whether `cellar.Bottle` and/or `catalog.Beer` should be renamed so
that exactly one meaning attaches to each name in the domain, and — once
decided — carry that name through every layer it touches: backend entities,
repositories, DTOs, exceptions, REST endpoints, the OpenAPI spec, generated
frontend types, seed-data references, and the prose in `architecture.md`,
`README.md` and any ADR still describing the current names as the live
convention (frozen ADRs like [ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md)
keep their original wording — see its own Notes-equivalent framing in
[ADR-0020](../../adr/0020-documentation-roles.md)).

## Non-goals

- Deciding the actual name now — that is this task's refinement
  conversation, not something to prejudge in the Why/Scope above.
- Any behavior change. This is a rename for clarity; nothing about what the
  cellar or catalog *do* should change.

## Constraints

- `catalog.beer`'s table and columns, if renamed, need a Flyway migration;
  existing seed data (V004) must survive it unchanged.
- `cellar.entry.beer_id` and `CatalogApi.beerExists` (task 01, PR #114)
  already encode "beer" as catalog's concept in cellar's own code — a rename
  reaches into `cellar` too, not just `catalog`.
- Whatever name each concept keeps, no two classes across modules may share
  it, even in different packages — the exact confusion this task exists to
  remove.

## Open questions

1. Should `cellar.Bottle` (the individually-dated, individually-owned unit)
   be renamed — e.g. to `Beer`, matching how people actually talk about a
   cellar ("I have 12 beers left") — or does the `Bottle`/`ContainerType.BOTTLE`
   overlap not rise to a real problem worth touching?
2. If `cellar.Bottle` becomes `Beer`, `catalog.Beer` needs a different name
   so the two do not collide. The review raised `Brand` as one candidate,
   while noting `AleSmith` (the brewery) is arguably the brand and "AleSmith
   IPA" a specific product of it — `Brewery` already owns that role. Is
   `Brand` still right, or is there a better fit (`Product`, something else)?
3. Independent of the `Beer` question: is the `Bottle`-entity /
   `ContainerType.BOTTLE`-value overlap worth fixing on its own if the rest
   stays as-is?
4. If `catalog.Beer` is renamed, how far should it reach in one pass — REST
   paths (`/api/v1/beers`), the OpenAPI schema name, generated frontend
   types (`lib/api/generated/`, regenerated via orval per
   [ADR-0012](../../adr/0012-orval-api-client.md)) — versus staging it, e.g.
   backend first, frontend-facing surface later?

## Acceptance criteria

- [ ] Every type participating in the chosen naming (backend entities, DTOs,
      generated frontend types) uses exactly one name per concept — a repo
      grep for the retired name turns up nothing outside frozen ADR prose,
      and `mvn clean verify` stays green
- [ ] If `catalog.beer`'s table is renamed, a Flyway migration performs the
      rename and the Testcontainers-backed `*IT` suite confirms the seeded
      beer count and names are unchanged afterward
- [ ] If any public-facing name changes (REST path, OpenAPI schema), the
      frontend is regenerated (`npm run generate`) with no manual drift, and
      `npm test` / `npm run test:e2e` stay green

## Notes

Raised in review on [PR #114](https://github.com/MiguelSombrero/kalia/pull/114)
(task 01), discussion thread on `backend/src/main/java/fi/kalia/cellar/domain/Bottle.java`.
