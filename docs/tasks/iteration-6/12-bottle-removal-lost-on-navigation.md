# Task 12: A bottle removal is undone by navigating away

- **Status:** needs-refinement
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

Whether a bottle removal survives the user leaving the cellar page must
depend **only** on whether they invoked Undo — not on a reload, a client
navigation, or a closed tab. This covers the removal flow's commit timing
and the undo affordance across
[`store.ts`](../../../frontend/features/cellar/store.ts),
[`BottleList.tsx`](../../../frontend/features/cellar/BottleList.tsx),
[`UndoRemoveToast.tsx`](../../../frontend/features/cellar/UndoRemoveToast.tsx)
and their tests, plus `docs/architecture.md` §3 if the "a bottle is removed
by deleting its row" contract's timing is affected.

If the delayed-`DELETE`-plus-client-only-undo model cannot be made
navigation-safe, the fallback in scope is removing the undo affordance
entirely and making Remove commit immediately — the product owner's stated
either/or when this was reported.

## Non-goals

- A server-side undelete or soft-delete endpoint. [Task
  14](../iteration-5/14-edit-remove-bottle.md) ruled it out and this task
  does not add one unless refinement explicitly reopens that question, in
  which case it is an ADR and a backlog item, not this task's implementation.
- Editing or adding a bottle — unaffected.
- The "one toast at a time" and "last bottle's row disappears" rules from
  task 14 and [task 06](06-entry-with-no-bottles.md), except where the
  commit-timing change forces them to change.
- Reflecting a removal on the user's *other* devices faster than the existing
  query invalidation already does.

## Constraints

- [Iteration 5 task 14](../iteration-5/14-edit-remove-bottle.md) is the
  origin of the undo design; its decisions were recorded in that (now frozen)
  task file's Constraints, not an ADR.
- No server-side undelete exists. `DELETE /api/v1/cellar/bottles/{id}` is the
  only removal primitive, and re-adding a bottle creates a new row with a new
  id — and, per [task 06](06-entry-with-no-bottles.md), a fresh entry if the
  removed bottle was the entry's last.
- [ADR-0009](../../adr/0009-zustand-ui-state.md): Zustand holds UI state,
  "never API data or state that should survive a reload". The current design
  keeps commit-critical intent (a removal the user has requested) in a
  Zustand store plus a closure — the exact case that ADR warns against.
- Mutations go through the feature-owned hooks
  ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md),
  [ADR-0008](../../adr/0008-tanstack-query.md)); failures surface as a tagged
  `ApiError` ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- If the undo toast is removed, `@radix-ui/react-toast` and
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s 2026-08-22 /
  2026-08-23 amendments that admitted it need revisiting in the same PR — an
  accepted ADR is amended, never rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- Every string translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); design tokens only
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)); WCAG 2.1 AA at
  the three existing layers.
- `store.ts` already notes that a failed *delayed* `DELETE` has no dialog
  left to report through. Whatever replaces the model must not make a lost
  removal equally silent.

## Open questions

1. **How is the removal made to depend only on Undo?** The candidates, each
   with a different blast radius:
   - **(a)** Fire `DELETE` immediately on Remove; implement Undo as a
     re-add (re-`POST` the removed bottle's data). Simple to reason about,
     but the restored bottle gets a new id and possibly a new entry.
   - **(b)** Fire `DELETE` immediately; drop Undo entirely, optionally
     gating Remove behind an upfront confirmation dialog — which task 14
     explicitly rejected in favour of the undo toast.
   - **(c)** Keep the delay but flush the pending `DELETE` on `pagehide` /
     `visibilitychange` via `navigator.sendBeacon` or a `keepalive` fetch,
     so leaving the page commits the removal instead of cancelling it.
   - **(d)** Keep the delay but persist the pending-removal intent (e.g.
     `sessionStorage`) and reconcile on the next cellar load.
2. **If Undo becomes a re-add (a):** is a restored bottle with a new id, a
   possibly-new entry and a fresh `updated_at` an acceptable "undo", or does
   that break the mental model enough to rule (a) out?
3. **If the undo affordance is removed (b):** does Remove get an upfront
   confirmation dialog, or is it a bare immediate action? Task 14's
   accessibility criteria assumed one of undo-toast or confirmation existed.
4. **The last-bottle consequence message** (`cellar.bottle.remove.toastLastBottle`,
   [task 06](06-entry-with-no-bottles.md)) currently rides on the toast. If
   the toast goes, where — if anywhere — does "that beer is no longer in your
   cellar" get surfaced?
5. **Does `@radix-ui/react-toast` stay a dependency?** Its ADR-0021
   amendment was justified by this toast specifically.
6. **Failure handling:** with no toast or dialog necessarily present, how
   does a failed `DELETE` (or failed re-add) get reported to the user now?
7. **Rapid successive removals:** task 14's "one toast at a time / finalize
   the previous immediately" rule — does the new model keep it, or does it
   fall away with the toast?
8. **Non-functional:** `sendBeacon` / `pagehide` (c) is best-effort and not
   guaranteed under every unload path. Is best-effort delivery acceptable for
   a destructive action, or does that disqualify (c)?
9. **Completion signal:** is a Playwright test that removes a bottle,
   navigates away within the window and re-checks the cellar required (the
   bug is exactly what a same-page fake-timer test misses), or is a
   component test with a simulated unmount enough?
10. **Module boundary:** if the model changes materially (e.g.
    immediate-delete plus re-add undo), does that clear
    [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s bar for a
    new ADR, given the original decision lives only in task 14's Constraints?

## Acceptance criteria

- [ ] Clicking Remove and then immediately navigating to another route and
      back to the cellar leaves the removal in the state a user who touched
      nothing else would expect — the bottle is gone, the `DELETE` committed
      — Playwright spec that removes a bottle, navigates away inside the undo
      window, returns, and asserts the bottle is absent; confirmed to fail
      against today's build, where the bottle reappears
- [ ] Clicking Remove and then immediately reloading the page gives the same
      outcome — Playwright, hard reload inside the window, confirmed to fail
      against today's build
- [ ] Invoking Undo (or the toast's dismiss affordance, if either survives)
      still reverts the removal, and no `DELETE` reaches the backend for a
      removal that was reverted — component/integration test with the
      relevant timing simulated
- [ ] If the undo affordance is removed instead: the final Remove control
      (immediate, or with an upfront confirmation) passes `axe` in both
      locales and is fully keyboard-operable, and no `cellar.bottle.remove.*`
      string is left defined-but-unused — component test plus an i18n key
      check
- [ ] `docs/architecture.md` §3 and the undo descriptions in [iteration 5
      task 14](../iteration-5/14-edit-remove-bottle.md) and [task
      06](06-entry-with-no-bottles.md) still match the shipped behaviour, or
      are reconciled in this PR; `node scripts/check-adrs.mjs` green if an ADR
      is added
- [ ] `make verify` is green

## Notes

Provenance: product-owner bug report, 2026-09-03, in the session on branch
`claude/cellar-bottle-removal-undo-2abea1`. The product owner's direction:
undo should depend **only** on pressing the Undo button, and if that cannot
be implemented, the Undo button should be removed. Recorded here as the
steer for refinement, not a settled design — options (a)–(d) under Open
questions are the ones this reaches for.

The client-only timer is visible in
[`frontend/features/cellar/store.ts`](../../../frontend/features/cellar/store.ts):
`timeoutId` and `scheduled` are module-scoped, and `dispatch` only runs from
the `setTimeout` callback or from a second `startRemoval` finalizing the
first — neither of which happens when the tab is torn down.

Not in the [quality backlog](../quality-backlog.md).
