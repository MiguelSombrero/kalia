# Task 21: The public cellar's response is settled before `/api/v1` freezes

- **Status:** needs-refinement
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

## Open questions

1. **The envelope:** align it with the standard page envelope, or record it as
   a second exception in §4 and the glossary.
2. **The totals:** drop them from the public response, keep a cellar-side
   projection of visible beers fed by catalog events, or over-fetch the way
   the feed does.

## Acceptance criteria

- [ ] An integration test shows a public cellar holding a pending beer
      returns full pages and totals that exclude it, or no totals, as
      refinement decides
- [ ] The envelope matches §4, or §4 and the glossary name it as an exception
- [ ] The web's public cellar page and its Playwright spec are green against
      the new shape
- [ ] `make verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-85 and SHOULD-79,
both `[needs decision]`. The decisions are the two open questions.
