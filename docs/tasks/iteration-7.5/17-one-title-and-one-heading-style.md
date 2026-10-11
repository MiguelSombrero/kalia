# Task 17: A page title and a section heading each have one style

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-3

## Why

[Task 12](12-do-we-need-a-design-system.md)'s inventory
([ADR-0073](../../adr/0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md)
Evidence) found the two type roles every page uses written out by hand, and
found that they had drifted:

- A page title's classes are copied five times, in two features' `layout.ts`
  files and inline in three pages. They are identical today only because each
  author copied the last one.
- The generic error page and not-found page are reachable surfaces whose titles
  still use a size from before the identity, one that is not a token. That is
  short of [DW-3](../iteration-7.5.md#done-when): "none left in the old one".
- Four of the five section headings ignore
  [`docs/design.md`](../../design.md)'s `--text-heading` row, and those four
  were written a week after the row was.

ADR-0073 decided that a recurring look is fixed with a primitive, not with
more documentation. This is the first place that decision applies.

## Scope

Every page title and every section heading in the app takes its style from one
shared place in `components/ui/`, and the hand-written copies are gone. The
error and not-found pages' titles are in the identity. A section heading looks
the way `docs/design.md` says it does, or that row is changed to describe what
ships, with the product owner choosing which.

## Non-goals

- The wording of any heading. Copy is out of scope for the iteration
  ([iteration 7.5](../iteration-7.5.md)).
- The small tracked-capitals label (`--text-label`). The inventory found it
  consistent everywhere.
- Headings inside a component that is not a page or a page section, such as a
  dialog title, which already comes from `DialogTitle`.

## Constraints

- Styling stays inside the semantic token layer
  ([ADR-0066](../../adr/0066-token-only-styling-is-a-build-check.md)).
- A skeleton stays shape-matched to the page it stands in for
  ([ADR-0022](../../adr/0022-loading-error-empty-states.md)). The catalog's
  and cellar's `layout.ts` title constants exist for that reason, so whatever
  replaces them has to serve the skeletons too.
- The heading level a component renders stays the caller's choice. `BeerList`
  already takes a `headingLevel` for that reason.
- At both agreed widths, in both locales, no title overflows its column
  ([`docs/design.md`](../../design.md#typography-across-the-two-locales)).

## Open questions

- **Which way does a section heading go?** Should the four `text-2xl
  font-bold` headings move to `--text-heading` in the display face, as
  `docs/design.md` says, or does the row change to match them? Two cellar ones
  were laid out under [ADR-0070](../../adr/0070-cellar-sortable-beers-beside-their-band-with-bottle-tiles-headed-by-vintage.md),
  so the product owner may want to see both before choosing.
- **A component or a class string?** A `Heading` component that renders the
  element, or an exported class string a caller puts on its own element. The
  second suits the skeletons, which draw a block rather than a heading.
- **Is a check wanted?** ADR-0073 names, without writing, a check that a
  page's `<h1>` or `<h2>` outside `components/ui/` takes the shared style.
  Should this task build it, or is review enough?
- **The error and not-found pages under DW-3.** Does iteration 7.5 count those
  two pages as surfaces DW-3 must cover? `Covers: DW-3` assumes it does. If
  not, this task's titles still change, but it leaves the iteration.

## Acceptance criteria

- [ ] No `app/` or `features/` file outside `components/ui/` writes a page
      title's or a section heading's type classes itself, checked by a grep
      for the old class strings returning nothing (or by the check, if the
      product owner wants one)
- [ ] The shared title and heading style each has a colocated component test
      with a `jest-axe` assertion
- [ ] The error page and the not-found page show their titles in the identity,
      seen in a browser at both agreed widths
- [ ] Every page's title and section headings render as before, apart from the
      ones this task deliberately changes, seen in a browser at both agreed
      widths in both locales
- [ ] `docs/design.md`'s `--text-heading` row describes what ships
- [ ] `make verify` is green

## Notes

Written by [task 12](12-do-we-need-a-design-system.md) on 2026-10-11, at the
product owner's request that the drift its inventory found be scheduled rather
than only recorded.
