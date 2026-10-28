# Task 19: What a review decides outlives the pull request it was made in

- **Status:** needs-refinement
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

## Open questions

1. **Which checker for text blocks?** A script in `make check` with the ten
   existing lines fixed, the same script on added lines only, or a Checkstyle
   rule.
2. **Where does a deferred review finding go?** A `docs/tasks/backlog.md`
   entry, a quality-backlog entry, or the current iteration's index, and
   whether `check-pr-body.mjs` enforces it.
3. **What happens to the follow-ups already lost** from #398, #400, #425 and
   #452: recover them into the backlog now, or leave them to the next sweep?

## Acceptance criteria

- [ ] The checker fails on a `+ "` string continuation in backend Java, with a
      test proving it catches one and allows a text block
- [ ] Every existing violation the checker covers is fixed, or the scope
      refinement chose is stated in the check's own output
- [ ] `implement-task` and the PR template name the home for a deferred
      finding, and if `check-pr-body.mjs` enforces it, its test covers a body
      that defers without one
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-22
(`[needs decision]`, open question 1) and SHOULD-90.
