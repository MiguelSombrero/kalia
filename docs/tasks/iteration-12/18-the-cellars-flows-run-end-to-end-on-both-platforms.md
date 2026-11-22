# Task 18: The cellar's flows run end to end on both platforms

- **Status:** refined
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1, DW-2, DW-3

## Why

Each task before this one tests its own part, and the Maestro flows on Android
are the only native run CI makes
([ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)).
What none of them proves is the journey the iteration is for — sign in, add a
bottle, read it, edit it, remove it, then lose the signal and read the cellar
again — nor that it holds on iOS, where CI does not run. This is the last
task, and what it proves is what the iteration's closing pull request reads
its `Done when` against.

## Scope

- A Maestro flow of the whole cellar on Android: sign in, add bottles of a beer
  from the Add action, read them, edit one, remove one.
- A flow, or a scripted run, that reads the cellar after the emulator is put
  in airplane mode and the app restarted, and attempts a write that is refused.
- The same journey walked by hand on the iOS Simulator and on the product
  owner's iPhone, a suggested beer included, and the cellar's screens walked
  with VoiceOver and TalkBack, recorded in words.
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

**Decided at refinement, 2026-11-22** (product owner):

- **Android runs in CI,** the connection switched with the emulator's airplane
  mode; **the iOS Simulator and the iPhone are walked by hand,** offline on the
  iPhone, since the Simulator has no switch of its own.
- **The cellar's accessibility walk is this task's,** following
  `mobile/accessibility-walk.md` over every cellar screen, as
  [task 23](23-a-sheet-puts-voiceovers-focus-on-its-heading.md)'s Non-goals
  hand it here.
- **A lapsed free signing does not excuse the iPhone walk:** the phone is
  re-signed with `make mobile-ios-device` and walked.
- **The hand walk includes a beer suggested from the Add form**
  ([task 26](26-a-user-suggests-a-beer-the-catalog-lacks-while-adding-bottles-of-it.md));
  the Maestro journey adds a catalog beer.

## Open questions

**None.**

## Acceptance criteria

- [ ] A Maestro flow signs in, adds bottles from the Add action, edits one and
      removes one on Android, and was confirmed to fail without the cellar
- [ ] A Maestro flow reads the last-loaded cellar with the emulator in airplane
      mode after a restart and reads the refusal of a write, on Android, and was
      confirmed to fail with the cache off
- [ ] Both flows are part of the mobile e2e test run in `make verify` and in CI
- [ ] The product owner walked the journey on the iOS Simulator and on their
      iPhone, offline and a suggested beer included, and the result is written
      in the pull request without an image
- [ ] The product owner walked the cellar's screens with VoiceOver on the
      iPhone and TalkBack on Android, following `mobile/accessibility-walk.md`,
      recorded in words in the pull request
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Cellar end-to-end flows
on both platforms").
