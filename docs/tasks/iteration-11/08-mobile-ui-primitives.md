# Task 08: The app's screens are built from its own primitives

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-2, DW-3

## Why

The design chosen in tasks [02](02-design-the-interaction-model-and-navigation.md)
to [05](05-design-motion-and-haptics.md), [22](22-design-mobile-tab-icons.md) and
[23](23-design-the-catalogs-search-and-filters.md) reaches a user only through
components. Those tasks put every screen that exists on the theme, in both
modes and both locales, so none is plain any more. What they did not do is leave
the app a set of primitives to build the next screens from: they were built
inside the screens that needed them.

`ActionButton`, `ErrorReference`, `PersonSlot` and the motion primitives are
shared. The rows, the chips and the text button live in the catalog's filter
controls. The sheet's close, title and body are written out by hand in the Add,
sign-in and filters sheets, and the loading, error-with-retry and empty blocks
are written out in the catalog and in Profile. [Tasks 09](09-catalog-search-and-list.md)
and [10](10-beer-details.md) are the first screens meant to be built entirely
from primitives; without them each would write a further copy.

## Scope

The app's shared primitives under `mobile/src/components`, made out of what the
screens already built and moved wherever a second screen uses it: buttons (the
action button and the quiet text button), rows (one that opens a page, one that
makes a choice), a sheet shell (close, title and body), the loading, error and
empty blocks, and the beer and person slots
([ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md)). A control only
the catalog uses, such as its search field, its Filters button and its chips,
stays with the catalog.

Every screen that exists, bar the three that
[task 25](25-the-screens-that-must-work-when-nothing-else-does-depend-on-nothing-that-can-change.md)
owns, is rebuilt on them without changing what it shows or does, then looked
at: the tab shell, the Feed and Cellar placeholders, Profile's signed-out,
signing-in and signed-in states, the Add, sign-in and filters sheets, and the
catalog's loading, error and empty states.

## Non-goals

- The "update required", "maintenance" and crash screens —
  [task 25](25-the-screens-that-must-work-when-nothing-else-does-depend-on-nothing-that-can-change.md).
- The catalog's search, paging and filters — [task 09](09-catalog-search-and-list.md);
  a beer's page — [task 10](10-beer-details.md).
- A shared component package: the primitives are the app's own
  ([ADR-0073](../../adr/0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md),
  as [task 06](06-decision-the-design-token-format.md) leaves it).
- Choosing how anything looks anew; tasks 02–05, 22 and 23 did. Where a
  primitive's look was left open it is proposed from their identity, not shown
  as alternatives.
- The mark inside the app, which stays out this iteration
  ([`docs/tasks/backlog.md`](../backlog.md)).
- The accessibility conventions and their checks — [task 11](11-mobile-accessibility-conventions.md).
  The primitives carry roles and names as the screens do today.

## Constraints

- Tokens only, checked by [task 07](07-token-pipeline.md)'s check.
- Loading, error and empty are states of a component, not afterthoughts
  ([ADR-0022](../../adr/0022-loading-error-empty-states.md)); an error shows its
  reference ([ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).
- Accessibility in platform terms
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)): roles,
  accessible names, tap targets, and no fixed height around text.
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).
- **Motion and haptics come from `src/lib/motion`,** which
  [task 05](05-design-motion-and-haptics.md) built
  ([ADR-0113](../../adr/0113-the-phone-moves-a-little-to-explain-a-change-and-is-felt-only-for-the-result-of-an-action.md)):
  a primitive that acts takes its press feedback from there, and reduced motion
  is answered once, in them.
- **`ActionButton`'s existing props stay while
  [task 25](25-the-screens-that-must-work-when-nothing-else-does-depend-on-nothing-that-can-change.md)
  is in flight;** this task only adds to them, and touches nothing under
  `features/app-config` or `features/crash-recovery`. The two tasks run in
  parallel and either merges first.
- **The iPhone sign-off is counted as
  [the iteration index](../iteration-11.md#the-iphone-sign-off) says.**

**Settled at the 2026-11-07 refinement** (product owner):

- **Every primitive and screen is right in both modes;** the app has a dark
  mode that follows the system
  ([task 04](04-decision-and-design-dark-mode.md)).

**Settled at the 2026-11-13 refinement** (product owner):

- **This task consolidates; it does not redesign.** A control moves into
  `components/` when a second screen uses it, and a control with one user stays
  in its feature. The tests of what moves move with it.
- **No primitive has a built-alternatives round.** One proposal is built from
  the chosen identity, motion and dark mode, and the product owner signs it
  off live.
- **Names:** a new primitive takes the web's name where the job is the same
  (`EmptyState`, `ErrorAlert`); today's mobile names stay (`ActionButton`,
  `SkeletonBlock`, `PersonSlot`, `BeerCard`). Nothing is renamed.
- **The "update required" and "maintenance" screens are
  [task 25](25-the-screens-that-must-work-when-nothing-else-does-depend-on-nothing-that-can-change.md)'s,**
  split out because they, and the crash screen, must work when nothing else
  does.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component test per primitive shows each of its states in light and
      dark and — for a row — a long Finnish name at the largest font scale,
      rendering without truncating its meaning
- [ ] A component test shows the loading, error (with its reference and a
      retry) and empty blocks rendering in the catalog and in Profile with the
      words those screens have today
- [ ] A component test shows the Add, sign-in and filters sheets each rendering
      through the one sheet shell, with its close action and heading found by
      role and accessible name in `en` and `fi`
- [ ] No screen under `mobile/src/app` or `mobile/src/features` styles itself
      outside the primitives and the theme — the token check passes
- [ ] The mobile README says where a primitive lives and when a control moves
      into `components/`
- [ ] The product owner looked at every restyled screen on the route task 01
      chose, in both modes and both locales, and signed them off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Mobile UI primitives").
At the refinement of 2026-11-13 the task was reshaped: the screens it was to
restyle had been put on the theme by the tasks that landed since, so what
remained was the primitives, and the screens that must work when nothing else
does became [task 25](25-the-screens-that-must-work-when-nothing-else-does-depend-on-nothing-that-can-change.md).
[Task 23](23-design-the-catalogs-search-and-filters.md) was to build from this
task's primitives and was built first, so its controls are what this task
extracts.
