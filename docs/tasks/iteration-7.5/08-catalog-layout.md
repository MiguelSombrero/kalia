# Task 08: Catalog layout

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-3, DW-4, DW-5

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
**Add to cellar** action on each result — and a beer's details page.

Includes each surface's loading skeleton
(`BeerListSkeleton`, `BeerDetailsSkeleton`), its empty state, and its
not-found page, since [ADR-0022](../../adr/0022-loading-error-empty-states.md)
shape-matches those to the layouts this task changes.

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

## Open questions

1. **Where do five filters go on a phone?** Above the results is what happens
   today, which pushes every result below the fold. Collapsed, in a drawer, or
   reduced to a search box with the rest behind a control, are the usual
   answers, and two of the three make the form interactive — see Constraints.
2. **What is a beer card, and what is on it?** Name, brewery, style, ABV and an
   action today, all at one weight. Which of those a person actually scans by
   decides the hierarchy.
3. **Is a grid right?** Three columns of cards is one answer for a catalog; a
   dense list is another, and it is a better one if scanning many beers
   quickly is the real task.
4. **Does the stretched-link card survive an action button?** It works now.
   Whether it is the right pattern once a card has one interactive child — and
   whether it should have two, once a beer can be added to a cellar from the
   list — is worth deciding rather than inheriting.
5. **What does a beer's detail page do that the card does not?** It shows the
   same five facts plus a description. If that is all it is, it is a page with
   very little on it, and that is a design problem worth naming.
6. **Is there a route back to the search that found a beer?** A visitor who
   filters, pages to result 40, opens a beer and then goes back — what happens
   is currently whatever the browser does.
7. **Where does pagination belong, and what does it say?** At the bottom only,
   today. Whether a reader needs to know how many results there were before
   they start scrolling is a real question for a catalog.

## Acceptance criteria

- [ ] The product owner chose from built alternatives for the results
      presentation and for the filters at phone width
- [ ] Both surfaces — list and details — ship, with the components they share
      changed once rather than diverging
- [ ] Filters still produce a shareable URL and `SearchFilters` is still a
      server component, or the decision to change that is recorded in an ADR
      that supersedes the reasoning in
      [architecture.md §5](../../architecture.md)
- [ ] `BeerListSkeleton` and `BeerDetailsSkeleton` match the layouts that ship,
      with their colocated vitest tests asserting the new shapes
- [ ] The empty state, the beer not-found page and a result set of exactly one
      each render deliberately, covered by tests
- [ ] A card's action is operable by keyboard and does not fight the card's own
      link, covered by a test that drives it with the keyboard alone
- [ ] Both surfaces work at both agreed widths and the
      `@axe-core/playwright` scans pass at both
- [ ] The findings [task 02](02-design-audit-baseline.md) recorded on the
      catalog are each fixed or carry a written decision not to fix them
- [ ] `make verify` is green
