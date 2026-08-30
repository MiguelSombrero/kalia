# Task 10: Multi-unit precision for cellar relative dates

- **Status:** refined
- **Iteration:** [6](../iteration-6.md)

## Why

The cellar page (iteration 5 task 11) renders each bottle's brewed and
best-before dates as a single relative-time unit via `formatRelativeDate`
(`frontend/features/cellar/formatRelativeDate.ts`, built on
`Intl.RelativeTimeFormat`) — e.g. "brewed 3 years ago". Raised in review of
task 11
([PR #158](https://github.com/MiguelSombrero/kalia/pull/158#discussion_r3793820052)):
for a cellar-worthy beer aged multiple years, single-unit precision hides
detail a collector cares about — a bottle brewed 3 years and 1 day ago and
one brewed 3 years and 11 months ago both currently render the same way.
The request is two-unit precision instead, e.g. "brewed 3 years and 12
months ago".

This is a real behavior change, not a bug fix, and it directly revises the
exact example phrases iteration-5 task 11's own refinement locked into that
task's Constraints ("brewed 3 years ago", "best before in 8 months" /
"best before 2 months ago") — so it gets its own refinement pass rather
than a quick fix mid-PR, per the product owner's own instruction when this
was raised.

## Scope

Two-unit relative-date precision for `formatRelativeDate`, in both locales
(en/fi), replacing the single-unit examples iteration-5 task 11 shipped.

## Non-goals

- Any other part of the cellar page's behavior — this changes only the
  date-formatting rule, not sorting, layout, or which dates are shown.
- A general-purpose date-formatting utility for use outside the cellar
  feature. Stays scoped to `features/cellar/formatRelativeDate.ts` unless a
  second consumer appears.

## Constraints

- Supersedes the specific relative-date examples in
  [iteration-5 task 11](../iteration-5/11-cellar-page.md)'s Constraints —
  that task file is frozen as a record of what was asked for at the time
  ([docs/tasks/template.md](../template.md)), so the new precision rule
  belongs here, not as an edit to that file.
- `Intl.RelativeTimeFormat` (what `formatRelativeDate` currently uses for
  i18n) formats one number+unit+direction per call, with no built-in
  combined-unit mode. Getting "X years and Y months ago" correctly
  pluralized in both locales needs either composing two `formatToParts()`
  calls by hand — dropping the first call's own direction word, appending
  it once at the end — or hand-writing the connector and unit words per
  locale, giving up some of what `Intl.RelativeTimeFormat` currently
  handles for free.
- **The rule is: keep the top two units, and drop the second when it rounds to
  zero.** Years + months, months + days, days alone. The second unit never
  reaches the next unit up — 11 months is its maximum — so the review's own
  example, "3 years and 12 months ago", is unreachable by construction; it was
  arithmetically impossible as written and is not what ships. Exactly three
  years renders "brewed 3 years ago", not "3 years and 0 months ago". One rule
  at every magnitude, with no threshold to remember.
- **The phrase is composed from two `formatToParts()` calls**, not
  hand-written per locale: format each unit, drop the direction word from the
  first, join with the locale's connector, and let the second call's direction
  word close the phrase. This is what keeps Finnish correct without
  hand-written case rules — `Intl` already inflects for direction, giving
  "3 vuotta … sitten" in the past and "3 vuoden … päästä" in the future, so
  composition yields "3 vuotta ja 2 kuukautta sitten" and "3 vuoden ja 2
  kuukauden päästä". Only the connector ("and" / "ja") is authored per locale
  ([ADR-0011](../../adr/0011-i18next-localization.md)).
- The composition depends on `formatToParts` part ordering, so the tests pin
  it per locale rather than trusting it.

## Open questions

**None.**

## Acceptance criteria

- [ ] A span of years renders with two-unit precision in both locales — e.g.
      "brewed 3 years and 2 months ago" / "brewed 3 vuotta ja 2 kuukautta
      sitten" — `formatRelativeDate.test.ts`
- [ ] A whole number of units renders with one unit and no zero second unit —
      exactly three years is "3 years ago", and the second unit never reaches
      the next unit up — `formatRelativeDate.test.ts`, with a case at each
      magnitude boundary
- [ ] A future date renders in the correct Finnish case — "3 vuoden ja 2
      kuukauden päästä" rather than the past-tense inflection —
      `formatRelativeDate.test.ts`, which is the case a composition bug
      produces silently
- [ ] `npm test` is green

## Notes

Raised in review of
[iteration-5 task 11](../iteration-5/11-cellar-page.md)
([PR #158](https://github.com/MiguelSombrero/kalia/pull/158#discussion_r3793820052)):
the single-unit format that task shipped was flagged as insufficient
precision for tracking a cellar-worthy beer's age. The product owner asked
for this to become its own iteration-6 task, with the open questions above
settled during refinement, rather than a quick in-PR fix.

Refined 2026-08-30 with iteration 6 as a batch
([ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md)).
