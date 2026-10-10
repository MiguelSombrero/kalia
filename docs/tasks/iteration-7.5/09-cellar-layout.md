# Task 09: Cellar layout

- **Status:** refined
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-3, DW-4, DW-5
- **Kind:** design

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

Added by the product owner during design, 2026-10-10, once the shape was
chosen:

- **Sorting a cellar** by beer name, style, strength, bottle count and
  best-before, on both surfaces. The chosen order survives a reload and is
  carried in the page's URL, so a shared public-cellar link can carry it too.
- **Adding another bottle of a beer already in the cellar from the cellar
  itself**, through the same add-bottle dialog the catalog opens.
- **The owner's cellar read returns each entry's bottles**, the shape the
  public cellar read already has, so every bottle is on the page without a
  fetch per beer. The read that lists one entry's bottles then has no caller
  and is removed.

**Audit findings on these surfaces** ([the audit](audit.md), [DW-5](../iteration-7.5.md)): [AUD-28](audit.md), [AUD-29](audit.md), [AUD-30](audit.md), [AUD-31](audit.md), [AUD-32](audit.md), [AUD-33](audit.md), [AUD-34](audit.md), [AUD-35](audit.md), the cellars' share of [AUD-06](audit.md), [AUD-07](audit.md), [AUD-09](audit.md), [AUD-45](audit.md), [AUD-47](audit.md); keeps [AUD-49](audit.md), [AUD-53](audit.md), [AUD-54](audit.md), [AUD-55](audit.md). [AUD-30](audit.md), [AUD-31](audit.md), [AUD-32](audit.md), [AUD-33](audit.md), [AUD-34](audit.md) are product findings: the task records for each whether it is fixed or becomes a [backlog](../backlog.md) entry.

## Non-goals

- What a cellar *stores*. Adding a field to a bottle, or changing the two-level
  beer/bottle model ([ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md)),
  is a data decision this task inherits.
- Visibility rules. What a public cellar may show, and what happens when a
  cellar is not public, are
  [ADR-0049](../../adr/0049-profile-module-and-public-identity.md) and
  [ADR-0050](../../adr/0050-public-cellar-addressing.md), and the uniform 404
  is not this task's to soften.
- Filtering a cellar *by the user* — a control that narrows it. Sorting was a
  non-goal too until the product owner moved it into Scope on 2026-10-10.
- An in-cellar way to find and add a beer. A [backlog](../backlog.md) entry.

## Constraints

- **The uniform 404 holds.** A cellar that is not public renders the generic
  localized not-found page, and it must stay indistinguishable from a username
  that does not exist ([ADR-0050](../../adr/0050-public-cellar-addressing.md)).
  A layout that helpfully explains which one happened is a disclosure bug
  wearing a usability improvement's clothes.
- The public cellar is locale-less, carries `hreflang`/`canonical` alternates
  and is served `noindex, nofollow`
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)). It is also the page
  that gets pasted into chat clients, though what that unfurls to is a
  [backlog](../backlog.md) entry, not this task.
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

- The agreed widths, reserved image shapes and the 24×24 minimum target size
  are iteration-wide decisions recorded in
  [the iteration index](../iteration-7.5.md).

Decided with the product owner in refinement, 2026-10-01:

- **The cellar may say things about time.** A bottle past its best-before is
  visibly marked, judged against the user's local day as above.
- **The default order may change, and a backend change to support it is in
  scope.** Ordering beers by what is drinkable soonest needs bottle dates at
  the beer level, and the owner's cellar fetches bottles only when a row
  opens. If the chosen order needs data the beer row does not have, this task
  grows a backend part, with its tests, the regenerated API client
  ([ADR-0012](../../adr/0012-orval-api-client.md)) and the doc-sync that goes
  with it. *Which* order is the default is prototyped.
- **Adding a bottle still happens from the catalog**, and the cellar —
  especially an empty one — offers a clear route into it. *Amended
  2026-10-10:* a beer's first bottle still comes from the catalog; further
  bottles of a beer already held may also be added from the cellar (Scope).
- **The empty cellar is a new user's first run.** Sign-up ends signed in, and
  the first cellar a new person opens is empty
  ([iteration 6.5](../iteration-6.5.md) DW-3), so this task owns that moment
  rather than [task 10](10-profile-and-sign-up-layout.md).
- **Prototypes are looked at with a small cellar and a large one**, and
  whether the public cellar is the owner's page with its controls removed or a
  page of its own is one of the choices between built alternatives.
- **A beer row carries the image slot
  [task 04](04-imagery-iconography-and-the-mark.md) produced.**

## Open questions

**None.**

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
      render deliberately, covered by tests, and the empty cellar links into
      the catalog
- [ ] A bottle past its best-before is visibly marked and one on its
      best-before day is not, judged on the user's local day, covered by a
      test that pins the boundary
- [ ] If the default order changed, it is asserted by a frontend test, and any
      backend change behind it by backend tests of its own
- [ ] Both surfaces work at both agreed widths and the
      `@axe-core/playwright` scans pass at both
- [ ] The findings [task 02](02-design-audit-baseline.md) recorded on the
      cellar surfaces are each fixed or carry a written decision not to fix them
- [ ] The cellar sorts by name, style, strength, bottle count and best-before
      on both surfaces, each order asserted by a frontend test, the chosen
      order kept in the URL, and the control operable by keyboard alone
- [ ] Another bottle of a beer already in the cellar can be added from the
      cellar through the existing add-bottle dialog, covered by vitest and
      Playwright
- [ ] The owner's cellar read returns each entry's bottles and the
      per-entry bottles read is gone, covered by backend tests, with the
      regenerated API client committed
- [ ] `make verify` is green
