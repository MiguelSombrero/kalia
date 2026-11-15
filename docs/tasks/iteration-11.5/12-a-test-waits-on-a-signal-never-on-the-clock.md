# Task 12: A test waits on a signal, never on the clock

- **Status:** refined
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

Two tests check behaviour against the wall clock:

- **`CatalogScreen.flow.test.tsx` checks the debounce in real time.** Its `settle`
  helper sleeps 450 ms against the screen's 300 ms pause. On a loaded runner the
  margin shrinks, and an assertion that no request was sent yet can pass or fail
  by timing alone. `FiltersSheet.test.tsx` and `AppGate.test.tsx` in the app,
  and `AddBeerDialog.test.tsx`, `FeedList.test.tsx` and
  `signInContext.test.ts` in the web, also wait with a `setTimeout` promise.
  Nine other test files already use Jest's or Vitest's fake timers.
- **`web/e2e/admin-review.spec.ts`'s `catalogShows` asserts that something is
  absent after `networkidle`.** It can run before the catalog's streamed
  results have rendered, so "a rejected beer is withheld" could pass whether or
  not the beer is withheld. The web's end-to-end suite has about 40 absence
  assertions. Any of them that has no positive signal before it has the same
  hole.

Iteration 12 makes this shape more common. Optimistic writes roll back, offline
states appear and disappear, and the add-a-beer sheet searches as the user
types. Each of these will be tested by waiting or by asserting that something
is absent. A test that passes without checking anything is worse than a missing
test, because it shows a criterion as covered when it is not.

## Scope

- The tests named above check what they claim no matter how long the runner
  takes: time is driven by fake timers, and an absence is asserted only after
  a positive signal that the page or list has rendered.
- The other absence assertions in the web's end-to-end suite are checked for
  the same hole, and each one that has it is fixed.
- A written rule in each client's testing conventions: a test of elapsed time
  uses fake timers, and an assertion of absence follows a positive signal.
  Each rule names the check that holds it, or says that none does.

## Non-goals

- The Maestro flows, which have no timer to fake. A flow's waits are the
  mobile README's business, unchanged here.
- The backend's concurrency tests, settled by
  [iteration 11 task 14](../iteration-11/14-concurrency-tests-force-the-interleaving-they-check.md).

## Constraints

- **Test conventions are written by
  [task 28](28-both-apps-test-conventions-are-written-down.md)** in the
  `CONVENTIONS.md` files [task 25](25-each-apps-code-conventions-have-a-file-of-their-own.md)
  creates. The rules here go into that section rather than into a second
  place ([ADR-0020](../../adr/0020-documentation-roles.md)).
- A new lint rule gets a fixture that its config test sees fail, in both
  apps' `eslint-fixtures/`
  ([ADR-0012](../../adr/0012-orval-api-client.md)).
- TanStack Query and React Native Testing Library each interact with fake
  timers in their own way at the pinned versions. That is checked against the
  installed versions, never from memory.
- **Decided at refinement (2026-11-15):**
  - Both rules are lint rules:
    - a `setTimeout` promise in a test file fails, in both apps;
    - `networkidle` is banned in the web's end-to-end specs, so an absence
      follows a positive signal. The app has no Playwright specs.
  - All of the web's roughly 40 end-to-end absence assertions are read, not
    only those in specs iteration 12 will extend.
  - A wait on a real external process, as in `signInContext.test.ts` and
    `brute-force-lockout.spec.ts`, is exempt. Its `eslint-disable` carries
    the reason.
  - The rules are written in each app's `CONVENTIONS.md`, in the test
    section [task 28](28-both-apps-test-conventions-are-written-down.md)
    writes.

## Open questions

**None.**

## Acceptance criteria

- [ ] `CatalogScreen.flow.test.tsx`, `FiltersSheet.test.tsx` and `AppGate.test.tsx`
      use fake timers, and each passes 50 runs in a row with
      `--runInBand` while the machine is under load from another suite
- [ ] `admin-review.spec.ts`'s "a rejected beer is withheld" fails against a
      build that shows the rejected beer. Seen failing that way before the fix,
      it waits on a positive signal that the results are in
- [ ] Every other e2e absence assertion found with the same hole is fixed,
      and the pull request lists the ones read
- [ ] Both apps' `CONVENTIONS.md` state the two rules and name their lint
      rules. In each app, a fixture holding a `setTimeout` promise in a test
      fails its config test, and in the web a spec using `networkidle` does
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-137 and COULD-142.
Placed before iteration 12, whose optimistic and offline states are the next
tests of this shape.
