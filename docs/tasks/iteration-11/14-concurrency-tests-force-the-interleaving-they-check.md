# Task 14: A concurrency test forces the interleaving it checks

- **Status:** refined
- **Iteration:** [11](../iteration-11.md)
- **Covers:** none

## Why

Four rows of [common-failures](../../common-failures.md) are tests that race
themselves rather than the product: `ObservabilityIT` read a log line written
after the response (two rows), and two `ProfileService*IT` tests asserted that a
race happened without causing it. One is still open.
`ProfileServiceModuleIT.concurrentFirstSignInsForANewUserBothSucceedAgainstOneSharedProfile`
asserts `reads > bothSawNoProfile.getParties()`, that the service retried, but a
retry happens only when one of the two sign-ins loses the insert race, and timing
decides whether either does. It went red on `dev` and passed on its pull
request.

`docs/architecture.md`'s testing strategy has no rule for either shape, so the
next such test is written the same way. [Task 20](20-an-anticipated-failure-gets-the-documented-answer.md)
adds a race test of its own.

## Scope

The open test is fixed as the 2026-10-30 row for `ProfileServiceConcurrencyIT`
was: the interleaving is forced so the conflict always happens, rather than
asserted to have happened. The testing strategy gains two rules — a concurrency
test forces the interleaving it checks (barriers placed so the conflict always
happens, or a hook delaying one side) and never asserts that a race occurred; a
side effect after the response, such as a log line or a listener's write, is
awaited and never read once — and a way to run one integration test many times
in a row, with the rule that a new or changed concurrency test passes it before
its pull request opens.

## Non-goals

- Rewriting every existing concurrency test; the rules bind the next ones.
- Fixing the product's retry (ADR-0057), which behaves as designed.

## Constraints

- Maven runs on JDK 25 ([backend README](../../../backend/README.md)).
- Integration tests need Docker; the repeat target runs where
  `make verify` does.
- [ADR-0057](../../adr/0057-retry-on-constraint-violation-for-get-or-create.md)
  says what the retry is; the test must not change it to pass.
- A rule whose violation fails silently keeps its warning where an editor meets
  it ([`CLAUDE.md`](../../../CLAUDE.md)): a rule in `architecture.md` alone may
  not reach the person editing a test.

**Decided at refinement, 2026-11-07** (product owner):

- **The repeat target is `make repeat-it TEST=<Class>#<method> COUNT=<n>`,**
  `COUNT` defaulting to 20, stopping at the first failure.
- **A new or changed concurrency test shows 20 consecutive clean runs** on its
  branch before its pull request opens, stated in the pull request body; no
  checker looks for it, since a script cannot tell a concurrency test from any
  other.

## Open questions

**None.**

## Acceptance criteria

- [ ] `ProfileServiceModuleIT`'s test forces the conflict — a barrier or a hook
      makes both sign-ins reach the insert together — and asserts the outcome,
      not that a retry occurred; it failed under a build with the retry removed
- [ ] The test passes in 20 consecutive runs by the new `make` target, on this
      branch
- [ ] The target runs one named integration test a given number of times and
      stops at the first failure
- [ ] `docs/architecture.md`'s testing strategy states the two rules and the
      repeat requirement, and the common-failures row names this task
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-99 and SHOULD-100.
Runs early, since a flaky test undermines every gate after it
([iteration 9](../iteration-9.md) did the same for the same reason).
