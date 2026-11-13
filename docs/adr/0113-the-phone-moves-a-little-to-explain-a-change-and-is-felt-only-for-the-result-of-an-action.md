# ADR-0113: The phone moves a little to explain a change and taps only for the result of an action, both following the system's settings

- **Status:** accepted
- **Date:** 2026-11-13

## Context

A phone app is mostly motion and touch: screens change, sheets follow a finger,
lists fill and refresh, and the device can tap back. A mockup shows none of it,
so [ADR-0108](0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)
sends the question to a native build judged in the iOS Simulator, once on the
Android emulator, and on the owner's iPhone for what is felt. Left to each
primitive ([task 08](../tasks/iteration-11/08-mobile-ui-primitives.md)),
timings would drift into a dozen almost-matching feels, and a person who has
asked the system for reduced motion would meet the gaps.

Decided before the directions were built: haptics and reduced motion follow the
system settings with no in-app switch; a list that updates while scrolled never
moves content under the finger; durations and easings are token values
([ADR-0107](0107-one-typescript-token-source-generates-the-webs-css-the-apps-theme-and-keycloaks-stylesheet-by-a-generator-of-our-own.md));
no information is carried by motion alone
([ADR-0075](0075-the-accessibility-bar-is-wcag-2-2-aa.md)).

## Decision

**The phone moves a little and only to explain a change, and it taps the person
only for the result of something they did; both follow the system's settings.**
[`docs/design.md`](../design.md#mobile-motion) holds the standing rules.

- **Motion is eased.** Tabs cross-fade, a pressed control shrinks slightly,
  arriving content fades in once, rows that stay slide to their new place, and
  loading shows placeholders that breathe beside the words "loading". A pushed
  screen and a sheet keep the platform's own transition.
- **Felt actions are the outcomes.** A success, a warning and an error: saved,
  removed, failed. Taps, tab changes, sheets and refreshes carry no haptic.
- **Reduced motion** is the system setting on both platforms, read once at
  start-up and followed live. Each primitive then reaches its final state at
  once; a pushed screen cross-fades.
- **The values are tokens** (`duration` press, reveal, layout, tab and pulse;
  easing `in-out`), and the haptic helper does nothing, and does not throw,
  where there is no motor.

## Alternatives considered

The directions were built once, as one native app with two independent
switches, so any motion amount could be felt with any set of felt actions. The
owner named the mild pair from what was shown, on 2026-11-13.

**Motion: Still.** Tabs switch at once, a press only dims the control to 60%
opacity, rows appear, loading is static grey blocks, and only the platform's own
push, sheet and pull-to-refresh move. Not chosen: the owner preferred the mild
amount of motion in Eased.

**Motion: Springy.** Tabs slide with a spring, a press shrinks to 0.94 with a
spring, rows rise in staggered, a list insert bounces, loading is a shimmer
sweep, and rows re-enter after a refresh. Not chosen: it moves the most, costs
the most to keep inside a token vocabulary (spring stiffness and damping are a
third kind of value beside duration and easing), and the owner chose the milder
one.

**Felt: Outcomes plus navigation.** Adds a tick on tab change, a tap when the
add sheet opens, a tap when pull-to-refresh crosses its threshold and a tick
when it finishes. Not chosen: those are taps for actions that already have a
visible result, and the owner chose the smaller set.

**Felt: Every touch.** Adds a light tap on every button and row press. Not
chosen for the same reason, and it taps most often on the control used most.

**Custom screen transitions and sheets.** A custom push or a custom sheet was
not built: the platform's own follow a finger and honour reduced motion, which a
replacement would have to rebuild.

## Consequences

- Good, because one vocabulary of five durations and two easings covers every
  primitive, and reduced motion is answered once, in the primitives, rather than
  per screen.
- Good, because a haptic that carries a result is never the only sign of it, and
  a missing motor costs nothing.
- Bad, because the haptic helper has no caller yet: the app has no action that
  saves or removes anything, so the first feature that does must call it, and
  that task owns the check that it does.
- Bad, because the pushed-screen fade under reduced motion is set on the root
  stack with no screen to test it on; the first pushed screen must confirm it.
- Bad, because the app follows the system's haptics setting and iOS has two
  switches that can silence it (System Haptics, and Vibration under
  Accessibility, Touch); a person with either off feels nothing, which is by
  design but looks like a fault.
- Neutral, because Android's emulator cannot hold 60 frames a second on any
  screen, with or without this motion; see Evidence.
- **Revisit trigger:** a feature that adds or removes something, such as the
  cellar, wires `haptic()`; if Eased reads as flat on a real Android phone, the
  amount is the thing to revisit, and a spring would need a token family of its
  own first.

## Evidence

The native prototype was a development build of the real screens against the
local stack, in a disposable worktree, with a panel switching motion (Still,
Eased, Springy), felt set (outcomes, plus navigation, every touch) and a
reduce-motion override. It added a scratch beer screen with "Add to cellar",
"Remove from cellar" and a failure button for the outcome haptics, and an
"insert a beer" action to check that the catalog keeps its scroll position. The
Simulator has no haptic engine, so the panel flashed the haptic that would fire.
The code is not committed.

The Android emulator (Medium Phone, API 37, 60 Hz) was measured on a release
build by driving tab switches, a push, the add sheet and scrolling with `adb`
and reading `gfxinfo`. Janky frames, Eased against Still: scrolling 72% against
82%, tabs 71% against 78%, push 79% against 83%, sheet 88% against 85%; median
frame time 32 to 48 ms in both, against a 16.7 ms budget. The emulator misses
the deadline on every screen with no animation, and Eased adds no measurable
cost over it. A debug build gave the same picture. The finding went to the
owner; the figures say nothing about a real Android phone.

On the owner's iPhone SE (3rd generation), in phone mode, a release build with
Eased and Outcomes was tried with Reduce Motion off and on. The owner first felt
nothing: the system's haptics setting was off. After enabling it, the owner felt
the outcome haptics and approved the built motion with Reduce Motion off and on.
A VoiceOver walk was not done for this task.

The haptic library is `expo-haptics`, at the version Expo SDK 58 lists as
compatible, approved by the owner on 2026-11-12.
