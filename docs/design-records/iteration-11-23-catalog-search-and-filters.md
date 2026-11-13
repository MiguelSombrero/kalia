# Design record: the Catalog's search field, filter sheet and filters in force

- **Status:** accepted
- **Date:** 2026-11-13
- **Task:** [iteration 11 task 23](../tasks/iteration-11/23-design-the-catalogs-search-and-filters.md)

## Question

The Catalog tab had no search and no filters, and the API has six ways to narrow
it: text, style, brewery, country, a strength range and a sort. The web answers
with a form and a fold ([ADR-0069](../adr/0069-catalog-one-ruled-column-beside-a-filter-column-with-one-search-button.md)),
which is a page's answer. [ADR-0109](../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)
fixed only that the filters are a sheet, and [ADR-0110](../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)
left the search and filter row out on purpose.

What was open: where the search field sits, how the filters in force are shown
on the list, and how a style, a brewery and a country are picked when the
catalog holds dozens of styles and a list of breweries that grows with it. The
refinement fixed the rest: every API filter and every sort the web offers; a
sheet that holds its choices and applies them together with one button that
names the count, plus a Clear all; strength as two number fields with no
slider.

## Directions shown

One framed round of three structurally different directions, then a native
build of the one the product owner took forward. The frames were live,
interactive Artifacts on the real catalog screens, in light and dark, English
and Finnish, at the largest text size (iOS accessibility size 5, Android 200 %),
with iOS and Android chrome, the keyboard and the decimal pad, the seeded beers
and the catalog's 4,914 breweries in 96 countries. Their code is not committed.

**A: chips and pushed pickers.** *Framed round 1, then native.* The search field
sits under the title with a Filters button beside it; the button carries a count
of the filters in force. The filters in force are removable chips under the
field, with a Clear all at the end of the row. The sheet is a short form: Style,
Brewery and Country are rows that each push a full searchable picker inside the
sheet, a style with its colour beside it, breweries 20 at a time with a Show more
button; then the strength fields and the five sorts, and one button naming the
count. Picking returns to the sheet at once and applies nothing. **Chosen.**

**B: one page and a summary line.** *Framed round 1.* The search field is full
width under the title, and under it a bar holds the Filters button with its count
and the number of beers shown. What is in force is said in one sentence under the
bar, with a Clear all; the sentence is text, not controls. The sheet is a single
page that never changes screen: the styles are a wall of chips ordered by their
colour, brewery and country are type-to-find fields whose first matches open in
place, then strength and sort. It gave a result count on the list and no screen
change, at the cost that one filter could be removed only inside the sheet, a
sheet that ran to several screens at the largest text size, and a brewery that
could be typed for but not browsed. Not chosen.

**C: bottom search and an accordion.** *Framed round 1.* The search field and the
Filters button are a bar above the tab bar, in the thumb zone, riding up above
the keyboard; filters in force show only as a count on the button. The sheet is
five folding sections, one open at a time, each holding its own picker or fields,
with one button naming the count. It gave the list the whole screen and reach for
one hand, at the cost that the list did not say which filters applied, a
permanent strip above the tab bar that grows with the text size, and a search
field placed where the web and most lists put none. Not chosen.

## Choice

**The Catalog's search and filters are direction A: a search field with a Filters
button, removable chips for the filters in force, and a filter sheet whose style,
brewery and country are pushed, searchable pickers.** The product owner named A
for native exploration after the framed round and approved it on the iOS
Simulator on the real catalog.

It covers the search field, the Filters button and its count, the chips and Clear
all, the sheet (strength, sort, the apply button and Clear all) and the three
pickers. It does not cover what a filter does to the list, the list's states or
what is remembered, which are [task 09](../tasks/iteration-11/09-catalog-search-and-list.md)'s.
The standing intent is [`docs/design.md`](../design.md#mobile-catalog-search-and-filters).

## Agreed departures

Where the built screen differs from what the product owner saw and approved, and
why. To be completed when the built controls are signed off.

## Sign-off

To be completed when the built controls are signed off.
