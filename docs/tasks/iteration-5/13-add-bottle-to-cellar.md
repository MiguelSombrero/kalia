# Task 13: Add a bottle to the cellar from the catalog

- **Status:** done
- **Iteration:** [5](../iteration-5.md)
- **Covers:** DW-1

## Why

With [task 11](11-cellar-page.md) there is somewhere to see a cellar, but
no way to put anything in it short of calling the API directly. Catalog and
cellar are separate frontend feature packages that may not import each other
([task 05](05-enforce-frontend-module-boundaries.md),
[task 06](06-feature-public-surfaces.md), both landed) — the add-to-cellar
affordance is where `app/` first has to compose across that boundary, and
also where the app's first stateful form (bottle dates, via react-hook-form
+ Zod) and first dialog get built.

## Scope

An "Add to cellar" button on the beer list card and the beer detail page,
opening the same dialog: container type, brewed date, best-before date, and
a quantity (so several bottles of the same beer, sharing one set of dates,
can be added in one submission). Submitting adds the bottle(s) to the
signed-in user's cellar without a full page reload. Both locales,
loading/error states for the mutation.

The existing REST API (`POST /api/v1/cellar/bottles`,
[task 02](02-cellar-rest-api.md)) only adds one bottle per call, with no
quantity field — the quantity affordance needs a small backend extension
alongside the frontend work (see Constraints), even though this task was
originally scoped frontend-only.

## Non-goals

- The cellar page that shows the result — [task 11](11-cellar-page.md).
- Editing or removing an existing bottle, and whether that reuses this
  task's form/dialog — [task 14](14-edit-remove-bottle.md)'s own open
  question.
- Making a cellar public, or viewing anyone else's —
  [iteration 6](../iteration-6.md).

## Constraints

- **Composition, not a cross-feature import** — product-owner decision,
  2026-08-22. `catalog` and `cellar` never import each other; the boundary
  is enforced by `eslint-plugin-boundaries`
  ([ADR-0012](../../adr/0012-orval-api-client.md), landed via
  [task 05](05-enforce-frontend-module-boundaries.md)). `BeerList` gains a
  per-beer render-prop slot and `BeerDetailsCard` gains an `actions?:
  ReactNode` slot; `app/[locale]/beers/page.tsx` and
  `app/[locale]/beers/[id]/page.tsx` fill each slot with cellar's trigger
  component, imported through `features/cellar`'s public surface
  ([task 06](06-feature-public-surfaces.md)). Catalog's own components
  never reference `cellar`.
- **One dialog, reused as-is on both pages** — product-owner decision,
  2026-08-22. No inline form, no dedicated route. Built as
  `components/ui/dialog.tsx` on **`@radix-ui/react-dialog@1.1.23`** (new
  dependency, product-owner confirmed 2026-08-22; peer deps `^19.0`
  satisfied by this project's React 19.2.8) for the accessible primitives
  (focus trap, `Escape` to close, `aria-modal`, focus restore to the
  trigger on close) — record the version in `frontend/README.md`'s tech
  stack (CLAUDE.md new-dependencies rule).
- **Form fields** — product-owner decision, 2026-08-22: container type
  (required select, default `bottle`), brewed date (optional), best-before
  date (optional), quantity (integer stepper with visible +/− buttons,
  default 1, bounded 1–24 — a case of beer, a generous natural ceiling for
  one submission). The only required field is container type; both dates
  stay optional to match their nullability in the domain
  ([task 01](01-cellar-module-and-schema.md)). "Invalid" in the acceptance
  criteria below means the cross-field rule (a best-before date at or
  before the brewed date, already enforced by the backend) or a quantity
  outside 1–24 — never a missing date.
- **Backend: extend the existing endpoint rather than add a new one** —
  product-owner decision, 2026-08-22. `AddBottleRequestDto` gains an
  optional `quantity` (`@Min(1)`/`@Max(24)`, default 1), and
  `CellarController.addBottle` always calls the existing
  `CellarService.addBottles(...)` application-layer method (unused since
  [task 01](01-cellar-module-and-schema.md), which built it but never wired
  it to an endpoint). The response changes from one `BottleDto` to a
  `List<BottleDto>` — a safe shape change because this task is the
  endpoint's first real consumer; nothing depends on the single-object
  response today. Regenerate the OpenAPI client
  (`npm run generate:api`); `api-client-drift` CI must pass
  ([ADR-0012](../../adr/0012-orval-api-client.md)). `docs/architecture.md`
  §4's endpoint doc is updated in this task's PR to match (doc-sync gate).
  `mvn verify` and the backend's existing `*IT` conventions apply to the
  changed endpoint the same as any other.
- **Signed-out visitor** — product-owner decision, 2026-08-22: the button
  is always visible on the public catalog pages (matches
  [task 12](12-cellar-navigation.md)'s precedent of never hiding the
  Cellar destination based on auth state); clicking it while signed out
  starts sign-in (same pattern as `startCellarSignIn`) and returns the
  visitor to the same beer afterward, rather than opening the dialog.
- **Hooks**: `useAddBottle` (mutation) is colocated with
  `useCellarBottles` in the same resource module per
  [ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md), which
  named this the trigger to do the pending rename
  (`useCellarBottles.ts` → a resource-shaped name, e.g. `useBottles.ts`).
  Its `onSuccess` invalidates the query keys `useCellarBottles`/the entries
  list read from, so the cellar page reflects the add without a manual
  refetch.
- react-hook-form + Zod for the form — first use of either in the app
  ([ADR-0010](../../adr/0010-react-hook-form-zod.md)).
- Mutation goes through TanStack Query
  ([ADR-0008](../../adr/0008-tanstack-query.md)) and the cellar feature's
  own `api.ts` wrapper over the generated client
  ([ADR-0012](../../adr/0012-orval-api-client.md)); failures surface as a
  tagged `ApiError` ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); no hardcoded copy.
- Design tokens only — semantic layer, never raw primitives
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)).
- WCAG 2.1 AA, enforced at the three existing layers rather than a new gate.

## Open questions

**None.**

## Acceptance criteria

- [x] Adding a bottle from the beer list card and from the beer detail page
      both put it in the cellar without a full page reload, and the cellar
      list reflects it — Playwright covers sign in → add from the list →
      add from the detail page → see both in the cellar
- [x] Submitting a quantity greater than 1 creates that many independent
      bottles sharing the same dates and container type, and the cellar's
      derived bottle count reflects all of them — component test, extending
      the quantity = 1 case
- [x] A quantity outside 1–24, or a best-before date at or before the
      brewed date, is rejected with an inline error before submission —
      component test
- [x] A signed-out visitor clicking "Add to cellar" is sent through
      sign-in and returns to the same beer, rather than seeing the dialog —
      component test
- [x] The button and its dialog — open, filled, and error states — pass
      `axe` with no violations in both locales, and are fully
      keyboard-operable: open, tab through every field, `Escape` closes,
      focus returns to the trigger
- [x] `POST /api/v1/cellar/bottles` accepts `quantity`, creates that many
      bottles in one call, and returns them all — integration test,
      extending task 02's existing single-bottle test
- [x] The generated OpenAPI client is regenerated and committed; the
      `api-client-drift` CI job passes
- [x] `npm test`, `npm run lint`, `npm run build` and `mvn verify` are all
      green

## Notes

Split from [task 03](03-cellar-frontend.md) — see that file's Notes for why.

Refined 2026-08-22. Two prerequisite tasks landed since this task was
written — [task 05](05-enforce-frontend-module-boundaries.md) (module
boundaries) and [task 06](06-feature-public-surfaces.md) (public
surfaces) — settling this task's original second open question: the
catalog↔cellar boundary is enforced already, and composition happens in
`app/` via a slot prop, never a feature-to-feature import. The quantity
affordance (product owner's addition during refinement) surfaced that
[task 02](02-cellar-rest-api.md)'s REST API has no bulk-add endpoint, even
though the application layer has carried an unused `addBottles(quantity,
...)` method since [task 01](01-cellar-module-and-schema.md) — this task's
Constraints record the decision to extend the existing endpoint rather than
add a second one or loop client-side calls.
