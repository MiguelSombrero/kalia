# Task 19: What a review decides outlives the pull request it was made in

- **Status:** refined
- **Iteration:** [9](../iteration-9.md)
- **Covers:** none

## Why

Review feedback is lost in two ways.

A rule the product owner raises in review does not stick. The backend's
"text blocks, not concatenation" rule (`backend/README.md`) was raised on #427
and again on #435. Since then #450 and #452 each added another concatenation,
and ten `+ "` continuation lines remain, including the one #427 fixed. The
rule can be checked mechanically from its text, which is the case
[ADR-0039](../../adr/0039-mechanisms-for-recurring-rule-violations.md) says
gets a checker rather than another reminder (MUST-22).

A `/code-review` finding marked "new task" does not stick either. The
`implement-task` skill and the PR template ask for the verdict but name no
place to record it. Follow-ups from #398, #400 and #425, and six from #452,
exist only in PR bodies, and iteration 8.5 closed without any of them
(SHOULD-90). One of them is SHOULD-73's lost 429 handling.

A third codebase means more reviews and more rules, which is why this belongs
before mobile code starts landing.

## Scope

The text-block rule fails a check instead of a review, and every review
finding deferred as "new task" has a recorded home in the same PR that
deferred it.

## Constraints

- [ADR-0039](../../adr/0039-mechanisms-for-recurring-rule-violations.md):
  which recurring violations get a mechanism, and of what kind.
- [ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md): a new
  check runs inside `make verify-fast` if it needs no build.
- A Checkstyle plugin would be a new dependency, so ask rather than research
  (`CLAUDE.md`).

**Decided at refinement, 2026-10-30** (product owner):

- **The text-block checker is a script in `make check`, over all backend
  Java,** and the ten existing violations are fixed in this task. Checking
  added lines only was rejected because it leaves the ten in place; a
  Checkstyle rule because it is a new dependency for one pattern.
- **A deferred finding becomes a [quality-backlog](../quality-backlog.md)
  entry with its own ID, in the PR that defers it,** and
  `check-pr-body.mjs` fails a body that defers a finding without naming
  that ID. The sweep already triages that file; the product backlog is for
  product work, and the iteration index would grow mid-iteration without
  the product owner's say.
- **The follow-ups already lost are recovered now.** This task reads the
  bodies of #398, #400, #425 and #452 and files each finding that still
  holds as a quality-backlog entry; one that no longer holds is named as
  such in the PR.

## Open questions

**None.**

## Acceptance criteria

- [ ] The checker fails on a `+ "` string continuation in backend Java, with a
      test proving it catches one and allows a text block
- [ ] Every existing violation the checker covers is fixed, or the scope
      refinement chose is stated in the check's own output
- [ ] `implement-task` and the PR template name the home for a deferred
      finding, and if `check-pr-body.mjs` enforces it, its test covers a body
      that defers without one
- [ ] Each still-valid follow-up from #398, #400, #425 and #452 has a
      quality-backlog entry, and the PR names any that no longer holds
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-22
(`[needs decision]`, open question 1) and SHOULD-90.
