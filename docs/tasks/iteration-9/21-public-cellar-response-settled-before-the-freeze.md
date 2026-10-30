# Task 21: The public cellar's response is settled before `/api/v1` freezes

- **Status:** refined
- **Iteration:** [9](../iteration-9.md)
- **Covers:** none

## Why

[Task 04](04-decision-api-compatibility-policy.md) makes `/api/v1`
additive-only, and after that a change to a response's shape costs a new
version. The public cellar's response has two problems that only a shape
change can fix:

- Its envelope (`entries`, `page`, `totalPages`, `totalBeers`, and so on)
  breaks the single pagination envelope `docs/architecture.md` §4 states. §4
  names only the feed as an exception, and the glossary does not list this
  envelope (SHOULD-85).
- It is paged and totalled in SQL and only then drops entries for `PENDING`
  beers. A page can therefore come back short, and `totalElements`, the
  bottle total and `lastAddedAt` count beers the reader is not shown
  (SHOULD-79). The cause is structural: under the no-cross-schema rule, the
  cellar can only filter on catalog state after it has paged.

This is the last moment either can change at no cost.

## Scope

The public cellar's response has the shape it will keep under the
compatibility policy, and its totals and paging count only what the reader is
shown, or the response no longer claims totals it cannot keep.

## Constraints

- [ADR-0059](../../adr/0059-feed-respects-cellar-visibility.md) and
  [ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md):
  what a reader may see of a pending beer.
- [ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)
  and the no-cross-schema rule in `docs/architecture.md` §3.
- Must land before [task 04](04-decision-api-compatibility-policy.md)'s policy
  takes effect and before [task 09](09-shared-packages.md) generates the
  shared client.

**Decided at refinement, 2026-10-30** (product owner):

- **The envelope aligns with §4's standard one** — `content`,
  `totalElements`, `totalPages`, `page` — with the cellar's own `username`,
  `totalBottles` and `lastBottleAddedAt` alongside it as extra fields. A
  second documented exception was rejected: the feed's exception has a
  reason (a list growing at the head), and this one has none.
- **The cellar asks the catalog, at read time, which of its entries' beers
  a reader may not see, and excludes them in SQL before paging and
  totalling,** so pages come back full and the totals count only what is
  shown. It is the lightest correct option, chosen as an interim: no
  migration, no stored projection, and no change to `make moderate`, which
  changes a beer's status in SQL and so publishes no event a stored
  projection could follow. A cellar-side projection fed by moderation
  events was the first choice, and is revisited once moderation has an
  admin page of its own (Notes). Dropping the totals was rejected because
  the web's public cellar header shows them; over-fetching the way the feed
  does because totals still cannot be exact under offset paging.

## Open questions

**None.**

## Acceptance criteria

- [ ] An integration test shows a public cellar holding a pending beer
      returns full pages and totals that exclude it, and that the beer
      appears, counted, once `make moderate` approves it — and disappears
      again once it removes it
- [ ] The envelope matches §4
- [ ] The web's public cellar page and its Playwright spec are green against
      the new shape
- [ ] `make verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-85 and SHOULD-79,
both `[needs decision]`, settled at refinement on 2026-10-30.

The product owner plans an admin page for moderation in a mid-iteration
(9.5, 10.5 or similar), which would give moderation an application path that
can publish events — the point at which a stored projection becomes the
cheaper option and the read-time exclusion above is worth revisiting.
