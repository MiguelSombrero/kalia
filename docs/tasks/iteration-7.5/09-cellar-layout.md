# Task 09: Cellar layout

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-3, DW-4, DW-5

## Why

The cellar is the product. The [vision](../../../README.md) says the catalog
enables the cellar and the cellar is what Kalia is for, and it is the surface a
signed-in person returns to — yet it is laid out as a plain vertical stack of
accordion rows, one per beer, each opening onto a list of bottles. That shape
came from [ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md)'s
two-level model, which is a data decision; it has never been separately decided
that two levels of data should be presented as one level of accordion.

The row carries a lot: beer name, brewery, style badge, ABV badge, a bottle
count, and behind the toggle a list of bottles each with a brewed date, a
best-before date, an edit control and a remove control. Everything is
`cardVariants` plus a button. A cellar with forty beers is forty identical
rows, and there is no sorting, no grouping and no way to see what is drinkable
soonest — which for a cellar is arguably the only question that matters.

The public cellar is the same components seen by a stranger with no controls,
and it is **the only Kalia URL that is shared outwards**
([ADR-0050](../../adr/0050-public-cellar-addressing.md)). It is the page most
likely to be someone's first impression of Kalia, and it has never been
designed as such — it is the owner's page with the buttons taken out.

## Scope

Both cellar surfaces, prototyped and chosen together because they share their
components: the owner's cellar — the beer rows, the bottles beneath them, and
the add, edit and remove affordances — and the public cellar a stranger opens
by link.

Includes the add-, edit- and remove-bottle dialogs, the removal-outcome toast,
the sign-in prompt shown to a signed-out visitor, the empty cellar, and
`CellarListSkeleton`/`PublicCellarSkeleton`.

## Non-goals

- What a cellar *stores*. Adding a field to a bottle, or changing the two-level
  beer/bottle model ([ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md)),
  is a data decision this task inherits.
- Visibility rules. What a public cellar may show, and what happens when a
  cellar is not public, are
  [ADR-0049](../../adr/0049-profile-module-and-public-identity.md) and
  [ADR-0050](../../adr/0050-public-cellar-addressing.md), and the uniform 404
  is not this task's to soften.
- Sorting or filtering a cellar as a *feature*. If prototyping shows the cellar
  needs it — question 4 — that is a finding to record and schedule, not
  something to build under a layout task.

## Constraints

- **The uniform 404 holds.** A cellar that is not public renders the generic
  localized not-found page, and it must stay indistinguishable from a username
  that does not exist ([ADR-0050](../../adr/0050-public-cellar-addressing.md)).
  A layout that helpfully explains which one happened is a disclosure bug
  wearing a usability improvement's clothes.
- The public cellar is locale-less, carries `hreflang`/`canonical` alternates
  and is served `noindex, nofollow`
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)). It is also, per
  question 6, the page that gets pasted into chat clients.
- **Removing a bottle commits immediately behind an upfront confirmation
  dialog**, and the toast reports the outcome only —
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s 2026-09-04
  amendment removed the delayed-commit-plus-undo model because it could be
  silently lost to a reload. A layout that reintroduces an undo affordance
  reopens that decision rather than decorating it.
- The dialogs get their focus trap, `aria-modal` and scroll locking from
  `@radix-ui/react-dialog`, and the toast its live region from
  `@radix-ui/react-toast`
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)). Restyling them
  is fine; replacing them with hand-rolled equivalents is the thing those two
  amendments exist to prevent.
- `CellarBeerAccordion` is shared by both surfaces and is controlled — the
  parent owns `expanded` because the owner's row uses it to gate a lazy bottle
  fetch. A layout that expands rows by default changes a fetch pattern, not
  just an appearance.
- Bottle dates are judged against the user's local day
  ([iteration 6.5 task 12](../iteration-6.5/12-bottle-future-date-uses-local-day.md)),
  which matters the moment a layout starts saying anything about *when*.

## Open questions

1. **Is an accordion list the right shape for a cellar?** It is the shape the
   data has. A shelf, a grid, a table with sortable columns, or a timeline by
   best-before date are all shapes a *cellar* has, and none of them has been
   tried.
2. **What does a person come to their cellar to find out?** What is drinkable
   soonest, what they have most of, what they added recently, or simply what is
   there. The answer decides the default order, and there is no order today
   beyond whatever the API returns.
3. **How does a cellar of forty beers differ from one of four?** Every
   prototype must be looked at with both, because a stack of identical rows
   fails gradually rather than suddenly.
4. **Does the cellar need sorting or filtering?** Probably, and it is out of
   scope to build — but prototyping is how that becomes a recorded finding with
   evidence instead of a hunch.
5. **Where does "add a bottle" start?** From the catalog today, via a control
   on a search result. Whether a cellar should also be able to start that
   journey — and what it looks like when it does — is unanswered.
6. **Is the public cellar the same page with controls removed, or its own
   design?** It is the only page a stranger reaches first. Treating it as a
   read-only variant is one answer; treating it as Kalia's shop window is
   another.
7. **What does an empty cellar look like, and an empty public one?** A new
   user's first sight of the product they signed up for, and a stranger's first
   sight of someone who made an empty cellar public.
8. **How much does a bottle row show?** Two dates and two controls today. A
   bottle whose best-before has passed is currently indistinguishable from one
   brewed yesterday.

## Acceptance criteria

- [ ] The product owner chose from built alternatives for the cellar's basic
      shape, looked at with both a small cellar and a large one
- [ ] Both surfaces ship, with their shared components changed once rather than
      diverging, and the public cellar's design decision — variant or its own
      page — is visible in the code rather than implied
- [ ] A cellar that is not public is still indistinguishable from a username
      that does not exist, covered by the existing test that pins it
- [ ] Add, edit and remove still work from every place they are offered, still
      behind their Radix primitives, covered by the existing vitest and
      Playwright suites updated rather than deleted
- [ ] `CellarListSkeleton` and `PublicCellarSkeleton` match the layouts that
      ship, with their colocated tests asserting the new shapes
- [ ] Empty cellar, empty public cellar, and the signed-out sign-in prompt each
      render deliberately, covered by tests
- [ ] Both surfaces work at both agreed widths and the
      `@axe-core/playwright` scans pass at both
- [ ] The findings [task 02](02-design-audit-baseline.md) recorded on the
      cellar surfaces are each fixed or carry a written decision not to fix them
- [ ] `make verify` is green
