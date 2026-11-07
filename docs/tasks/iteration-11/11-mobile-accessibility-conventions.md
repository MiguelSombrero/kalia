# Task 11: Mobile accessibility is written down and checked in tests

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-4

## Why

[ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md) sets
Kalia's bar as WCAG 2.2 AA and the [mobile README](../../../mobile/README.md)
turns it into three rules: a label on each tab, the heading role, and no text
that refuses to scale. That is the web's bar in a sentence, and the web has the
machinery behind it — `@axe-core/playwright` on every state, keyboard-only
tests. The app has no equivalent, and what a screen reader or a larger text
size does to a screen is not visible in a Jest render or a screenshot.

The catalog is the first feature to be built with the design language, so it is
the one that proves a design survives VoiceOver, TalkBack and the largest
Dynamic Type size — and the first place a convention for the cellar, feed and
scan screens of the iterations after it can be tried.

## Scope

The conventions, written in the mobile README and ADR-0075 where they bind: how
a control gets a role and a name, the smallest tap target, how focus moves
into and out of a sheet, how a list announces itself, how state changes are
announced, what reduced motion does, and what text may never do at the largest
size. Alongside them, what checks them: which are automatic (a test helper
asserting the structure of a rendered screen, a lint rule), which are done by
hand on VoiceOver and TalkBack (a short script, since no screen reader runs
in CI at no cost), and where a hand check is recorded. The catalog's screens —
the list, the filter sheet, search, a beer's page — are then checked against
all of it, and what fails is fixed here.

## Non-goals

- Making the screens that tasks 02–10 build; this checks them, and fixes only
  what the check finds.
- Screens that do not exist yet.
- A paid accessibility service or a device farm.

## Constraints

- Platform terms for a WCAG 2.2 AA criterion are the mapping this task writes;
  it does not weaken the bar
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)), and
  amends that ADR rather than writing a second.
- Tests run on Jest and React Native Testing Library, and flows on Maestro with
  Android the only CI platform
  ([ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)).
  Anything that needs iOS, VoiceOver or a real screen reader is a recorded hand
  check, not a CI job.
- A new lint plugin or test library is a new dependency — ask which version
  ([`CLAUDE.md`](../../../CLAUDE.md)).
- No screenshot leaves the scratchpad
  ([rule](../../../.claude/rules/no-screenshots.md)); a hand check is recorded
  in words.
- Contrast is already held by `scripts/check-contrast.mjs`.

**Settled at the 2026-11-07 refinement** (product owner); the task is refined
once the design tasks' ADRs land:

- **VoiceOver is walked by the product owner on their iPhone:** the iOS
  Simulator has no VoiceOver, only Accessibility Inspector.
- **TalkBack is walked on a second emulator with a Google Play system image,**
  used only for hand checks; the product owner signs in to Play on it once to
  install Android Accessibility Suite. The reference emulator, Maestro's and
  CI's, is unchanged.

## Open questions

- **Functional scope.** Which of the checks are worth automating at all, given
  that a structural assertion proves a name exists and not that it is a good
  one.
- **Non-functional.** What "the largest Dynamic Type size" is on each platform
  (iOS's accessibility sizes, Android's font scale) and how a test or a hand
  check reaches it.
- **Completion signals.** Where a hand check is recorded so a later iteration
  can repeat it.
- **Integrations.** Whether Maestro can drive TalkBack on the Google Play
  emulator, or the TalkBack walk stays by hand.

## Acceptance criteria

- [ ] The mobile README states each convention and how it is checked, and
      ADR-0075 is amended to map WCAG 2.2 AA onto them
- [ ] A test helper fails a rendered screen that has a pressable without a role
      and a name or a tap target below the minimum, and was confirmed to fail
      against a fixture with an unlabelled control
- [ ] A component test renders each catalog screen at the largest font scale
      and shows no text clipped by a fixed height
- [ ] The catalog's list, search, filter sheet and beer page were walked on
      VoiceOver (the product owner's iPhone) and TalkBack (the Google Play
      emulator) and at the largest text size, following the written script, and the result is
      recorded in the pull request in words
- [ ] What the hand checks found is fixed, or recorded in the quality backlog
      with an ID that the pull request names
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Mobile accessibility
conventions"). The design tasks' own evidence in place of `axe` is
[task 01](01-decision-how-a-mobile-direction-is-prototyped-and-signed-off.md)'s
decision; this task writes the conventions those screens are held to.
