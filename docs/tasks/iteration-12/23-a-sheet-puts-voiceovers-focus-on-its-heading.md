# Task 23: A sheet puts VoiceOver's focus on its heading

- **Status:** done
- **Iteration:** [12](../iteration-12.md)
- **Covers:** none

## Why

On an iPhone with VoiceOver in a Finnish voice, the catalog's filter sheet does
not put focus where [`mobile/CONVENTIONS.md`](../../../mobile/CONVENTIONS.md)
("Focus follows the page") says it goes:

- **Opening the sheet** lands on the "Sulje" (Close) button, not the
  "Suodattimet" heading. `FiltersSheet` sends the focus event only after a page
  *change* (`moved.current`), so nothing is sent on opening, and Close is the
  first element of the sheet's header (SHOULD-119).
- **Coming back from a picker** reads "Sulje" first and only then moves to the
  heading, although the event is sent on every page change. The event probably
  runs before the page is on screen, or loses to the sheet's own initial focus
  (SHOULD-119).
- **Opening a picker** (Style, Brewery, Country) lands sometimes on the first
  row ("Kaikki maat"), sometimes on the last row visible, not on the picker's
  heading (SHOULD-120).

Found by the product owner's walk of
[iteration 11 task 11](../iteration-11/11-mobile-accessibility-conventions.md).
This iteration adds more sheets and forms — the bottle form
([task 06](06-design-the-bottle-form.md)) and acting on a bottle
([task 10](10-design-acting-on-a-bottle-edit-and-remove.md)) — and each would
inherit whatever the filter sheet does, so the mechanism is settled before they
are designed on top of it.

## Scope

- Opening the filter sheet, going into a picker, and coming back each put
  VoiceOver's focus on the heading of the page now on screen, in a Finnish and
  an English voice, in light and dark mode.
- The mechanism is one the sheet primitive owns, so a sheet the cellar adds gets
  the same behaviour without its own copy.
- The same behaviour is walked with TalkBack on Android and recorded.

## Non-goals

- Re-designing the filter sheet or its pages.
- A screen-reader test in CI, which does not exist
  ([ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)).
- The cellar's own accessibility walk, which belongs to
  [task 18](18-the-cellars-flows-run-end-to-end-on-both-platforms.md).

## Constraints

- **Accessibility is WCAG 2.2 AA**
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)); the rule
  being fixed is "Focus follows the page" in `mobile/CONVENTIONS.md`.
- **React Native and Expo postdate training.** The focus API and the sheet
  library's own focus behaviour are checked in the docs for the SDK in
  `mobile/package.json`, never from memory: a wrong guess about when focus
  moves fails silently.
- **No screen reader runs in CI, so the walk is by hand** from
  [`mobile/accessibility-walk.md`](../../../mobile/accessibility-walk.md), each
  run recorded in the pull request in words, with no screenshot leaving the
  machine ([rule](../../../.claude/rules/no-screenshots.md)).
- Candidates already named, none chosen: sending the event after the page's
  layout rather than in an effect, `accessibilityViewIsModal`, a `key`ed
  heading.

**Decided at refinement, 2026-11-22** (product owner):

- **The fix lives in the `Sheet` primitive,** as Scope says, so `FiltersSheet`
  and every cellar sheet take it without a copy of their own.
- **TalkBack is walked in this task,** as Scope says.
- **Both voices, Finnish and English, and both light and dark mode are walked on
  the iPhone,** since the Simulator has no VoiceOver.
- **A lapsed free signing does not excuse the walk:** the phone is re-signed with
  `make mobile-ios-device`, as the
  [mobile README](../../../mobile/README.md#re-signing-after-seven-days) says,
  and walked.

## Open questions

**None.**

## Acceptance criteria

- [x] A `FiltersSheet.test.tsx` case shows the focus request sent to the form's
      heading when the sheet opens, and to the picker's heading on going in and
      coming back, once that heading is on screen. The opening case failed
      before the change
- [x] A `Sheet` test shows a sheet with a single page sending the focus request
      to its heading on opening, with no focus code of its own
- [x] On an iPhone with VoiceOver in Finnish, following
      `mobile/accessibility-walk.md`, opening the sheet, going into each of
      the three pickers and coming back each read the heading first, recorded
      in words in the pull request. **Deviation, accepted by the product owner
      on 2026-11-23:** every step reached the heading, but VoiceOver first
      reads the first selection of the dropdown ("Kaikki tyylit") and then the
      header (SHOULD-144)
- [x] The same walk on the iPhone in an English voice and in the other of light
      and dark mode, recorded in words. **Same deviation, accepted the same
      day** (SHOULD-144)
- [x] The same walk with TalkBack on Android, recorded in words
- [x] `mobile/CONVENTIONS.md`'s "Focus follows the page" row names the check
      that holds it
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-119 and SHOULD-120,
both found by the walk of iteration 11 task 11.
