# Task 01: Decide how a mobile direction is prototyped and signed off

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-1

## Why

The `design-task` skill and [ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)
are written for the web throughout: mockups that switch between a phone width
and a desktop width, the chosen direction confirmed in the browser pane, and
`@axe-core/playwright` scans and keyboard-only tests as what a design task
ships with. None of that describes an app. A phone's design is mostly what a
page cannot show: how a sheet follows a finger, what a swipe does, how the
type reflows at the largest Dynamic Type size, what a haptic feels like.

Four design tasks follow this one, and each would otherwise invent its own way
to look at a direction — the twelve-processes failure
[iteration 7.5 task 01](../iteration-7.5/01-how-a-design-task-runs.md) was
written to prevent. The way a direction is looked at also decides what the
product owner can judge: a framed Artifact is cheap to share and lies about
motion and touch, a throwaway native build is true and costs a build and a
phone.

## Scope

An ADR records how a direction for the app is prototyped, how it reaches the
product owner, how the chosen one is confirmed in the real app and signed off,
and what a design task for the app ships with in place of the web's widths,
browser pane and `axe` scans. It amends ADR-0062, and the `design-task` skill
is amended to match, so that one skill covers a web and a mobile design task.

## Non-goals

- Designing anything — the first design task is
  [task 02](02-design-the-interaction-model-and-navigation.md).
- The accessibility conventions the app's screens are checked against, which
  are [task 11](11-mobile-accessibility-conventions.md)'s; this task decides
  only what evidence a design task carries.
- The token format ([task 06](06-decision-the-design-token-format.md)).

## Constraints

- Accepted ADRs are amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)); a skill orders
  gates and changes none of them
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)).
- **Kalia adds no cost** ([`CLAUDE.md`](../../../CLAUDE.md)): no paid account,
  cloud build or device farm. A native prototype runs on a simulator or an
  emulator, or on the product owner's own iPhone, which free provisioning
  re-signs every seven days
  ([mobile README](../../../mobile/README.md#re-signing-after-seven-days)) and
  reaches the stack only in phone mode
  ([ADR-0097](../../adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)).
- No mockup or prototype code is committed, and a screenshot never leaves the
  scratchpad ([rule](../../../.claude/rules/no-screenshots.md)) — a simulator
  capture is a screenshot.
- A new dependency is asked about, not researched
  ([`CLAUDE.md`](../../../CLAUDE.md)).
- DW-1 says the product owner judges "on a phone"; the app ships on iOS and
  Android ([ADR-0094](../../adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)),
  and only an iPhone is the owner's.

## Open questions

- **Functional scope.** Which route for which kind of choice: framed Artifacts
  for layout and identity, a native build for gesture, motion and haptics, or
  a native build for everything?
- **Where the product owner judges.** Their iPhone, a simulator, or either
  depending on the choice; and for Android, which has no phone of theirs,
  whether an emulator is the sign-off. What does a prototype need from the
  stack, and does it run in phone mode?
- **Edge cases.** When the phone's seven-day signing has lapsed mid-task, what
  is the fallback — the simulator, or a wait?
- **Where a native prototype lives** so that none of it is committed: the
  scratchpad, or a branch that is never merged.
- **Terminology.** Whether the `Kind: design` marker needs a platform, or the
  skill's steps branch on what the task says; and whether `check-tasks.mjs`'s
  "built alternatives" rule changes.
- **Completion signals.** What replaces the `axe` and keyboard criteria in a
  design task's pull request, stated in words since no image is allowed.

## Acceptance criteria

- [ ] An ADR records the decision and the alternatives rejected, amends
      ADR-0062, and passes `node scripts/check-adrs.mjs`
- [ ] `.claude/skills/design-task/SKILL.md` names the route for building,
      showing and confirming a direction for the app, and what the pull
      request carries in place of widths and `axe` scans
- [ ] Any change to the `Kind` rule is covered by `scripts/check-tasks.test.mjs`
      and fails without the change, or the ADR says none was needed
- [ ] The chosen route was rehearsed: one throwaway screen was shown to the
      product owner by it, and they confirmed it let them judge what a framed
      page could not
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Decision: how a mobile
direction is prototyped and signed off"). Runs before every design task here.
