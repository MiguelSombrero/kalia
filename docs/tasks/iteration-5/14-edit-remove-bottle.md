# Task 14: Edit and remove a bottle from the cellar

- **Status:** refined
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

## Why

Once bottles exist in the cellar ([task 11](11-cellar-page.md),
[task 13](13-add-bottle-to-cellar.md)), an owner needs to fix a mistake — a
wrong date — or record that a bottle is gone, without deleting and
re-adding it by hand. This is the cellar page's remaining mutation surface.

## Scope

Editing a bottle's container type and dates, and removing a bottle, both
from the cellar page, without a full page reload. The backend side of both
already exists (`PATCH`/`DELETE /api/v1/cellar/bottles/{id}`, built but
unused since [task 02](02-cellar-rest-api.md)), and the generated client
already exposes them — this task is frontend-only.

## Non-goals

- Adding a new bottle — [task 13](13-add-bottle-to-cellar.md).
- Editing beyond the fields task 01 defines — no ratings, no tasting notes.
- Bulk edit or removal across multiple bottles at once.
- A server-side "undelete" — the undo mechanism below never calls one,
  because none exists and this task does not add one.

## Constraints

- **Separate edit dialog, not shared with Add** — product-owner decision,
  2026-08-22. A new `EditBottleDialog`, built on the same
  `components/ui/dialog.tsx` primitive as
  [task 13](13-add-bottle-to-cellar.md)'s `AddBottleDialog`, but its own
  component with its own form — no attempt to unify add and edit into one.
  Prefilled with the bottle's current container type, brewed date and
  best-before date; no quantity field, since it edits one already-existing
  bottle.
- **Container type is editable**, alongside both dates — product-owner
  decision, 2026-08-22. The `PATCH` endpoint always replaces all three
  fields, so the form shows and submits all three rather than silently
  resending an unchanged container type.
- **Cross-field validation matches the add form**: a best-before date at or
  before the brewed date is invalid, same rule as
  [task 13](13-add-bottle-to-cellar.md)'s `addBottleSchema` (already
  enforced by the backend regardless). Reuse or derive from that schema
  rather than re-deriving the rule.
- **Remove uses an undo toast, not an upfront confirmation dialog** —
  product-owner decision, 2026-08-22:
  - Clicking Remove hides the bottle from the cellar page immediately
    (optimistic) and shows a toast with an Undo action, for **~5 seconds**.
  - The real `DELETE` call is **delayed**, not fired immediately: it only
    goes out once the toast's countdown elapses uncancelled. Undo cancels
    the pending call — it never invokes an "undelete" endpoint, matching
    the Non-goals entry above.
  - **One toast at a time.** Clicking Remove on a second bottle while one
    undo toast is already showing finalizes the first removal immediately
    (fires its delayed `DELETE`) before starting a new toast for the
    second.
  - If the removed bottle was its entry's last one, the beer row
    disappears from the cellar list in the same optimistic step (see the
    next bullet), and reappears if Undo is used before the toast elapses.
  - The remove control (icon plus text label, not color alone) and the
    toast (visible text and a keyboard-operable Undo button, not a color
    cue, announced to assistive tech e.g. via `role="status"`/`aria-live`)
    must both be non-color-only — this supersedes this task's original
    "needs a non-color-only confirmation affordance" wording, since remove
    is no longer gated by an upfront confirmation step.
- **A beer's row disappears from the cellar list once it has zero
  bottles** — product-owner decision, 2026-08-22. `listEntries` already
  returns a zero-bottle entry (left join in `EntryRepository`), so this is
  a frontend-side filter (`bottleCount === 0`) in the cellar feature's own
  entries-to-rows mapping, not a backend change.
- **New dependency: `@radix-ui/react-toast@1.2.15`** (product-owner
  confirmed 2026-08-22; peer deps `^19.0` satisfied by this project's React
  19.2.8), for the same reason `dialog.tsx` wraps `@radix-ui/react-dialog`
  rather than being hand-written — an accessible toast's live-region and
  timing contract is easy to get subtly wrong. Built as
  `components/ui/toast.tsx`. This is the second Radix primitive in
  `components/ui/`, which needs a further amendment to
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s existing
  2026-08-22 amendment (the one that admitted the dialog dependency) in
  this task's PR, not a new ADR — an accepted ADR is amended, never
  rewritten. Record the version in `frontend/README.md`'s tech stack
  (CLAUDE.md new-dependencies rule).
- **Hooks**: `useUpdateBottle` and `useRemoveBottle` (mutations) are
  colocated with `useCellarBottles`/`useAddBottle` in `hooks/useBottles.ts`
  per [ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md).
  Both invalidate the same query keys `useAddBottle` already does, so the
  cellar page reflects an edit or a (finalized) removal without a manual
  refetch; the optimistic hide/restore around the undo window is local
  component or query-cache state, not a server round trip.
- Mutations go through TanStack Query
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

- [ ] Editing a bottle's container type and/or dates persists and is
      reflected on the cellar page without a full reload — Playwright
      continues sign in → add → edit → see it updated
- [ ] Removing a bottle hides it immediately and shows an undo toast;
      letting the toast elapse persists the removal on the cellar page
      without a full reload — same Playwright spec, continuing → remove
- [ ] Clicking Undo before the toast elapses restores the bottle, and no
      `DELETE` request ever reaches the backend for it — component test
      with fake timers
- [ ] Removing a beer's last bottle removes its row from the cellar list
      in the same optimistic step, and Undo restores both the bottle and
      its beer row — component test
- [ ] Starting a second removal while one undo toast is showing finalizes
      the first bottle's removal and replaces the toast with one for the
      second — component test
- [ ] The edit dialog, the remove control and the undo toast — including
      its Undo button — pass `axe` with no violations in both locales, and
      are fully keyboard-operable
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Split from [task 03](03-cellar-frontend.md) — see that file's Notes for why.

Refined 2026-08-22. The product owner chose a separate edit dialog over
reusing [task 13](13-add-bottle-to-cellar.md)'s `AddBottleDialog`, made
container type editable alongside the dates (matching the `PATCH`
endpoint's all-fields-replaced contract), and picked an undo toast over an
upfront confirmation dialog for remove — which introduces this task's one
new dependency, `@radix-ui/react-toast`, and a further amendment to
[ADR-0021](../../adr/0021-design-tokens-ui-primitives.md). The undo
decision also settled a real edge case the original task didn't
anticipate: since there is no "undelete" endpoint, undo works by delaying
the `DELETE` call rather than reversing it, and removing an entry's last
bottle interacts with the separately-decided "empty rows disappear" rule —
both are now recorded above rather than left for implementation to guess.
