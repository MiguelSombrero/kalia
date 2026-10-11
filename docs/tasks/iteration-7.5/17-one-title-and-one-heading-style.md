# Task 17: A page title and a section heading each have one style

- **Status:** refined
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

Every page title and every section heading in the app is rendered by one of
two components in `components/ui/`, `PageTitle` and `SectionHeading`, and the
hand-written copies are gone. The error and not-found pages' titles are in the
identity. The four `text-2xl font-bold` section headings move to the display
face, as `docs/design.md` already says. A build check fails any `<h1>` or
`<h2>` written by hand outside `components/ui/`, so the next copy cannot land.

## Non-goals

- The wording of any heading. Copy is out of scope for the iteration
  ([iteration 7.5](../iteration-7.5.md)).
- The `--text-label` token itself. The inventory found it consistent
  everywhere; what this task adds is only that a section heading set in it
  comes from `SectionHeading`.
- Headings inside a component that is not a page or a page section, such as a
  dialog title, which already comes from `DialogTitle`.
- A beer's name as the heading of its own row: the cellar's per-beer `h2` and
  the catalog list's `h2`/`h3`. That is a third role, neither page nor
  section, and stays as written.
- The front page's empty feed line (`text-2xl font-bold` on a `<p>`). It is a
  message inside the rack [ADR-0068](../../adr/0068-front-page-one-column-cellar-or-pitch-above-a-ruled-feed.md)
  chose, not a heading.
- Rebuilding the empty states and sign-in prompts that four of the headings
  sit in. [Task 18](18-empty-states-and-sign-in-prompts-as-primitives.md) does
  that next, on top of `SectionHeading`.

## Constraints

- Styling stays inside the semantic token layer
  ([ADR-0066](../../adr/0066-token-only-styling-is-a-build-check.md)).
- `components/ui/` imports from `lib/` only (`frontend/eslint.config.mjs`).
- A skeleton stays shape-matched to the page it stands in for
  ([ADR-0022](../../adr/0022-loading-error-empty-states.md)). No skeleton
  imports `catalogTitle` or `cellarTitle` today; each draws its title block at
  hand-picked heights matched to the title's sizes. `PageTitle` keeps those
  sizes, so the skeletons stay matched without changing. The `layout.ts`
  comments that say the title constants serve the skeletons go with the
  constants.
- The heading level a component renders stays the caller's choice. `BeerList`
  already takes a `headingLevel` for that reason.
- At both agreed widths, in both locales, no title overflows its column
  ([`docs/design.md`](../../design.md#typography-across-the-two-locales)).

Decided in refinement on 2026-10-11:

- **Components, not class strings.** `PageTitle` always renders an `h1`;
  `SectionHeading` renders the level its caller passes. A class string was
  rejected because nothing then stops the classes being written by hand again,
  and the skeletons, which were the case for one, do not use the title
  classes.
- **`PageTitle` has two sizes.** The default is today's page title
  (`--text-title`, `--text-display` from `md`). `name` is the profile's own
  `h1`, the username at `--text-name`, rendered exactly as it is today. The
  signed-in front page's visually hidden `h1` comes from `PageTitle` too.
- **`SectionHeading` has two looks.** `heading` is `--text-heading` in the
  display face, as `docs/design.md` says. The four `text-2xl font-bold`
  headings (`CellarView`, `PublicCellarView`, both `SignInPrompt`s) move to
  it; this is the one deliberate visual change, and the product owner chose it
  over rewriting the row. `label` is the small tracked capitals the front
  page's two section `h2`s, a beer's "same style" `h2` and the cellar summary's
  `h2` already wear, and renders exactly as today. `docs/design.md`'s
  `--text-heading` row is amended to say a section is headed in one look or
  the other, and when each is used.
- **The error and not-found pages count under DW-3.** DW-3 names "every
  surface a visitor can reach", and the list after it is examples. A private
  public cellar renders the generic not-found page
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)).
- **A build check enforces it.** ADR-0073's evidence is that the rule the
  build checked held and the documented one did not. A `scripts/` check, with
  a fixture self-test, fails a literal `<h1>` or `<h2>` element in
  `frontend/app/` or `frontend/features/` outside `components/ui/`. An
  allowlist names each exception with its reason; the beer-name headings above
  are the expected entries. It runs in `make verify` and as a CI job, as
  `scripts/check-token-styling.mjs` does. ADR-0073's "nothing checks the rule"
  consequence is amended to point at it
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).

## Open questions

**None.**

## Acceptance criteria

- [ ] Every page title in the app renders through `PageTitle` and every section
      heading through `SectionHeading`; `catalogTitle`, `cellarTitle` and
      `nameTagName` are gone, and a grep for `text-3xl` and `text-2xl` on a
      heading in `app/` and `features/` returns nothing
- [ ] The heading check fails its fixtures for a hand-written `<h1>` and `<h2>`,
      passes on the repository, and runs in `make verify` and CI
- [ ] `PageTitle` and `SectionHeading` each have a colocated component test
      covering every size or look and, for `SectionHeading`, the level the
      caller passes, with a `jest-axe` assertion
- [ ] The error page and the not-found page show their titles in the identity,
      seen in a browser at both agreed widths
- [ ] The four section headings that moved show in the display face, and every
      other page title and section heading renders as before, seen in a
      browser at both agreed widths in both locales
- [ ] [Task 13](13-accessibility-and-contrast-reverified.md)'s Playwright
      accessibility scans and heading-structure test pass against the changed
      pages
- [ ] `docs/design.md`'s `--text-heading` row describes both looks a section
      heading takes, and ADR-0073 is amended to name the check
- [ ] `make verify` is green

## Notes

Written by [task 12](12-do-we-need-a-design-system.md) on 2026-10-11, at the
product owner's request that the drift its inventory found be scheduled rather
than only recorded. Refined on 2026-10-11 together with
[task 18](18-empty-states-and-sign-in-prompts-as-primitives.md), because all
four drifting headings sit in the empty states and sign-in prompts that task
rebuilds.
