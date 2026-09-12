# Task 06: The page shell every page sits in

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-3, DW-4

## Why

Kalia has no shell. It has a header in `app/[locale]/layout.tsx` and then each
page builds its own container, and the four that exist have converged on
copy-pasting the same class string:

```
mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6 sm:p-8
```

— identically on the cellar, the profile and the public cellar, and with
`max-w-5xl` on the catalog. Nothing shares it and nothing says a fifth page
should match. That is the drift
[ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) set out to stop, in
the one dimension it did not tokenise: layout.

It also carries a bug that is visible on every page. Each `<main>` is
`min-h-screen`, inside a `<body>` that is `min-h-full flex flex-col` with a
header above it. Every page is therefore at least a full viewport tall
*beneath* the header, so every page in Kalia scrolls slightly no matter how
little is on it. The front page compounds it: `min-h-screen` plus
`justify-center` means its content is centred in a box that starts below the
header, so it sits visibly low rather than centred.

The header is the other half. It is an unconstrained flex row that spans the
full window — it does not line up with the content beneath it at any width —
holding a text nav, sign-in status and a locale switcher, with `flex-wrap` as
its entire response to a narrow screen. Kalia has no footer, no favicon, and no
mark in the header at all
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
  behaviour, not styling, and fails silently. Whether one is needed is
  question 3.
- Locale-prefixed URLs ([ADR-0011](../../adr/0011-i18next-localization.md)) and
  the locale-less public cellar
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)) both pass through
  this shell; the public cellar is the one page a stranger reaches first, and
  its header is what they see.
- Whatever this task decides binds five later surfaces, so it lands before
  them — the iteration index states the ordering and why.

## Open questions

1. **Is there a footer, and what is in it?** Kalia has none. A footer is where
   a language switch, a link to a public cellar, and eventually the legal
   surface the [backlog](../backlog.md)'s GDPR entry will need all naturally
   live — and "none" is a defensible answer for a product with three
   destinations.
2. **One container width or several?** The catalog is `max-w-5xl` because it is
   a grid; the cellar and profile are `max-w-3xl` because they are lists.
   That may be right and merely undocumented, or it may be why the app feels
   inconsistent between pages.
3. **What does navigation do on a phone?** Wrapping is what it does today. A
   menu behind a control, a bottom bar, or leaving it wrapped but designed, are
   three different answers with three different accessibility costs.
4. **Does the header carry the mark?** Depends on
   [task 04](04-imagery-iconography-and-the-mark.md), and the two should be
   looked at together rather than in sequence.
5. **Does the header stay put when the page scrolls?** A feed is the first
   thing in Kalia that is long enough for the answer to matter.
6. **Where does sign-in status belong?** It is a text link beside the locale
   switcher today. Once there is a profile and a public cellar, the signed-in
   person has an identity that the header is the usual place to show.
7. **Does the shell become a component, a layout, or a token set?** A React
   component that pages wrap themselves in, `layout.tsx` owning `<main>`
   outright, or a documented set of container classes. The third is closest to
   today and the easiest to drift from again.

## Acceptance criteria

- [ ] The product owner chose from built alternatives — at minimum for the
      header and for the phone-width navigation
- [ ] No page restates the container: a new page gets the shell by using it,
      and the `mx-auto flex min-h-screen max-w-… ` string appears in one place
      rather than four
- [ ] No page is taller than its content requires — the `min-h-screen`-under-a-
      header problem is gone, verified in a browser at both agreed widths
      rather than by reading the classes
- [ ] The skip link still moves focus to the main content, and
      `SiteNav`'s `aria-current="page"` still marks exactly the active
      destination — both covered by the existing vitest tests, updated rather
      than deleted, plus a Playwright assertion that the skip link works in a
      real browser
- [ ] If phone navigation becomes an interactive widget, its focus and
      keyboard behaviour are covered by a `jest-axe` test and an E2E test that
      opens it with the keyboard alone
- [ ] The `@axe-core/playwright` scans pass on every page at both widths
- [ ] The findings [task 02](02-design-audit-baseline.md) recorded against the
      header, footer and page frame are each fixed or carry a written decision
      not to fix them
- [ ] `make verify` is green
