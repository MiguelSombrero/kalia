# Task 16: Two first reads of a new user's profile never collide

- **Status:** done
- **Iteration:** [9](../iteration-9.md)
- **Covers:** none

## Why

Concurrent first reads of a new user's profile still race against the
username reservation (d02f48a).
`ProfileServiceConcurrencyIT.concurrentFirstReadsForANewUserBothSucceedAgainstOneSharedProfile`
has failed with 409 on `dev` (run 40168778643, the merge of #421) and on three
other runs, and the end-to-end suite once sent a real sign-in to
`/fi/username-taken`. [docs/common-failures.md](../../common-failures.md)
logged it on 2026-10-26 with "no fix home yet".

A test that fails one run in several is not just noise to rerun. It teaches
every session to distrust a red build. The race is also a real bug a user can
hit, and a mobile app opening alongside the web makes concurrent first reads
more likely.

## Scope

A new user's first concurrent profile reads all succeed against one shared
profile, and the concurrency test passes every time rather than most of the
time.

## Constraints

- [ADR-0043](../../adr/0043-createuser-race-safety.md) and
  [ADR-0057](../../adr/0057-retry-on-constraint-violation-for-get-or-create.md)
  are how get-or-create races are already handled; the fix follows them or
  amends them.
- [ADR-0080](../../adr/0080-a-username-is-unique-regardless-of-case-and-never-reused.md):
  a username is unique regardless of case and never reused.

**Decided at refinement, 2026-10-30** (product owner):

- **The username check recognises the caller's own row; nothing retries or
  waits.** Read at refinement, the likely cause is narrower than the
  question assumed: `ProfileService.create()` looks the username up, finds
  the row the *same* subject's other request has just committed, and throws
  `UsernameTakenException` — which the `@Retryable` does not match, so the
  loser answers 409 instead of reading the shared profile. A username row
  owned by the requesting id is that user's profile, not a collision. No
  locking is added. Confirm the cause against the failing test before
  fixing; if it turns out to be something else, stop and re-refine.

## Open questions

**None.**

## Acceptance criteria

- [x] The concurrency integration test passes 50 consecutive runs locally,
      and was confirmed to fail against the unfixed code at least once in as
      many
- [x] The cause is stated in the PR and, where it changes how get-or-create
      races are handled, in the ADR it amends
- [x] The `common-failures.md` row points at the fix

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-23.
