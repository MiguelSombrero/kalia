# Task 10: Multi-unit precision for cellar relative dates

- **Status:** needs-refinement
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

## Open questions

- **Functional scope and behaviour:** does two-unit precision apply only to
  spans ≥ 1 year (years + months), or does every magnitude get a second
  unit (e.g. months + days for a shorter span, not just "2 months ago")?
- **Domain and data model:** rounding/cutoff for the second unit — always
  "keep the top two units, drop the rest," or does the second unit
  disappear once it rounds to 0 (e.g. exactly 3 years renders as "3 years
  ago", not "3 years and 0 months ago")?
- **Interaction and UX flow, including wording a user will read:** exact
  phrasing and connector word per locale — "years and months" in English;
  the Finnish equivalent, including the correct partitive plural when both
  units appear together.
- **Constraints and trade-offs:** implementation approach given
  `Intl.RelativeTimeFormat`'s single-unit limitation above — compose from
  `formatToParts()`, or hand-write the phrase per locale.

## Acceptance criteria

- [ ] A bottle whose brewed or best-before date is at least a year away
      renders with two-unit precision (e.g. "brewed 3 years and 12 months
      ago") in both locales — `formatRelativeDate.test.ts`
- [ ] `npm test` is green

## Notes

Raised in review of
[iteration-5 task 11](../iteration-5/11-cellar-page.md)
([PR #158](https://github.com/MiguelSombrero/kalia/pull/158#discussion_r3793820052)):
the single-unit format that task shipped was flagged as insufficient
precision for tracking a cellar-worthy beer's age. The product owner asked
for this to become its own iteration-6 task, with the open questions above
settled during refinement, rather than a quick in-PR fix.
