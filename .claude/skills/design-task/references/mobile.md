# Mobile design task

The mobile part of the [`design-task`](../SKILL.md) procedure, read at its
step 4 for a task whose `Scope` is the phone app. Each section below is run
from the step of `SKILL.md` that names it; the shared rules there — three
directions in round one, blends only as built directions, stopping only on a
named choice — hold throughout.
[ADR-0108](../../../../docs/adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)
is the decision this file carries out.

## Explore and converge

1. **Choose the route from the question the task asks.** A frame and a native
   build answer different questions, so the route follows what the direction
   has to prove:
   - **Appearance** — layout, identity, the dark palette — is explored in
     **framed directions**: cheap to build and to put side by side.
   - **Behaviour** — navigation feel, a gesture following a finger, a native
     transition, motion, haptics — is explored in **native directions**. A
     frame cannot show it, so do not build frames for it first.
   - A task that asks both explores each part on its own route, each with
     three directions in its first round, and the appearance can be settled
     in frames before the behaviour is built.

   Tell the product owner the route and why before building round one. If the
   task's `Constraints` name a route, follow it; if the question does not
   settle the route, ask.
2. **Framed directions.** Three distinct directions, differing in a
   structural choice rather than a colour swap, in a phone frame: the app's
   real screens with real seed data, English and Finnish strings, and a switch
   to the largest text size. Write them in the session's scratchpad — **no
   mockup code is committed** — and show each as a private Artifact, with the
   same HTML file in the desktop app's browser pane as the fallback; if
   neither is available, say so plainly and ask how the product owner wants
   to look at them.
3. **Native directions.**
   - Before the first native build, create a second, disposable git worktree
     cut from up-to-date `dev`, set up by the
     [`worktree` skill](../../worktree/SKILL.md). Leave its direction changes
     uncommitted and remove it when the design task ends. Give it its own
     stack ports and use the local stack with phone mode off. A native build,
     simulator and emulator count as heavy work under `CLAUDE.md`'s
     two-session limit.
   - Three distinct directions for a behaviour question may be one build with
     an in-app switch between them, so each is felt without a rebuild.
   - Show each native round in Device Hub's live iOS Simulator against the
     local stack. Show Android once per task on the emulator, where its
     conventions differ. Never substitute a screenshot for a live native
     round; a capture taken to look closely stays in the scratchpad and is
     never committed, pushed or uploaded. The Simulator has no haptic engine: show which haptic would fire,
     and leave judging its feel to the iPhone.
4. **Taking a framed direction native.** When an appearance task also needs
   its behaviour felt, or the product owner wants a framed direction on the
   device, ask explicitly which direction or directions to build natively, and
   build only those: native builds are reserved for candidates the owner
   wants to explore on the device
   ([ADR-0108](../../../../docs/adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)
   rejects building every alternative natively). Do not infer the selection
   from feedback. Selecting candidates for native exploration is not the
   final choice.
5. **Converge** as `SKILL.md` step 5 says, each round on the route it needs.
6. **Get the final sign-off on the iPhone.** Stop when the product owner names
   the direction and signs it off on their iPhone in phone mode; haptics are
   judged only there. If the iPhone's seven-day signing lapses, continue
   rounds in the Simulator and wait for a re-sign before sign-off. A direction
   seen only in frames is signed off once it is built and running on the
   phone, at `SKILL.md` step 8.

## Confirm in the real app

Confirm the built direction in the native app and get the product owner's
final sign-off on the iPhone in phone mode. Record their VoiceOver walk on the
iPhone in words — the Simulator has no VoiceOver — and attach no recording or
screenshot.

## Evidence

Component tests find every control by role and accessible name and render
each changed screen at the largest font scale, covering the changed behaviour
where it is automatable; behaviour that is not, such as a haptic's feel, rests
on the iPhone sign-off. The pull request records the VoiceOver walk in words.
The task's own accessibility criteria still define what is checked.

## Gates

Add to `SKILL.md`'s lines: the route each round took and why, which framed
directions were selected for native prototyping if any were, the iOS
Simulator and Android checks, the iPhone sign-off and VoiceOver walk, and the
component-test coverage.
