# Task 05: Design what moves and what is felt

- **Status:** refined
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-1
- **Kind:** design

## Why

Motion and touch are most of what makes an app feel native, and the part of a
design a mockup cannot show. The web's rules
([`docs/design.md`](../../design.md#motion)) cover a transition on a hover; an
app has screens that slide, sheets that follow a finger, lists that insert and
refresh, and a device that can tap back. Left undecided, each primitive
([task 08](08-mobile-ui-primitives.md)) picks its own timing, and the result is
a dozen almost-matching feels.

A user who has asked the system for reduced motion must still be able to use
every screen, which is cheapest when the answer is part of the design rather
than added to each screen.

## Scope

What moves — screen transitions, sheets, list changes, loading and refresh —
how, and for how long; what is felt — which actions carry a haptic, and which
do not; and what each becomes when the system asks for reduced motion. Built as
native prototypes on the real screens, since neither can be judged in a frame.

## Non-goals

- Navigation structure — [task 02](02-design-the-interaction-model-and-navigation.md).
- Colour and type — [task 03](03-design-kalias-identity-on-a-phone.md).
- The mark's own animation, if any, beyond what the splash already does.

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), run
  under the `design-task` skill as [task 01](01-decision-how-a-mobile-direction-is-prototyped-and-signed-off.md)
  amends it; the directions are judged on a device or simulator, never from a
  description.
- Reduced motion is honoured on both platforms
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)): no
  information is carried by motion alone, and no screen depends on one to be
  understood.
- A haptic library is a new dependency — ask which version
  ([`CLAUDE.md`](../../../CLAUDE.md)) — and a haptic is a no-op where the
  device or simulator lacks the motor, so no test or flow depends on one.
- Motion is part of the token layer's vocabulary
  ([task 06](06-decision-the-design-token-format.md)): durations and easings
  are values, not literals in a component.

**Decided at refinement, 2026-11-07** (product owner):

- **Haptics and reduced motion follow the system settings;** there is no
  in-app switch.
- **What is felt is judged on the product owner's iPhone**
  ([task 01](01-decision-how-a-mobile-direction-is-prototyped-and-signed-off.md)):
  the Simulator has no haptic engine.
- **The lowest-end device is the Android reference emulator:** an animation
  that drops frames there is a finding for the product owner, not a tuning
  left to the build.
- **A list that updates while it is scrolled never moves content under the
  user's finger:** rows inserted above the viewport keep the scroll position.

## Open questions

**None.**

## Acceptance criteria

- [ ] The product owner chose from built alternatives, at minimum the motion's
      amount and the set of felt actions, judged on a device or simulator on
      the route task 01 chose; an ADR records the directions and the choice
- [ ] A component test shows every animated primitive reaching its final state
      immediately when reduced motion is on
- [ ] A test shows the haptic helper doing nothing, and not throwing, where the
      device has no haptic engine
- [ ] The product owner signed off the built motion live, with the system's
      reduce-motion setting on and off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Design: motion and
haptics"). `docs/design.md` gains a mobile motion section as standing intent.
