# Task 06: The page shell every page sits in

- **Status:** done
- **Iteration:** [7.5](../iteration-7.5.md)
- **PR:** #316
- **Covers:** DW-3, DW-4
- **Kind:** design

## Why

Kalia has no shell. It has a header in `app/[locale]/layout.tsx` and then each
page builds its own container, and most of them have converged on
copy-pasting the same class string:

```
mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6 sm:p-8
```

— identically on the cellar, the profile, the public cellar and a beer's
details, near-identically on the front page, with `max-w-5xl` on the catalog
and `max-w-md` on sign-up. Nothing shares it and nothing says the next page
should match. That is the drift
[ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) set out to stop, in
the one dimension it did not tokenise: layout.

It also carries a bug that is visible on every page. Each `<main>` is
`min-h-screen`, inside a `<body>` that is `min-h-full flex flex-col` with a
header above it. Every page is therefore at least a full viewport tall
*beneath* the header, so every page in Kalia scrolls slightly no matter how
little is on it.

The header is the other half. It is an unconstrained flex row that spans the
full window — it does not line up with the content beneath it at any width —
holding a text nav, sign-in status and a locale switcher, with `flex-wrap` as
its entire response to a narrow screen. Kalia has no footer, a favicon that is
still the Next.js default, and no mark in the header at all
([task 04](04-imagery-iconography-and-the-mark.md)).

## Scope

The frame every page sits in, prototyped and chosen: header and its behaviour
at phone width, navigation, whether there is a footer and what is in it, the
content container's width and rhythm, and where that frame lives so that a page
inherits it instead of restating it.

Includes the shell's own accountable details — the skip link
(`app/[locale]/layout.tsx`), the `#main-content` target, the locale switcher and
the sign-in status — and the `<html>`/`<body>` height rules the `min-h-screen`
problem above lives in.

**Audit findings on this surface** ([the audit](audit.md), [DW-5](../iteration-7.5.md)): problems [AUD-01](audit.md), [AUD-02](audit.md), [AUD-03](audit.md), [AUD-04](audit.md), [AUD-05](audit.md), [AUD-10](audit.md), [AUD-11](audit.md), [AUD-12](audit.md), [AUD-13](audit.md), [AUD-45](audit.md), [AUD-46](audit.md), [AUD-48](audit.md), and the shell's share of [AUD-06](audit.md) (header targets), and cross-page [AUD-07](audit.md), [AUD-08](audit.md), [AUD-09](audit.md) where they are decided here; keeps [AUD-49](audit.md), [AUD-50](audit.md).

## Non-goals

- What goes inside any page. [Tasks 07](07-front-page-layout.md)–[10](10-profile-and-sign-up-layout.md)
  own that and inherit this.
- The navigation's *contents* as a product question — whether Kalia should have
  more or fewer destinations than Home, Catalog and Cellar. Adding a
  destination is a product decision; how the existing ones are presented is
  this task.
- The Keycloak pages, which have no Kalia shell and cannot have one —
  [task 11](11-keycloak-pages-carry-the-identity.md).

## Constraints

- **The skip link and `#main-content` target must survive.** The comment in
  `app/[locale]/layout.tsx` explains why the wrapper is a plain `<div>` and not
  a `<main>` — every page renders its own `<main>` — and WCAG technique SCR28
  is the reason the target is focusable. A shell refactor that moves `<main>`
  into the layout has to move that reasoning with it, not lose it.
- Navigation is a client component (`SiteNav`) because it reads `usePathname()`
  for `aria-current`. Whatever replaces it keeps `aria-current="page"` and the
  exact-match rule its test pins.
- A phone-width navigation pattern that hides destinations behind a control is
  a new interactive widget, and
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s two dependency
  exceptions were both granted for exactly this reason: focus management is
  behaviour, not styling, and fails silently. Whether one is needed is the
  chosen direction's call (below).
- Locale-prefixed URLs ([ADR-0011](../../adr/0011-i18next-localization.md)) and
  the locale-less public cellar
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)) both pass through
  this shell; the public cellar is the one page a stranger reaches first, and
  its header is what they see.
- Whatever this task decides binds five later surfaces, so it lands before
  them — the iteration index states the ordering and why.

- The agreed widths and the 24×24 minimum target size are iteration-wide
  decisions recorded in [the iteration index](../iteration-7.5.md).

Decided with the product owner in refinement, 2026-10-01:

- **The shell is a `Page` component** that each page wraps itself in. It
  renders `<main id="main-content">` and the content container, and takes a
  width variant, so that the catalog's wider grid is an explicit choice rather
  than a different class string. The skip-link reasoning now in
  `app/[locale]/layout.tsx` moves into that component with it. A layout that
  owns `<main>` outright, and a documented set of container classes, were the
  rejected alternatives, which this task's ADR records.
- **Phone navigation may be a real widget** if the chosen direction hides
  destinations behind a control. A new Radix primitive is allowed if the
  design needs one. Its version is a question for the product owner when it
  is chosen, not researched (`CLAUDE.md` "ask, don't research"), and
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) is amended for it
  the way its two earlier behaviour exceptions were.
- **The header carries the mark in whichever form
  [task 04](04-imagery-iconography-and-the-mark.md) produced.** That task lands
  first. A header that needs a form task 04 did not make goes back to the
  product owner as a finding rather than being drawn here unasked.
- **A footer, if one is chosen, holds only what already exists** — the locale
  switch, links to existing destinations. It creates no new page, legal or
  otherwise.
- Whether the header stays put on scroll, and where sign-in status and the
  signed-in person's identity sit, are prototyped as directions rather than
  decided in advance.

## Open questions

**None.**

## Acceptance criteria

- [x] The product owner chose from built alternatives — at minimum for the
      header and for the phone-width navigation
- [x] No page restates the container: every page renders through the `Page`
      component, and the `mx-auto flex min-h-screen max-w-…` string appears in
      one place rather than seven
- [x] No page is taller than its content requires — the `min-h-screen`-under-a-
      header problem is gone, verified in a browser at both agreed widths
      rather than by reading the classes
- [x] The skip link still moves focus to the main content, and
      `SiteNav`'s `aria-current="page"` still marks exactly the active
      destination — both covered by the existing vitest tests, updated rather
      than deleted, plus a Playwright assertion that the skip link works in a
      real browser
- [x] If phone navigation becomes an interactive widget, its focus and
      keyboard behaviour are covered by a `jest-axe` test and an E2E test that
      opens it with the keyboard alone, and any new dependency's version is
      pinned in `frontend/package.json` only
- [x] Every interactive element in the shell is at least 24×24 CSS pixels at
      both agreed widths, asserted by a test
- [x] The `@axe-core/playwright` scans pass on every page at both widths
- [x] The findings [task 02](02-design-audit-baseline.md) recorded against the
      header, footer and page frame are each fixed or carry a written decision
      not to fix them
- [x] [`docs/design.md`](../../design.md)'s *Layout principles* section holds
      the principles the shell establishes for every page — and only those; a
      rule for one page stays in that page's task and ADR
- [x] `make verify` is green
