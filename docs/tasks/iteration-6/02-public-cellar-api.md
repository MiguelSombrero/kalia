# Task 02: Public cellar read API

- **Status:** done
- **Iteration:** [6](../iteration-6.md)

## Why

Every cellar endpoint built in [iteration 5](../iteration-5.md) answers for the
caller and nobody else — the isolation rule that task deliberately made
absolute. Making a cellar public means deliberately breaking it, for exactly
one case, and that is the kind of change that goes wrong quietly.

It is worth its own task for that reason. This is the first endpoint in Kalia
that serves one person's data to another, and the first read the app allows
anonymously that is not seeded reference data.

## Scope

Reading a cellar that its owner has marked public: the beers in it and their
bottles, available to any caller including a signed-out one, addressed by the
owner's username. The endpoint belongs to `cellar` — the module that owns the
data answers for it — and resolves the username and the visibility flag
through `profile`'s root-package API.

## Non-goals

- Writing anything. A public cellar is readable, never editable, by anyone but
  its owner.
- Any UI — [task 04](04-public-cellar-page.md).
- Discovery: no endpoint that lists public cellars or searches them. You reach
  a cellar from a link or a profile.

## Constraints

- The signed-in user's own cellar endpoints from
  [iteration 5 task 02](../iteration-5/02-cellar-rest-api.md) are unchanged.
  This adds a read path; it does not relax the existing one.
- Default deny stays the rule
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)): this
  endpoint is public only by being listed as such, and the list is the visible
  edit that makes it reviewable.
- Errors are RFC 9457 `problem+json`
  ([ADR-0014](../../adr/0014-shared-exception-handling.md)).
- **A private cellar must be indistinguishable from one that does not exist.**
  404 for both, uniformly, for every caller including the owner
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)) — matching the rule
  [architecture.md §4](../../architecture.md) already applies to another
  user's entry or bottle. This fails silently: an implementation returning 403
  for private and 404 for unknown passes every functional test while telling
  strangers who has a cellar.
- **The response is its own DTO type**, carrying the same fields the owner's
  endpoint does today ([ADR-0050](../../adr/0050-public-cellar-addressing.md)).
  Reusing `EntryDto`/`BottleDto` is the rejected option: it publishes to
  strangers, by default, any field ever added for the owner.
- `cellar` owns `GET /api/v1/cellars/{username}` and reads
  `ProfileApi` for the owner id and the visibility answer; `profile` stays a
  leaf ([ADR-0049](../../adr/0049-profile-module-and-public-identity.md)). A
  missing profile row reads as private, so an unknown username and a private
  cellar reach the 404 by the same path rather than by two.
- **The cellar query is keyed on an already-resolved owner id**, so a cellar
  that is not public is never loaded and then hidden. Loading first and
  filtering afterwards is how a later refactor turns a 404 into a 200.
- Entries no longer outlive their bottles
  ([task 06](06-entry-with-no-bottles.md), amending
  [ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md)), so this read
  has no zero-quantity rows to decide about — task 06 lands first for that
  reason.
- The page's `robots` directive is [task 04](04-public-cellar-page.md)'s to
  set, but the decision is
  [ADR-0050](../../adr/0050-public-cellar-addressing.md)'s: `noindex,
  nofollow`.

## Open questions

**None.**

## Acceptance criteria

- [x] A signed-out request reads a public cellar's beers and bottles —
      integration test
- [x] **A private cellar is unreadable by a signed-out caller, by a different
      signed-in user, and by a caller passing the owner's own identifier** —
      integration test for each, every one confirmed to fail against an
      implementation that ignores the visibility flag
- [x] Flipping a cellar from public to private makes an identical request stop
      working — integration test doing exactly that, which is the case a test
      of two fixed cellars would miss
- [x] A private cellar, an unknown username and the owner's own private cellar
      produce byte-identical responses — integration test comparing status and
      body across all three, confirmed to fail against an implementation that
      answers 403 for any of them
- [x] The public response is a distinct type from `EntryDto`/`BottleDto` — a
      test pins its rendered field set, so a field added to the owner's shape
      cannot reach it without someone choosing to add it
- [x] The owner still reads and writes their own cellar unchanged, and no
      caller can write to anyone else's through the new path — integration test
- [x] The generated OpenAPI client is regenerated and committed; the
      `api-client-drift` CI job passes
      ([ADR-0012](../../adr/0012-orval-api-client.md))
- [x] `mvn clean verify` is green

## Notes

The visibility flag itself is [task 01](01-profile-and-visibility.md)'s. This
task is where it becomes true.

Refined 2026-08-30 with iteration 6 as a batch
([ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md)). Question
2 asked what to withhold and named purchase price — no such field exists; a
beer's price is catalog data and already public, which is part of why nothing
is withheld.
