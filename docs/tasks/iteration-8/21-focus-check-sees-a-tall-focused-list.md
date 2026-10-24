# Task 21: The focus check sees a focused list taller than the screen

- **Status:** needs-refinement
- **Iteration:** [8](../iteration-8.md)

## Why

`e2e/keyboard-flows.spec.ts`'s flow 3 fails intermittently against a local
stack whose database has been used for a while. It fails in the step "tab back
up to the new-entries control", in both locales, with no change to the
frontend. CI starts on an empty database every run and stays green. Locally
the flake makes `make verify` red for every contributor. `make verify` must be
green before a PR, so a docs-only PR (#386, task 16) is blocked by a test it
does not touch.

The failure is not in the product. Taking in new entries moves focus to the
feed's `<ul>`, as `FeedList` intends, because the control that was pressed
unmounts. The list's top is on screen, below the sticky header, and nothing
covers it. `expectFocusNotObscured` (`e2e/support/keyboard.ts`) still reports
the list as "entirely hidden". The check samples a 3×3 grid at 10%, 50% and
90% of the focused element's whole box, and on a long feed every one of those
points is below the bottom of the viewport.

Evidence, gathered on 2026-10-24 on `dev` at `86c0670`:

- **Reused volume** (the task-16 worktree's stack): flow 3 with
  `--repeat-each=5` failed 3 of 10 runs, in both locales. Each failure had
  focus on the `<ul>`, with 30–35 lines loaded and a box of 5,600–6,500 px.
  Its top was at y=346, 346 and 158, in an 812 px viewport. The first grid row
  then lands at y≈906, 906 and 812, all off-screen. A run passes only when the
  list's top happens to sit high enough for its 10% row to stay on screen.
  Where the top sits depends on how far tabbing back up scrolled the page.
- **Static reproduction, no stack:** a `<ul tabindex=-1>` 3,541 px tall at
  y=480, focused with `preventScroll`, gives exactly the reported message,
  `<ul> "x" at y=480–4021`.
- **Fresh volume** (a worktree stack started with no volume): the same
  command passed 10 of 10. The feed held only the lines those runs added, so
  the focused list stayed short enough for its 10% row to stay on screen.

## Scope

- The focus check counts an element as seen when some part of it that lies
  inside the viewport is painted on top. However tall a focused element is,
  its visible part can satisfy the check.
- The check keeps failing everything it fails today when the failure is real:
  an element covered entirely by a sticky or fixed bar, an element entirely
  outside the viewport, and focus on nothing.

## Non-goals

- Changing where the feed puts focus after new entries are taken in. That is
  `FeedList`'s documented behaviour, and the list's top is visibly focused.
- Seeding or resetting the local database before E2E runs. The suite is meant
  to run against a long-lived stack (frontend/README.md, "Nothing needs
  resetting before running the suite").

## Constraints

- [ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md): WCAG
  2.2 AA, with 2.4.11 Focus Not Obscured checked only at E2E by this helper.
  Loosening it beyond "some visible part is on top" would leave 2.4.11 with
  no check.
- `tabTo` calls the same check at every Tab stop in every keyboard flow, so a
  change reaches all of them, not only flow 3.

## Open questions

- **Is "some visible part painted on top" the reading of 2.4.11 the project
  wants?** It is what the helper's comment already claims ("covering only
  part of it does not" fail), applied to the part inside the viewport. The
  stricter alternative asks that the focus indicator's own edge be visible.
  That needs the outline geometry rather than hit-testing, and no flow today
  needs it.

## Acceptance criteria

- [ ] A Playwright check of the helper on a static page, with no stack,
      covers three cases: a focused list taller than ten viewports whose top
      is in view passes; a control covered entirely by a fixed bar fails; a
      control entirely below the viewport fails. The first case is confirmed
      to fail against today's helper
- [ ] `npx playwright test e2e/keyboard-flows.spec.ts --repeat-each=10`
      passes against a long-lived local stack that reproduced the flake
- [ ] The same command passes against a fresh stack (`docker compose down -v`,
      then up)
- [ ] `make verify` is green

## Notes

Found while running `make verify` for task 16 (PR #386). The suspect named
then was a long feed shifting the Tab order. The measurements above rule
that out: the Tab order is unchanged and focus lands where `FeedList` puts
it. The long feed matters only because it makes the focused list tall.

A prototype of the helper change passed `keyboard-flows.spec.ts`
`--repeat-each=10` (90 of 90) on the same reused volume that failed 3 of 10.
It is not committed, since this task is not refined yet.
