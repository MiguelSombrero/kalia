# Task 06: Give feature packages a public surface

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)

## Why

No feature package has a public surface today. There are no `index.ts`
barrels anywhere in hand-written code, so every consumer deep-imports a
feature's internals — `app/[locale]/beers/page.tsx` pulls five separate paths
out of `features/catalog/`. Nothing distinguishes "other code may depend on
this" from "this is an implementation detail," so nothing inside a feature can
be changed without checking every call site across the app by hand. This
turns from a tidiness concern into real risk once `cellar` exists as the
second feature package and `app/` needs to compose across both, per the
`app/`-composes direction already set for
[task 13](13-add-bottle-to-cellar.md)'s cross-feature dependency.

## Scope

A single `index.ts` per feature package (`catalog`, `auth`, `i18n`) naming its
public exports; existing `app/` call sites updated to import from the feature
root instead of its internal files; a lint rule forbidding imports into a
feature's internals from outside it.

## Non-goals

- Restructuring what lives inside a feature package — no observed problem
  this would fix.
- Choosing the `catalog`/`cellar` composition contract itself — that is
  [task 13](13-add-bottle-to-cellar.md)'s open question; this task only makes
  the mechanism available for it to use.
- The rest of the frontend's module-boundary enforcement (feature-to-feature,
  generated-client imports) — [task 05](05-enforce-frontend-module-boundaries.md).

## Constraints

- The deep-import lint rule is easiest added alongside
  [task 05](05-enforce-frontend-module-boundaries.md)'s boundary-enforcement
  config rather than as a second, separate ESLint change. If task 05 has not
  landed yet, this task still ships the `index.ts` files and records the
  missing enforcement as a gap rather than blocking on it.
- `frontend/README.md`'s "Feature-based packages" bullet must state the
  public-surface rule once this exists (doc-sync gate).

## Open questions

1. Should each `index.ts` re-export everything currently imported from
   outside the feature (mechanical, low-risk), or is this the moment to trim
   each feature's actual public surface to what `app/` genuinely needs — for
   example, are `BeerListSkeleton`/`BeerDetailsSkeleton` meant to be public,
   or only reachable from their route's `loading.tsx`? The second is more
   valuable but touches more call sites and needs the product owner's read on
   what is public by intent versus by accident.
2. Should this land ahead of `cellar` existing (on `catalog`/`auth`/`i18n`
   alone), or would the product owner rather see the pattern proven with two
   feature packages at once, as part of
   [task 13](13-add-bottle-to-cellar.md)?

## Acceptance criteria

- [ ] Each of `features/catalog`, `features/auth`, `features/i18n` has an
      `index.ts` naming its public exports, and every `app/` call site imports
      only from the feature root — verified by `npm run build` and a search
      confirming no deep import path remains in `app/`
- [ ] A deep import added temporarily (e.g. `app/` importing
      `features/catalog/BeerList` directly rather than through the barrel) is
      confirmed to fail lint if task 05's enforcement has landed, or is
      recorded as a known gap in Notes if it has not
- [ ] `npm test` passes unchanged — colocated tests import their sibling file
      directly and are not expected to need updating, but this confirms none
      broke
- [ ] `frontend/README.md`'s Structure section states the public-surface rule
      with a link to this task's outcome

## Notes

Surfaced by a frontend-modularity review the product owner requested
(2026-08-07).
