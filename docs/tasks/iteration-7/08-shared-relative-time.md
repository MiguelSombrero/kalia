# Task 08: Relative time outside the cellar

- **Status:** refined
- **Iteration:** [7](../iteration-7.md)
- **Covers:** DW-4

## Why

A feed line wants to say when: "2 hours ago", "yesterday". Kalia can already do
that — `frontend/features/cellar/formatRelativeDate.ts`, built on
`Intl.RelativeTimeFormat` in iteration 5 and given two-unit precision by
[iteration 6 task 10](../iteration-6/10-cellar-relative-date-precision.md) —
and the feed cannot use it. `eslint.config.mjs` forbids one feature importing
another ([architecture.md §7](../../architecture.md)); a feature may reach
`lib/` and `components/ui/` and nothing sideways. Iteration 6 task 10 wrote the
condition into its own Non-goals: the formatter stays cellar-scoped *unless a
second consumer appears*. It has appeared.

Two things make this an extraction rather than a move. The cellar formats
**dates** — brewed, best-before — where a day is the smallest meaningful unit
and "3 years and 2 months ago" is the right answer. A feed formats an
**instant**, where "0 days ago" is useless and the answer the visitor wants is
minutes and hours. Same `Intl` API, different floor, and the cellar's existing
output must not change on the way past.

The third is a failure mode neither feature has met yet: a relative time
computed on the server and hydrated in the browser is computed twice, a moment
apart, and "2 minutes ago" against "3 minutes ago" is a React hydration
mismatch. It surfaces as a console error and a flicker rather than as a failing
test, which is exactly the class of bug this repo keeps writing down.

## Scope

A relative-time formatter reachable from more than one feature, covering
sub-day precision, in both locales, with a stated and tested rule for
rendering identically on the server and in the browser.

## Non-goals

- Changing what the cellar renders today. The two-unit rule from
  [iteration 6 task 10](../iteration-6/10-cellar-relative-date-precision.md)
  is a cellar display decision and stays the cellar's output, whatever the feed
  chooses for itself.
- Absolute date formatting, unless [task 03](03-front-page-feed.md)'s question
  about how a feed shows time is answered that way — in which case this task is
  dropped rather than rewritten.
- A date library. `Intl` is what is already in use and nothing here needs more.

## Constraints

- A shared utility lives in `lib/`, which every feature may import and which
  may import only `lib/` — the layer directions in `frontend/eslint.config.mjs`
  ([ADR-0012](../../adr/0012-orval-api-client.md),
  [architecture.md §7](../../architecture.md)).
- Both locales, i18next ([ADR-0011](../../adr/0011-i18next-localization.md)).
  Finnish relative time is not English relative time with words swapped, and
  `Intl.RelativeTimeFormat` handles most but not all of that — the plural trap
  ADR-0011 already names.
- The cellar's rendered output is the regression surface: its existing tests
  are the guard, and they must keep passing unchanged rather than being updated
  to match a new formatter.

**Decided 2026-09-12 by the product owner. This task goes ahead** — its Notes
made it conditional on [task 03](03-front-page-feed.md)'s time question, and
that answer was relative time, so the second consumer
[iteration 6 task 10](../iteration-6/10-cellar-relative-date-precision.md)
named has appeared. This section is the single home for the formatter's rules.

- **One unit, not two** (question 2): "just now" under a minute, then minutes,
  hours, "yesterday", days. A collector cares about the months between a
  brewed date and today; a feed line does not, and the second unit reads as
  noise on a news line. The cellar keeps its two-unit output unchanged, which
  is the regression surface above.
- **Relative up to a week, then a localised absolute date** (question 1).
  "3 weeks ago" is vaguer than a date for something that old, and
  [task 09](09-feed-and-private-cellars.md)'s decision makes old events *common
  near the top of the feed* rather than a rarity — only public cellars appear,
  so the page is quiet and its top lines may be weeks old. The floor and the
  week boundary are both unit boundaries the tests below must cover.
- **A `<time datetime>` carries the exact instant** (question 4) alongside the
  human text, in every case including the absolute one — so the precise time is
  available on hover and to assistive technology whatever the text says.
- **The text refreshes with the list, not on its own timer** (question 3). The
  page polls anyway ([task 05](05-feed-delivery-decision.md)), so "4 minutes
  ago" becoming "5 minutes ago" is free on the next render and there is no
  second clock to keep in step — which is also the answer to the hydration
  mismatch in the Why: one clock, read once per render, on both sides.

## Open questions

**None.**

## Acceptance criteria

- [ ] A shared formatter renders sub-day distances in one unit, correctly in
      both locales — unit tests per locale across the unit boundaries,
      including the two adjacent to the "just now" floor
- [ ] An instant older than a week renders as a localised absolute date rather
      than a relative one, in both locales — unit test on both sides of the
      week boundary
- [ ] Every rendered value carries a `<time datetime>` with the exact instant,
      including the absolute-date case — unit test
- [ ] The cellar's rendered dates are unchanged — its existing tests pass
      without modification, which is the criterion rather than a new test
- [ ] The same instant renders identically on the server and in the browser —
      test asserting no hydration mismatch, confirmed to fail against a
      formatter that reads the clock independently on each side
- [ ] `npm run lint` passes with the formatter imported from two features,
      proving the boundary allows it
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Was conditional on [task 03](03-front-page-feed.md)'s open question about how a
feed line shows time, to be dropped rather than refined if the answer had been
an absolute date or no time at all. **The answer on 2026-09-12 was relative
time**, so the condition is met and the task stands; see Constraints.
