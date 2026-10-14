# Task 10: Cellar reads arrive joined with their beers, from the backend

- **Status:** needs-refinement
- **Iteration:** [8](../iteration-8.md)

## Why

**Every client has to rebuild the cellar for itself.** The cellar endpoints
return entries that carry only a `beerId`, so `features/cellar/api.ts` joins
them to the catalog, drops entries whose beer no longer resolves, re-filters
empty entries, and sorts (`:15-32`, `:126-162`). From iteration 9, mobile is
the primary UI, and iteration 12 adds an offline cellar
(`docs/roadmap.md:27-31`), so each of them would re-implement that join. The
backend `cellar` module already depends on `catalog` through `CatalogApi`,
whose `getBeerSummaries` serves `feed`'s server-side join of the same data.

Three more findings exist only because the join sits in the frontend:

- **The anonymous public cellar fans out to N requests.** It makes one
  `getBeer` call per entry in an unbounded `Promise.all` (`:126-162`), while
  the owner's cellar already uses the chunked batch lookup (`:63-89`). One
  page view from a signed-out visitor becomes N backend calls. Iteration-6
  tasks 09 and 14 each set this aside as "a separate task" that was never
  written.
- **"No empty entry" is checked in four places that disagree.**
  `CellarService.listEntries` filters out empty entries, `readPublicCellar`
  does not, and the frontend filters again at `api.ts:30`, `:44` and `:131`,
  under a comment about a "left join" query that no longer exists. The row
  mapping is also duplicated between `toRow` and `toPublicCellarBeer`.
- **`features/cellar` imports the catalog's generated client.** It is allowed
  only because `eslint.config.mjs:150-153` lets any feature's `api.ts` import
  the whole generated client. `docs/architecture.md:387-391` calls those
  boundaries "enforced rather than agreed", and the import shows they are not.

(Quality backlog SHOULD-35, SHOULD-34, COULD-31 and SHOULD-15.)

## Scope

The owner's cellar and a public cellar each come from one backend call, with
every entry already carrying the beer facts the UI shows. The frontend's
cellar feature then no longer reads the catalog to build a cellar, and the
empty-entry rule holds in one place.

## Non-goals

- What should happen to an entry whose catalog beer disappears. That is
  quality backlog SHOULD-16, still `[needs decision]`. This task keeps today's
  behaviour (the entry is not shown), only moved server-side, and logged so it
  is no longer silent.
- Where the public-cellar visibility check lives — quality backlog SHOULD-45.
- `heldBottlesByBeer`, the catalog page's cellar marker. It deliberately skips
  the beer lookup and stays as it is.
- The front page and profile counting bottles through the full cellar read —
  quality backlog COULD-35.

## Constraints

**Decided 2026-10-14** (product owner, when lifting from the quality backlog):
**the backend returns the joined cellar**, through `CatalogApi`, as `feed`
does. Keeping the join in the frontend and only batching the public read was
considered and rejected, because every iteration-9+ client would inherit it.

- This reverses where the "client-agnostic resources" reading
  (`docs/architecture.md:349-355`) put the join, with a credible alternative
  rejected and a reason the code cannot hold. It earns an ADR
  ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)).
- `cellar` reaches `catalog` only through `CatalogApi`, never its domain or
  repositories ([ADR-0007](../../adr/0007-backend-package-structure.md),
  `ModularityTest`). `CatalogApi`'s batch cap applies; see
  [task 07](07-front-page-feed-reaches-public-lines.md) question 3 for whether
  it chunks.
- Responses are DTOs, never entities (`HttpBoundaryTest`), and the generated
  client is regenerated, never hand-edited
  ([ADR-0012](../../adr/0012-orval-api-client.md)).
- The cellar UI's user-chosen sort
  ([ADR-0070](../../adr/0070-cellar-sortable-beers-beside-their-band-with-bottle-tiles-headed-by-vintage.md))
  keeps working.
- The public cellar response is anonymous and must expose nothing about a beer
  or a bottle that the current public page does not already show.

## Open questions

1. **Which beer facts does an entry carry?** Exactly what the cellar UI shows
   today, or the full `BeerSummary` that `feed` uses?
2. **Does the backend own the default order, or only the join?** A server
   order every client shares is consistent; a client-side sort is what lets a
   UI re-sort without a round trip.
3. **Is this one contract change or two?** Owner and public responses could
   share an entry shape or stay separate. They differ today
   (`EntryDto` versus `PublicCellarEntryDto`).
4. **What does narrowing the frontend boundary rule look like once
   `features/cellar` no longer needs the catalog's client?** Restricting each
   feature to its own generated tag is the option SHOULD-15 named, and it
   would turn this import from allowed into a lint error.

## Acceptance criteria

- [ ] The owner's cellar and a public cellar each return entries carrying
      their beer's facts in one response — integration tests, against a real
      database
- [ ] A public cellar page view makes one backend call regardless of how many
      beers it holds — test in the frontend suite, confirmed to fail against
      today's per-entry `getBeer`
- [ ] Neither cellar response ever contains an entry with no bottles —
      integration test covering both the owner and the public read
- [ ] An entry whose beer no longer resolves is left out and logged —
      integration test
- [ ] `features/cellar` no longer imports the catalog's generated client, and
      the lint rule decided in question 4 would reject that import —
      lint fixture or ESLint test
- [ ] The own and public cellar pages render as before at both agreed widths,
      in a browser — the existing Playwright specs pass
- [ ] An ADR records where the join lives and why; `docs/architecture.md`
      describes the new shape
- [ ] `mvn clean verify`, `npm test` and `npm run test:e2e` are green; the
      `api-client-drift` job passes

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-35, SHOULD-34,
COULD-31 and SHOULD-15, all confirmed 2026-10-14. SHOULD-35's
`[needs decision]` was settled while lifting it. Moving the join dissolves
SHOULD-15 rather than choosing among its three paths, which is why it is
merged here instead of being decided separately.
