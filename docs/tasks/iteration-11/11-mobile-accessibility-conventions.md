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

The first walk of the catalog's controls on VoiceOver showed it. On an iPhone
with a Finnish voice, React Native's choice rows were spoken with English words
from its own translation table, mispronounced as Finnish ("hetkept"), and a
picker opened inside the filter sheet left VoiceOver to pick its own landing
element. Neither is visible to Jest, and the fix
([PR 620](https://github.com/MiguelSombrero/kalia/pull/620)) records two
findings it left to this task: a role whose spoken words React Native supplies
is not safe to use on iOS, and a page swap inside a sheet needs an explicit
focus event, going in and coming back.

The catalog is the first feature to be built with the design language, so it is
the one that proves a design survives VoiceOver, TalkBack and the largest
Dynamic Type size — and the first place a convention for the cellar, feed and
scan screens of the iterations after it can be tried.

## Scope

The conventions, written in the mobile README and ADR-0075 where they bind: how
a control gets a role and a name, the smallest tap target, how focus moves
into and out of a sheet and between a sheet's pages, how a list announces
itself, how a state or a position in a set is spoken, how state changes are
announced, what reduced motion does, and what text may never do at the largest
size. Alongside them, what checks them: one automatic test helper asserting the
structure of a rendered screen, and a written script for the hand checks on
VoiceOver and TalkBack, since no screen reader runs in CI at no cost, kept in
a file of its own under `mobile/` so it is not loaded in every session, with the
result of each walk recorded in the pull request in words.

The catalog's screens — the list, search, the filter sheet and its pickers, a
beer's page, and the tab bar with its icons and Add — are then checked against
all of it, and what fails is fixed here. The helper and the largest-text test run
over every screen that exists; the hand walk covers the screens above, and
carries the walks that
[task 22](22-design-mobile-tab-icons.md) and
[task 23](23-design-the-catalogs-search-and-filters.md) owe.

## Non-goals

- Making the screens that tasks 02–10 build; this checks them, and fixes only
  what the check finds.
- A hand walk of the screens beyond those named: Profile, the Add and sign-in
  sheets and the blocked screens are checked by the helper and the largest-text
  test only.
- Screens that do not exist yet.
- A lint plugin, a paid accessibility service or a device farm.

## Constraints

- Platform terms for a WCAG 2.2 AA criterion are the mapping this task writes;
  it does not weaken the bar
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)), and
  amends that ADR rather than writing a second.
- Tests run on Jest and React Native Testing Library, and flows on Maestro with
  Android the only CI platform
  ([ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)).
  Anything that needs iOS, VoiceOver or a real screen reader is a recorded hand
  check, not a CI job. Maestro drives the app through the accessibility tree
  and does not run a screen reader, so the TalkBack walk stays by hand.
- **A state or a position is spoken in words that are ours or the platform's
  own, never React Native's.** Its `radio` and `checkbox` roles add English
  "checked" and "unchecked" on iOS from a table of its own, which a Finnish voice
  mispronounces; iOS speaks `button` with `selected` in the voice's language
  ([PR 620](https://github.com/MiguelSombrero/kalia/pull/620)). Any word
  the platform does not supply comes from `@kalia/locales`. A choice row on iOS
  therefore says its position in the set ("2 of 5") from `en` and `fi` strings.
  Android keeps `radio`, which TalkBack speaks in the device's language; the
  TalkBack walk confirms the position is said there.
- **Tap targets are at least `--spacing-touch`** (48), the identity's own
  ([`docs/design.md`](../../design.md#mobile-identity)). Jest has no layout, so
  the helper reads the declared size of a pressable.
- **The largest text size** is iOS's accessibility size 5 and Android's 200 %,
  and a Jest font scale of 3.1, as
  [task 23](23-design-the-catalogs-search-and-filters.md) used.
- A new test library is a new dependency — ask which version
  ([`CLAUDE.md`](../../../CLAUDE.md)). None is planned.
- No screenshot leaves the scratchpad
  ([rule](../../../.claude/rules/no-screenshots.md)); a hand check is recorded
  in words.
- Contrast is already held by `scripts/check-contrast.mjs`.
- **This task runs last,** after the catalog's screens
  ([09](09-catalog-search-and-list.md), [10](10-beer-details.md)) exist, and
  builds on the filter pickers' VoiceOver fix, which must have merged.
- **The iPhone sign-off is counted as
  [the iteration index](../iteration-11.md#the-iphone-sign-off) says;** this
  task is where the walks owed under it are made.

**Settled at the 2026-11-07 refinement** (product owner):

- **VoiceOver is walked by the product owner on their iPhone:** the iOS
  Simulator has no VoiceOver, only Accessibility Inspector.
- **TalkBack is walked on a second emulator with a Google Play system image,**
  used only for hand checks; the product owner signs in to Play on it once to
  install Android Accessibility Suite. The reference emulator, Maestro's and
  CI's, is unchanged.

**Settled at the 2026-11-13 refinement** (product owner):

- **The product owner walks TalkBack too,** driving the emulator with the mouse
  and keyboard from the script; an Android phone is not needed. The emulator's
  "Display speech output" setting prints each spoken phrase, which the record
  quotes.
- **The VoiceOver walk uses both voices,** Finnish and English, since a voice
  that mispronounces a word is what the first walk found.
- **The automatic check is one test helper, not a lint plugin:** a lint rule sees
  little through the app's own primitives.
- **The hand walk's scope** is the catalog's list, search, filter sheet and
  pickers, a beer's page and the tab bar; the helper and the largest-text test
  cover every screen.
- **The helper and the Google Play emulator are not pulled forward;** this task
  stays last, after the catalog screens.
- **The walks owed by [task 22](22-design-mobile-tab-icons.md) (the tab bar),
  [task 23](23-design-the-catalogs-search-and-filters.md) (the filter controls)
  and the re-walk of the filter pickers' fix are made here,** with this task's
  own.

## Open questions

**None.**

## Acceptance criteria

- [ ] The mobile README states each convention and how it is checked, and
      ADR-0075 is amended to map WCAG 2.2 AA onto them
- [ ] A test helper fails a rendered screen that has a pressable without a role
      and a name, a pressable declaring a tap target below the minimum, or an
      iOS pressable carrying a `radio` or `checkbox` role, and was confirmed to
      fail against a fixture of each; every screen under `mobile/src/app` passes
      it
- [ ] A component test renders each catalog screen — the list, the filter
      sheet with a picker open, a beer's page — and the tab bar at the largest
      font scale and shows no text clipped by a fixed height
- [ ] A component test shows a choice row on iOS saying its position in `en`
      and `fi` from the app's strings, and on Android leaving it to the role
- [ ] A component test shows opening a picker and returning to the form each
      moving focus to the new page's heading
- [ ] The catalog's list, search, filter sheet and pickers, a beer's page and the
      tab bar were walked on VoiceOver (the product owner's iPhone, in both
      voices) and TalkBack (the Google Play emulator, the product owner driving)
      and at the largest text size, following the written script, with the walks
      owed by tasks 22 and 23 among them, and the result is recorded in the pull
      request in words; the iPhone leg may be waived by the product owner in
      that record
- [ ] What the hand checks found is fixed, or recorded in the quality backlog
      with an ID that the pull request names
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Mobile accessibility
conventions"). The design tasks' own evidence in place of `axe` is
[task 01](01-decision-how-a-mobile-direction-is-prototyped-and-signed-off.md)'s
decision; this task writes the conventions those screens are held to. The
findings from the first VoiceOver walk are in
[PR 620](https://github.com/MiguelSombrero/kalia/pull/620)'s description.
