# Task 15: Nothing is drawn beneath the central Add action

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

On the product owner's iPhone, in the built app, a gray shape sits beneath the
navigation's central Add circle. It looks like parts of another tab's icon,
with two small legs below it. The navigation was approved without it
([ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md),
[design record](../../design-records/iteration-11-22-mobile-tab-icons.md)).
It is the first thing a user sees on every screen. The Add action also becomes
the cellar's entry point in iteration 12.

## Scope

- The overlap is reproduced, its cause is named, and it is removed.
- The navigation looks as approved and its accessibility is unchanged: the Add
  action's role, label and focus order, and the four tabs'.
- A test holds the cause, so the shape cannot come back unnoticed.

## Non-goals

- Redesigning the navigation, the tab icons or the Add sheet.

## Constraints

- ADR-0109 and the tab-icon design record are the approved navigation. A
  change to how it looks needs the product owner's sign-off on the phone
  ([ADR-0108](../../adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)).
- **Expo Router's tabs and React Navigation's tab bar postdate model
  training.** How a tab with a custom button draws its default icon and label
  is checked at docs.expo.dev for the SDK in `mobile/package.json`, never
  from memory.
- No screen capture leaves the machine
  ([rule](../../../.claude/rules/no-screenshots.md)). The pull request
  describes the before and after in words.

## Open questions

- **Edge cases.** Does it appear on the iOS Simulator, on Android, in a
  development build, in dark mode, or at the largest text size? The answers
  say whether this is the tab bar's default icon, a label, or something else.
- **Completion signals.** Which build does the product owner sign off on: a
  release build on the phone, or the Simulator once the cause is shown?

## Acceptance criteria

- [ ] The cause is named in the pull request, reproduced on a build where the
      shape appears
- [ ] A test that would have failed on the defect holds the fix, for example
      by showing that the Add route's tab renders no default icon or label.
      It was seen to fail before the fix
- [ ] The navigation's accessibility tests and the Android Maestro flows pass
      unchanged
- [ ] The product owner confirms on the phone that the shape is gone and the
      navigation is otherwise as approved
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-138, reported by
the product owner from the phone on 2026-11-10.
