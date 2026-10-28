# Task 10: A developer can run the app on both simulators from the README

- **Status:** needs-refinement
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-1

## Why

Native mobile development needs a toolchain this repository has never asked
for: Xcode and its command-line tools, an iOS Simulator runtime, Android Studio
with an SDK, an emulator image and a JDK of its own, CocoaPods. Each has
versions that must agree with the stack chosen in
[task 02](02-decision-the-mobile-stack.md), and most fail with errors that do
not name the version that was wrong. The backend already shows the pattern:
Maven picks up a JDK the build cannot use and fails Lombok with a cryptic
message.

`DW-1` makes the README the deliverable — someone following it on a fresh Mac
gets the app running on both simulators — and the iOS Simulator and the
Android emulator reach the local stack differently (`localhost` directly, `adb
reverse` respectively).

## Scope

`mobile/README.md` takes a developer from a Mac with none of the toolchain to
the app running on the iOS Simulator and the Android emulator against the local
stack, and `make` targets do the repeatable parts.

## Non-goals

- A real phone — [iteration 10](../iteration-10.md).
- Linux or Windows hosts; iOS needs macOS, and the product owner's machine is a
  Mac.

## Constraints

- [Task 02](02-decision-the-mobile-stack.md)'s stack and minimum OS versions.
- Each worktree runs its own stack on its own ports: never hard-code a port
  (`CLAUDE.md`), including in `adb reverse`.
- Toolchain versions are new dependencies — asked, then recorded in the one
  manifest that pins them and nowhere else
  ([ADR-0020](../../adr/0020-documentation-roles.md)).

## Open questions

1. **Which JDK does the Android build use**, given the backend needs JDK 25 and
   Android's Gradle plugin supports an older one — and how does a developer
   keep both without one breaking the other?
2. **Where are toolchain versions pinned?** An `.xcode-version`, the Gradle
   wrapper and `app.json` are manifests; the README names the tools without
   numbers.
3. **Which `make` targets?** Candidates: start Metro, build and run on iOS,
   build and run on Android with `adb reverse` set from the worktree's ports,
   and a doctor target that checks the toolchain.
4. **How is "a fresh Mac" verified?** A new macOS user account, a clean
   virtual machine, or a reviewer who has not installed the toolchain before.
5. **Which simulator and emulator devices** are the reference ones that
   end-to-end flows and screenshots-in-words describe?

## Acceptance criteria

- [ ] Following `mobile/README.md` from a Mac without the toolchain, the app
      runs on the iOS Simulator and the Android emulator against the local
      stack — verified as refinement agrees, and described in the PR
- [ ] The `make` targets start the app on each platform, and the Android one
      sets `adb reverse` from the worktree's ports rather than a fixed one
- [ ] A doctor script reports a missing or wrong-version tool by name, with a
      test covering at least the JDK case
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 9](../iteration-9.md)'s closing note on how each
simulator reaches the Mac.
