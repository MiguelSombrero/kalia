# Task 06: Give feature packages a public surface

- **Status:** refined
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

A single `index.ts` per feature package (`catalog`, `auth`, `i18n`) naming a
deliberately trimmed public surface — what an external consumer genuinely
depends on, not every path any outside file happens to reach into today
(see Constraints for the per-feature list). Existing external call sites
(`app/`, and `lib/auth/refreshAccessToken.ts` for `auth`) updated to import
from the feature root instead of internal files; a lint rule forbidding
imports into a feature's internals from outside it. `BeerListSkeleton` and
`BeerDetailsSkeleton` move out of `features/catalog` entirely, into their
route folders under `app/`, since their only consumer is their route's
`loading.tsx` (see Constraints).

## Non-goals

- Restructuring what lives inside a feature package, beyond the
  loading-skeleton move this task's own trimming decision requires (see
  Constraints) — no other observed problem this would fix.
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
- **Trim, don't mechanically re-export** — product-owner decision,
  2026-08-15. Each `index.ts` exports only what a genuine external consumer
  needs today, decided per symbol against the current import graph rather
  than re-exporting every path any outside file happens to reach into. Per
  feature, that means:
  - `catalog`: `BeerList`, `Pagination`, `SearchFilters`, `BeerDetailsCard`,
    `api` (`searchBeers`, `getBeer`), `types` (`BeerSearchParams`).
  - `auth`: `AuthStatus`, `actions`, `endSessionUrl` — the last two are
    consumed by `lib/auth/refreshAccessToken.ts`, not `app/`, so the barrel's
    external consumers are not limited to `app/`.
  - `i18n`: `LocaleSwitcher` (its only export today).
- **`BeerListSkeleton`/`BeerDetailsSkeleton` move out of `features/catalog`**
  — product-owner decision, 2026-08-15. Their only consumer is their own
  route's `loading.tsx` (a Next.js convention file, sibling to `page.tsx`),
  not a cross-feature dependency, so they are not a feature concern at all:
  relocate `BeerListSkeleton.tsx` (+ its colocated test) into
  `app/[locale]/beers/`, and `BeerDetailsSkeleton.tsx` (+ its colocated test)
  into `app/[locale]/beers/[id]/`. Each `loading.tsx` then imports its
  skeleton from that route-local file — no barrel export, no lint exception
  needed. Neither belongs in the `index.ts` list above.
- **Land now, on `catalog`/`auth`/`i18n` alone** — product-owner decision,
  2026-08-15. Does not wait for `cellar` or [task 13](13-add-bottle-to-cellar.md).
  If task 05's lint enforcement has not landed by the time task 13 needs the
  catalog→cellar boundary, task 13's own constraints already name the
  documented-gap fallback.

## Open questions

**None.**

## Acceptance criteria

- [ ] Each of `features/catalog`, `features/auth`, `features/i18n` has an
      `index.ts` naming its trimmed public surface (per Constraints), and
      every external call site — `app/`, plus
      `lib/auth/refreshAccessToken.ts` for `auth` — imports only from the
      feature root — verified by `npm run build` and a search confirming no
      deep import path into a feature remains outside it
- [ ] `BeerListSkeleton.tsx` and `BeerDetailsSkeleton.tsx`, with their
      colocated tests, are relocated from `features/catalog` into
      `app/[locale]/beers/` and `app/[locale]/beers/[id]/` respectively, and
      each route's `loading.tsx` imports its skeleton from that new
      route-local path — verified by `npm run build` and `npm test`
- [ ] A deep import added temporarily (e.g. `app/` importing
      `features/catalog/BeerList` directly rather than through the barrel) is
      confirmed to fail lint if task 05's enforcement has landed, or is
      recorded as a known gap in Notes if it has not
- [ ] `npm test` passes — colocated tests import their sibling file directly
      by relative path, so the `BeerListSkeleton`/`BeerDetailsSkeleton` tests
      need no content changes from their move, only their new location; this
      criterion confirms nothing else broke
- [ ] `frontend/README.md`'s Structure section states the public-surface rule
      with a link to this task's outcome

## Notes

Surfaced by a frontend-modularity review the product owner requested
(2026-08-07). Refined 2026-08-15: trimmed-surface approach chosen over
mechanical re-export, `BeerListSkeleton`/`BeerDetailsSkeleton` moved out of
the feature package into their routes, and the task lands ahead of `cellar`
rather than alongside task 13.
