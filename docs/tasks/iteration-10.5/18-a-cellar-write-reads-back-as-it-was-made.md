# Task 18: A cellar write reads back as it was made, and a lost one says why

- **Status:** refined
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** none

## Why

Two small gaps sit between a cellar write and what the user sees afterwards,
and both grow once [iteration 12](../iteration-12.md) caches the cellar on a
phone and replays writes made without signal:

- **Bottles added together come back in another order.** `Entry.bottles`
  orders by `created_at, id`, but a bulk add stamps every bottle with one
  instant and `id` is a random UUID, so a later read orders the tie by id
  while the `POST /cellar/bottles` response lists them in insertion order. A
  client that reconciles by position sees them shuffle once (COULD-107).
- **A lost concurrent write is a generic failure.** The `409` the second of two
  conflicting cellar writes answers
  ([ADR-0057](../../adr/0057-retry-on-constraint-violation-for-get-or-create.md),
  `CellarService.addBottles`/`updateBottle`/`removeBottle`) reaches the web
  user as the same message as any other failure: `features/cellar/api.ts`
  throws for every status but success, and no cellar string or test mentions a
  conflict (COULD-95).

## Scope

A cellar read lists bottles added together in the order they were added, the
same order the write answered; and a web user whose cellar write lost to a
concurrent change is told so, with a way to reload and try again, in both
locales.

## Non-goals

- The mobile app's handling of the same `409`, which
  [iteration 12](../iteration-12.md)'s replayed writes design.

## Constraints

- The cellar read is the backend-joined one
  ([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)),
  bounded per [iteration 10 task 14](../iteration-10/14-the-owner-cellar-read-is-bounded.md);
  a new ordering column needs an index the bounded read can use.
- A schema change is a Flyway migration owned by the schema-owning role
  ([ADR-0100](../../adr/0100-postgres-has-three-roles-one-that-owns-the-schema-for-flyway-one-that-reads-and-writes-rows-and-one-for-keycloak.md)).
- A failure reaches the UI as a typed `ApiError`
  ([ADR-0023](../../adr/0023-typed-api-failures.md)); every string in `en` and
  `fi` ([ADR-0011](../../adr/0011-i18next-localization.md)).

**Decided at refinement, 2026-11-04** (product owner):

- **COULD-107: a bottle's id is a time-ordered UUIDv7** from Hibernate's
  generator, so the existing `created_at, id` order lists bottles added
  together as they were added, with no schema change. An ordering column was
  rejected. If the generator turns out not to order ids made within one
  millisecond, stop and re-refine rather than improvise.
- **Wording** of the conflict message is drafted in the PR, in both locales.

## Open questions

**None.**

## Acceptance criteria

- [ ] An integration test adds several bottles in one request and reads them
      back in the order the response listed them, repeated enough to have
      failed before the change, and with bottles created within one
      millisecond
- [ ] A component test shows a `409` from a cellar write presented as a
      conflict with a reload, not the generic failure; it failed before
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-95 (deferred in PR
#398) and COULD-107 (filed in the iteration 10 task 13 pull request).
