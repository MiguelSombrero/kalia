# Task 08: Catalog layout

- **Status:** done
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-3, DW-4, DW-5
- **Kind:** design

## Why

The catalog is the oldest surface in Kalia and the one a visitor with no
account spends the most time in. It was laid out in iteration 1 as a search
form above a grid of cards, and iteration 2 recoloured it. Nothing has looked at
it since the cellar arrived and put an **Add to cellar** control on every card,
which is the point at which a browsing page also became an acting page.

Two things are visibly unresolved. The grid cards carry the beer's name, the
brewery, a style badge, an ABV badge and now an action, and they are stacked in
source order with no visual hierarchy between them — everything is the same
weight. And the whole card is a stretched link to the beer's details, with a
button inside it that has to be lifted above that link with `z-10` to stay
clickable. That works, and it is the kind of thing that works until it doesn't.

The detail page and the filters have never been prototyped at a phone width at
all. The filter form is a native GET form of five inputs
([ADR-0010](../../adr/0010-react-hook-form-zod.md)) — query, style, country,
min and max ABV, plus sort — which is a lot of controls above the content on a
small screen, and pagination sits at the bottom of a grid that can be three
rows or thirty.

## Scope

Both catalog surfaces, prototyped and chosen together because they share
components: the list page — filters, results grid, pagination, and the
**Add to cellar** action on each result — and a beer's details page. Two
small additions ride along, neither needing an API change: a way back from a
beer's details to the exact search that led there, and the number of results
shown before the results.

Includes each surface's loading skeleton
(`BeerListSkeleton`, `BeerDetailsSkeleton`), its empty state, and its
not-found page, since [ADR-0022](../../adr/0022-loading-error-empty-states.md)
shape-matches those to the layouts this task changes.

**Audit findings on these surfaces** ([the audit](audit.md), [DW-5](../iteration-7.5.md)): [AUD-18](audit.md), [AUD-19](audit.md), [AUD-20](audit.md), [AUD-21](audit.md), [AUD-22](audit.md), [AUD-23](audit.md), [AUD-24](audit.md), [AUD-25](audit.md), [AUD-26](audit.md), [AUD-27](audit.md), [AUD-58](audit.md), the catalog's share of [AUD-06](audit.md), [AUD-07](audit.md), [AUD-09](audit.md), [AUD-45](audit.md), [AUD-47](audit.md); keeps [AUD-49](audit.md), [AUD-51](audit.md), [AUD-52](audit.md), [AUD-57](audit.md). [AUD-21](audit.md), [AUD-22](audit.md), [AUD-23](audit.md), [AUD-24](audit.md) are product findings: the task records for each whether it is fixed or becomes a [backlog](../backlog.md) entry.

## Non-goals

- Changing what a search can do. Adding a filter, changing sort options or
  altering pagination size are product and API changes, not layout — and
  [iteration 8](../iteration-8.md) is where the catalog's data source is
  reopened.
- The add-to-cellar *flow* beyond where its control sits. The dialog it opens
  belongs to [task 09](09-cellar-layout.md), which owns the cellar's surfaces.
- Beer imagery as an asset question —
  [task 04](04-imagery-iconography-and-the-mark.md) decides whether a beer has
  a visual stand-in at all. This task lays out whatever that one produces.

## Constraints

- **`SearchFilters` is a server component and must stay one.** It is a native
  GET form that only navigates, which is why it needs no client
  ([architecture.md §5](../../architecture.md),
  [ADR-0010](../../adr/0010-react-hook-form-zod.md)). A layout that makes the
  filters interactive — a drawer, a live-updating result count — turns a server
  component into a client one and reopens a documented decision.
- Filters and pagination live in URL search params, not component state
  ([ADR-0009](../../adr/0009-zustand-ui-state.md)), so a filter UI that does
  not produce a shareable URL is a regression.
- `BeerList`'s `<li>` carries the stretched link, the hover treatment and the
  `focus-within` ring, and `Card` deliberately supplies appearance only —
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) records that a
  primitive swallowing those would trade accessibility for tidiness. A new card
  design inherits that constraint.
- Request parameters are bounded ([ADR-0042](../../adr/0042-bounded-request-parameters.md));
  a layout implying an unbounded page size contradicts the API.
- The shell from [task 06](06-page-shell.md) and the identity from
  [task 03](03-visual-identity.md) are inherited, not re-decided.

- The agreed widths, reserved image shapes and the 24×24 minimum target size
  are iteration-wide decisions recorded in
  [the iteration index](../iteration-7.5.md).

Decided with the product owner in refinement, 2026-10-01:

- **`SearchFilters` may become a client component if the chosen direction
  needs it** — a drawer, a live result count. If it does, this task writes an
  ADR superseding the reasoning in [architecture.md §5](../../architecture.md)
  (acceptance criteria below). Either way the URL stays the state: a filter UI
  that does not produce a shareable URL is still a regression.
- **A beer's details page links back to the search that led there**, carrying
  that search's parameters — filters, sort and page — rather than leaving it to
  the browser's back button.
- **The result count is shown before the results.** The API already returns
  `totalElements`.
- **A beer card carries the image slot
  [task 04](04-imagery-iconography-and-the-mark.md) produced**, filled by its
  generated placeholder. Whether the results are a grid or a dense list, and
  whether the stretched-link card survives its action button, are prototyped
  as directions.

## Open questions

**None.**

## Acceptance criteria

- [x] The product owner chose from built alternatives for the results
      presentation and for the filters at phone width
- [x] Both surfaces — list and details — ship, with the components they share
      changed once rather than diverging
- [x] Filters still produce a shareable URL and `SearchFilters` is still a
      server component, or the decision to change that is recorded in an ADR
      that supersedes the reasoning in
      [architecture.md §5](../../architecture.md)
- [x] `BeerListSkeleton` and `BeerDetailsSkeleton` match the layouts that ship,
      with their colocated vitest tests asserting the new shapes
- [x] The empty state, the beer not-found page and a result set of exactly one
      each render deliberately, covered by tests
- [x] A beer's details page reached from a filtered, paged search links back
      to that same search, covered by a test that asserts the link's
      parameters
- [x] The result count shows before the results and reads correctly in both
      locales for one result and for many, covered by a test
- [x] A card's action is operable by keyboard and does not fight the card's own
      link, covered by a test that drives it with the keyboard alone
- [x] Both surfaces work at both agreed widths and the
      `@axe-core/playwright` scans pass at both
- [x] The findings [task 02](02-design-audit-baseline.md) recorded on the
      catalog are each fixed or carry a written decision not to fix them
- [x] `make verify` is green
