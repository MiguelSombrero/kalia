# Task 18: The cellar's flows run end to end on both platforms

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1, DW-2, DW-3

## Why

Each task before this one tests its own part, and the Maestro flows on Android
are the only native run CI makes
([ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)).
What none of them proves is the journey the iteration is for — sign in, add a
bottle, read it, edit it, remove it, then lose the signal and read the cellar
again — nor that it holds on iOS, where CI does not run. This is the closing
task: it reads the iteration's `Done when` against the built app.

## Scope

- A Maestro flow of the whole cellar on Android: sign in, add bottles of a beer
  from the Add action, read them, edit one, remove one.
- A flow, or a scripted run, that reads the cellar after the stack is made
  unreachable and the app restarted, and attempts a write that is refused.
- The same journey walked by hand on the iOS Simulator and on the product
  owner's iPhone, recorded in words.
- The mobile README's account of what the Cellar tab and the Add action do,
  and of how the connection is switched off on each platform for a test.

## Non-goals

- New behaviour; a defect found here is a finding for its own task, not fixed
  in this one.
- Keeping an iPhone build installed past the free signing's seven days
  ([backlog](../backlog.md#mobile-client)).

## Constraints

- The flows run on a release build against the compose stack, as the existing
  ones do ([mobile README](../../../mobile/README.md)); a flow that needs a
  state the app cannot reach through its own screens seeds it through the API
  in a preflight, not through a test-only route in the app.
- **A flow is confirmed to fail** against the behaviour it covers, not only to
  pass ([`CLAUDE.md`](../../../CLAUDE.md)).
- **No billed CI minute** ([`CLAUDE.md`](../../../CLAUDE.md)); the flows add to
  the one Android run CI already makes and are not a new job.
- No screenshot leaves the machine; the walk is recorded in words
  ([rule](../../../.claude/rules/no-screenshots.md)).
- A flow waits on a signal, never on the clock
  ([iteration 11.5 task 12](../iteration-11.5/12-a-test-waits-on-a-signal-never-on-the-clock.md)).

## Open questions

- **How much of the journey runs in CI** and how much by hand: Android's
  emulator can have its connection switched off by the flow, the iOS Simulator
  has no such switch, and an iPhone is the owner's.
- **Whether the accessibility walk** of the cellar's screens, as
  [iteration 11 task 11](../iteration-11/11-mobile-accessibility-conventions.md)
  did for the catalog, belongs here or in a later quality pass.
- **Whether the walk on an iPhone is owed** if the free signing has lapsed, as
  the iteration 11 sign-off was handled.

## Acceptance criteria

- [ ] A Maestro flow signs in, adds bottles from the Add action, edits one and
      removes one on Android, and was confirmed to fail without the cellar
- [ ] A Maestro flow reads the last-loaded cellar with the stack unreachable
      after a restart and reads the refusal of a write, on Android, and was
      confirmed to fail with the cache off
- [ ] Both flows are part of the mobile e2e test run in `make verify` and in CI
- [ ] The product owner walked the journey on the iOS Simulator and on their
      iPhone, offline included, and the result is written in the pull request
      without an image
- [ ] The iteration's `Done when` is checked criterion by criterion against
      the built app, and the result is written in the closing pull request
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Cellar end-to-end flows
on both platforms").
