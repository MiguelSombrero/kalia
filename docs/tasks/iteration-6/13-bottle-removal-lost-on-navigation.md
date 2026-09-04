# Task 13: A bottle removal is undone by navigating away

- **Status:** refined
- **Iteration:** [6](../iteration-6.md)

## Why

Removing a bottle from the cellar page ([iteration 5
task 14](../iteration-5/14-edit-remove-bottle.md)) hides the bottle
immediately but delays the real `DELETE /api/v1/cellar/bottles/{id}` until a
~5 second undo window elapses. That pending call lives entirely in the
browser tab: a Zustand store plus a module-level `setTimeout` closure in
[`frontend/features/cellar/store.ts`](../../../frontend/features/cellar/store.ts).
Nothing about it survives leaving the page.

So a full reload, or a client navigation to another route, within those ~5
seconds destroys the timer before it fires. The `DELETE` is never sent and
the removal silently reverts — the bottle is back in the cellar, with no
message. Pressing **Remove** and immediately clicking back to the catalog
leaves the bottle exactly where it was.

The effect is that a removal is currently undone by *three* things: the Undo
button, a swipe-dismiss of the toast, and any navigation or refresh inside
the window. Only the first two were designed. The user asked for a removal
and, from their point of view, nothing happened.

This is live on `dev` and reachable in ordinary use — removing a bottle and
then navigating is a normal sequence, not a corner case. The delayed-`DELETE`
design was chosen in task 14 specifically because there is no server-side
undelete endpoint; that choice is what makes navigation cancel the removal
rather than commit it.

## Scope

Removing a bottle requires an upfront confirmation dialog; confirming
commits the `DELETE` immediately, with no delay and no undo affordance — so
nothing about a removal can be lost to a reload, a client navigation, or a
closed tab, because nothing is ever left pending
([ADR-0053](../../adr/0053-bottle-removal-commits-immediately.md)). This
covers the removal flow's commit timing and its confirmation/feedback UI
across
[`store.ts`](../../../frontend/features/cellar/store.ts),
[`BottleList.tsx`](../../../frontend/features/cellar/BottleList.tsx),
[`UndoRemoveToast.tsx`](../../../frontend/features/cellar/UndoRemoveToast.tsx)
(renamed if its undo-specific name no longer fits) and their tests, plus
`docs/architecture.md`'s cellar/frontend sections where the undo toast is
described.

## Non-goals

- A server-side undelete or soft-delete endpoint. [Task
  14](../iteration-5/14-edit-remove-bottle.md) ruled it out and
  [ADR-0053](../../adr/0053-bottle-removal-commits-immediately.md) does not
  reopen it.
- Re-adding a removed bottle via Undo — dropped. A removed bottle can only
  be re-added through the ordinary Add Bottle flow, which creates a new row
  with a new id and, per [task 06](06-entry-with-no-bottles.md), a fresh
  entry if it was the entry's last bottle.
- Editing or adding a bottle — unaffected.
- Reflecting a removal on the user's *other* devices faster than the existing
  query invalidation already does.

## Constraints

- [Iteration 5 task 14](../iteration-5/14-edit-remove-bottle.md) is the
  origin of the undo design this task replaces; its decisions were recorded
  in that (now frozen) task file's Constraints, not an ADR.
- **The removal model is decided:
  [ADR-0053](../../adr/0053-bottle-removal-commits-immediately.md)**
  (refined 2026-09-04). Remove opens an upfront confirmation dialog, built
  on the existing `components/ui/dialog.tsx` (`@radix-ui/react-dialog`)
  primitive `AddBottleDialog`/`EditBottleDialog` already use — no new
  dependency for the dialog itself. Confirming commits the `DELETE`
  immediately; canceling issues no request and leaves the bottle untouched.
  This resolves the [ADR-0009](../../adr/0009-zustand-ui-state.md) violation
  the original Constraints named: no commit-critical intent is held in
  Zustand or a closure any more.
- **The confirm dialog closes optimistically on confirm; a failed `DELETE`
  is reported by an error toast, and the bottle is restored to the list**
  (refined 2026-09-04) — consistent with how other mutation failures surface
  via the tagged `ApiError` pattern below, and answering the original
  Constraints' requirement that a lost removal must not be silent.
- **`@radix-ui/react-toast` stays a dependency, narrowed to a non-undo
  purpose** (refined 2026-09-04): it still reports removal success, the
  last-bottle "no longer in your cellar" message
  (`cellar.bottle.remove.toastLastBottle`, [task 06](06-entry-with-no-bottles.md)),
  and failure — but carries no `ToastAction`/Undo button and no
  client-owned countdown; Radix's own auto-dismiss timing applies instead of
  the `duration={Infinity}` used to race the undo deadline.
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) is amended (not
  rewritten) in this task's PR to record the narrowed contract — already
  done as part of this refinement, so the implementing PR only needs to
  match the code to what the ADR now says.
- **The "one toast at a time" mechanic falls away rather than carrying
  over** (refined 2026-09-04): since every removal commits independently and
  immediately, there is nothing left to "finalize early" the way a second
  removal used to force-finalize a first pending one. A new toast simply
  replaces whichever one is showing, as a display-only concern.
  `store.ts`'s `finalizing` queue, `startRemoval`, `undoRemoval` and
  `REMOVE_UNDO_DELAY_MS` are removed rather than adapted — there is no
  pending state left for them to manage.
- No server-side undelete exists. `DELETE /api/v1/cellar/bottles/{id}` is the
  only removal primitive.
- Mutations go through the feature-owned hooks
  ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md),
  [ADR-0008](../../adr/0008-tanstack-query.md)); failures surface as a tagged
  `ApiError` ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- Every string translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); design tokens only
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)); WCAG 2.1 AA at
  the three existing layers. `cellar.bottle.remove.undo` and any other
  Undo-only string are dead once the toast drops the action, and must be
  removed rather than left defined-but-unused.

## Open questions

**None.**

## Acceptance criteria

- [ ] Clicking Remove opens a confirmation dialog; confirming commits the
      `DELETE` immediately (not after a delay) — the bottle is gone and
      stays gone across an immediate navigation away and back, and across a
      hard reload — Playwright spec that confirms a removal, then separately
      navigates away and back and hard-reloads, asserting the bottle is
      absent both times; confirmed to fail against today's build, where the
      bottle reappears
- [ ] Canceling the confirmation dialog leaves the bottle untouched and
      issues no `DELETE` — component/integration test
- [ ] If the `DELETE` fails after confirmation, an error toast reports it and
      the bottle is restored to the list — component test with a mocked
      failing mutation
- [ ] The confirmation dialog and the remove control pass `axe` with no
      violations in both locales and are fully keyboard-operable (open,
      confirm, cancel via keyboard) — component test
- [ ] Removing a beer's last bottle still empties its row from the cellar
      list in the same step, and the toast still carries the "no longer in
      your cellar" message — component test
- [ ] No `cellar.bottle.remove.undo` (or other Undo-only) string remains
      defined-but-unused, and `store.ts`'s delayed-dispatch/undo state
      (`startRemoval`, `undoRemoval`, `REMOVE_UNDO_DELAY_MS`, `finalizing`)
      is removed rather than left dead — i18n key check plus lint/build
- [ ] `docs/architecture.md`'s cellar and frontend-accessibility sections and
      the undo descriptions in [iteration 5
      task 14](../iteration-5/14-edit-remove-bottle.md) and [task
      06](06-entry-with-no-bottles.md) are reconciled with the shipped
      behaviour in this PR; `node scripts/check-adrs.mjs` green
- [ ] `make verify` is green

## Notes

Provenance: product-owner bug report, 2026-09-03, in the session on branch
`claude/cellar-bottle-removal-undo-2abea1`. The product owner's direction:
undo should depend **only** on pressing the Undo button, and if that cannot
be implemented, the Undo button should be removed.

Refined 2026-09-04: the delayed-`DELETE`-plus-client-only-undo model was
found unable to satisfy that direction without a mechanism that itself had a
gap (re-add undo loses the original id/entry; unload-time flush is
best-effort; persisting intent doesn't survive a closed tab) — see
[ADR-0053](../../adr/0053-bottle-removal-commits-immediately.md)'s
Alternatives considered for the full comparison. The product owner's stated
fallback — drop Undo, commit immediately — was chosen, gated by an upfront
confirmation dialog rather than a bare immediate action, since removing the
undo safety net without adding one before the action was judged to leave
accidental clicks with no recovery at all.

The client-only timer this task removes was visible in
[`frontend/features/cellar/store.ts`](../../../frontend/features/cellar/store.ts):
`timeoutId` and `scheduled` were module-scoped, and `dispatch` only ran from
the `setTimeout` callback or from a second `startRemoval` finalizing the
first — neither of which happened when the tab was torn down.

Not in the [quality backlog](../quality-backlog.md).
