# ADR-0108: A mobile direction is explored as a mockup or native build, then signed off on the owner's phone

- **Status:** accepted
- **Date:** 2026-11-08

## Context

The `design-task` procedure and [ADR-0062](0062-a-design-task-is-a-skill-and-a-marker.md)
were written for web pages. A framed mockup is enough to judge layout and
identity, but it cannot show what a gesture, transition or haptic feels like.
The mobile design tasks need a repeatable way to choose between those routes,
show directions on both platforms, and confirm the chosen direction on the
phone it is meant for.

The app's native builds run locally at no cost
([ADR-0094](0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)).
The product owner has an iPhone, but not an Android phone; the local stack is
reachable from an iPhone only in phone mode
([ADR-0097](0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md)).

## Decision

**A mobile design is explored in a framed Artifact when its appearance is the
question, and in a native build when its behaviour is; the chosen direction is
confirmed and signed off on the product owner's iPhone.**

- **Framed directions** show layout, identity and the dark palette in a phone
  frame, with real seed data, English and Finnish strings, and a switch to the
  largest text size. These are private Artifacts; their code is not committed.
- **Native directions** show navigation feel, gestures, motion and haptics in
  development builds. Each round is shown in Device Hub's live iOS Simulator
  against the local stack, with phone mode off. Android is shown once per
  design task on the emulator, to check where its conventions differ.
- **Confirmation and sign-off** happen on the product owner's iPhone in phone
  mode. Haptics are judged there, not in the Simulator. If the iPhone's
  seven-day signing lapses, work continues in the Simulator and sign-off waits
  until the app can be re-signed.
- **A native prototype** lives in a disposable git worktree cut from up-to-date
  `dev`. Its direction changes remain uncommitted; it uses the local stack and
  the worktree is removed when the design task ends. The native build counts
  toward the two-session heavy-work limit in [`CLAUDE.md`](../../CLAUDE.md).
- **Mobile design-task evidence** replaces the web's width and `axe` checks:
  component tests find each control by role and accessible name and render
  changed screens at the largest font scale; the product owner performs a
  VoiceOver walk on the iPhone and records it in words in the pull request.
  The Simulator has no VoiceOver. The task's own accessibility criteria still
  govern what the screens must satisfy.

The `design-task` skill branches on the platform named in the task's `Scope`.
`Kind: design` gains no platform value, and the task checker is unchanged;
no change to the `Kind` rule was needed.
Choosing and building remain one task and one pull request, and the chosen
design is built into the token source established by
[task 07](../tasks/iteration-11/07-token-pipeline.md).

## Alternatives considered

**Use framed mockups for every mobile direction.** Rejected because a frame
cannot show a gesture following a finger, a native transition, or what a
haptic feels like. A static render is not evidence for those choices.

**Build every visual alternative natively.** Rejected because layout,
identity and palette can be compared in a framed Artifact without repeated
native builds; the native route is reserved for questions that depend on
behaviour or the device.

**Run every round and sign-off only on the iPhone.** Rejected because a
round-by-round phone install and free-provisioning renewal would make visual
iteration wait on the device. The Simulator supports rounds, while the
product owner's iPhone remains the final authority for sign-off and haptics.

**Skip Android during design.** Rejected because platform conventions can
differ even when the structure is shared. One emulator check per task is enough
to surface those differences without duplicating every iOS round.

## Consequences

- Good, because a direction is judged using evidence that matches the question:
  static appearance in an Artifact and native behaviour in the app.
- Good, because the final choice is checked on the actual iPhone, and Android
  differences are not left until after the navigation and design are built.
- Bad, because native rounds require local simulator tooling and the final
  sign-off depends on the product owner's iPhone being signed and available.
- Bad, because a pull request cannot carry the VoiceOver evidence as a
  recording or screenshot; it records the product owner's walk in words.
- Neutral, because rejected mockups and native prototype code do not survive
  in the repository; the ADR records the decision, and the pull request records
  what the owner saw.

## Evidence

The throwaway native screen was built and launched on the iPhone 18 Pro
Simulator. On 2026-11-08, the product owner opened the Filter sheet and
swiped it down, confirming that the native presentation and gesture let them
judge behavior a framed page could not.
