# ADR-0069: The catalog is one ruled column of beers beside a filter column that folds on a phone, with one Search button that always comes last

- **Status:** accepted
- **Date:** 2026-10-09

## Context

The catalog was laid out in iteration 1 as a search form above a three-column
grid of cards, and only recoloured since.
[Iteration 7.5 task 08](../tasks/iteration-7.5/08-catalog-layout.md) lays out
again both of its surfaces, the list and a beer's details, and the components
they share.

The opening audit's findings on these pages
([the audit](../tasks/iteration-7.5/audit.md)) were these. On a phone the
filters filled the first screen, and the first beer began at 603px of 812
(AUD-18). On a desktop the five filters wrapped unevenly, leaving the only
button alone on a second row (AUD-19). Every card carried an "Add to cellar"
button as heavy as anything else on it, while the beer's own page was a 20px
link (AUD-20). Adding a beer changed nothing visible (AUD-21). "Back to
catalog" dropped the search (AUD-23), the result count appeared only at the
bottom (AUD-24), and the add button changed width with sign-in state (AUD-25).
A beer's details page was a title and a two-fact box above empty space (AUD-26),
its only way back was a small text link (AUD-27), and an out-of-range page
contradicted itself (AUD-58). The catalog also had its share of the cross-page
findings on small targets (AUD-06), the heading scale (AUD-07), one bordered
card meaning six things (AUD-09), not-found pages (AUD-45) and skeletons
(AUD-47).

The product owner added three findings of their own before prototyping
started. The three-column grid was restless and made it hard to focus on one
beer. A style colour on every card was noisy. The five filters, all of
different widths, looked random. They also asked for the beer's description to
come off the page: the source [iteration 8](../tasks/iteration-8.md) brings in
is not expected to carry one, and Kalia should not invent them.

Three facts about the API shaped what the details page could offer. A search
matches the beer's name only. Style and country are exact matches. There is no
brewery filter. So "more of this style" and "more from this country" need no
API change, but "more from this brewery" would. The owner's cellar listing
already returns a bottle count per beer, so marking the beers a visitor holds
needs no API change either.

This was run under the `design-task` skill
([ADR-0062](0062-a-design-task-is-a-skill-and-a-marker.md)) in two rounds of
mockups at 375×812 and 1280×800. They used the 54 seeded beers, searched for
real, with English and Finnish strings. Switches covered signed in or out,
and a full, paged, filtered, single, empty or loading result. The identity is
[ADR-0064](0064-visual-identity-can-art-square.md), the imagery
[ADR-0065](0065-imagery-icons-and-mark-specimen.md) and the shell
[ADR-0067](0067-page-shell-sticky-bar-and-page-component.md).

## Decision

**The catalog list is one column of ruled rows beside a column of filters. On
a phone, the filters other than the name fold behind a native Filters
disclosure, and one full-width Search button sits under the name field and
that disclosure, open or closed. A beer's details page puts the style band
beside its name, lists its facts as ruled rows that lead back into the
catalog, and shows other beers of the same style.** This is direction A3, the
product owner's choice from five built directions across two rounds. The
product owner kept marking the beers a visitor holds in scope.

- **Filters.** On a desktop they are a column of their own, beside the
  results. Every field is the column's width, so nothing wraps unevenly, and
  the strength range is two equal halves of one row. On a phone, the name
  search is always visible. Style, country, strength and sort fold into one
  *Filters* row, which counts how many of them are set. There is one submit
  button at every width, labelled *Search*, and it is always the last
  control in the form. A phone visitor therefore never sees two buttons and
  has to guess which fields each one sends. `SearchFilters` stays a server
  component: the fold is a `<details>` element, and on a desktop CSS hides
  its summary and shows its content.
- **Results.** One column of ruled rows. A row holds the thin style strip
  ADR-0065 defines for lists, the beer's name as its heading, the brewery and
  style beneath, and the strength as the row's figure, set like the bottle
  count on the front page feed. The style strip is the only colour in the
  list. The whole row is still the link to the beer, with a small *Add*
  lifted above it. Its accessible name says which beer it adds to the
  cellar. The result count comes first, followed by each active filter as a
  link that removes it.
- **The cellar marker.** A signed-in visitor's beers carry "N in your
  cellar" in the list, and "In your cellar: N bottles" with a link to the
  cellar on the details page. Adding a bottle refreshes the catalog page, so
  the marker appearing is what confirms an add.
- **The way back.** A beer opened from a search carries that search's
  parameters in its own URL. Its details page links *Back to results* to that
  exact search, page included, and passes the same search on to the beers
  it lists. A beer opened from anywhere else links back to the catalog.
- **Details.** The name and brewery stay as they were. Beside them sits the
  style band, the beer's image slot from ADR-0065, with its strength. Below
  are four ruled facts: style, strength, brewery, and where it is brewed. The
  style and the country each lead to the catalog filtered by them, with a
  count. Then come up to five other beers of the same style, in the list's
  own rows. The description is no longer shown. It stays in the schema until
  iteration 8 settles the data source ([the backlog](../tasks/backlog.md)).
- **Where the built page departs from the mockup, by agreement.** The product
  owner signed the built page off against A3 at both widths on 2026-10-09,
  with three differences. An empty search still shows the app's shared
  `EmptyState` rather than the mockup's ruled block. A Finnish strength is
  written with a decimal comma everywhere, the band included. And a desktop
  browser without `::details-content` shows the filters folded behind their
  summary.
- **Audit findings on these surfaces.** AUD-18, AUD-19, AUD-20, AUD-21,
  AUD-23, AUD-24, AUD-25, AUD-26, AUD-27 and AUD-58 are fixed. An out-of-range
  page now redirects to the last page that has results. The catalog's share
  of AUD-06, AUD-07, AUD-09, AUD-45 and AUD-47 is fixed. AUD-22 is not fixed
  here and goes to [the backlog](../tasks/backlog.md): finishing an add the
  visitor began before signing in needs that intent carried through
  Keycloak, which is a flow, not a layout. AUD-49, AUD-51, AUD-52 and AUD-57
  are kept.

## Alternatives considered

**A, "Shelf index".** The chosen layout as first built, with a separate name
search button on a phone. Opening *Filters* showed a second button, *Show
beers*, at the foot of the panel. The product owner chose A's direction but
not its phone form: with two buttons on screen, a visitor cannot tell whether
*Search* also sends the filters, or whether *Show beers* also sends the name.
That became A2 and A3.

**B, "Tap list".** A large name search with the other filters written as one
sentence with blanks: "Show beers of style \_\_ brewed in \_\_, with strength
from \_\_ to \_\_ %". The results were a colourless table sorted by its column
heads. The details page was three large figures (strength, style, origin)
above two short lists. Not chosen. On a phone the sentence wrapped to three
lines and pushed the first beer to about 545px. The sentence also had to be
rebuilt word by word for Finnish, which every future filter would inherit.

**C, "Search desk".** One large search bar above a toolbar of four
equal-width cells. Each result was a bordered row split into a link half and
an action half. The details page wrote the facts as one sentence ("A 10.2 %
Quadrupel brewed by Brouwerij Westvleteren in Vleteren, Belgium."). Not
chosen. A bordered box per beer brought back AUD-09's single rectangle
standing for many different things.

**A2, A with a button that moves.** Search sat beside the name field while
the filters were folded. Opening them hid it with CSS, and the same *Search*
appeared at the foot of the open panel. Not chosen. It solves the two-button
problem, but the button changes place as the panel opens and closes. A3 keeps
it in one place for the cost of one row.

## Consequences

- Good, because the first beer is on a phone's first screen, and a phone
  visitor sees one button whose place in the form says what it sends.
- Good, because the catalog and a beer's details now share one row component
  rather than two kinds of card.
- Good, because a visitor can see which beers they already hold, and an add
  confirms itself.
- Bad, because a desktop that does not support `::details-content` shows the
  filter column folded, behind a *Filters* summary, rather than open. That is
  usable, but it is not the design.
- Bad, because a beer's URL now carries the search that led to it, so the
  same beer has as many URLs as there are searches. Each one still names the
  beer, and the details page reads only the parameters it knows.
- Neutral, because a details page now makes three catalog reads instead of
  one: the beer, its style, and a count for its country.
- **Revisit trigger:** a brewery filter in the API, at which point
  the brewery fact links like the style and country do. Or uploads (backlog),
  at which point the band holds the beer's photograph.

## Evidence

Measured in the round 1 and 2 mockups at 375×812, signed out, English, all
beers: the first beer's row began at about 340px in A and A2, 400px in A3,
about 400px in C, and about 545px in B in Finnish. Today's page puts it at 603px
(AUD-18). In A2 and A3, a script counted the form's visible submit buttons
with the filters open and closed. It found exactly one each time.

The built page, measured in Chromium against the compose stack at 375×812,
signed out, English, all beers: the first row begins at 382px. The A3 mockup
put it at about 400px. `e2e/catalog-layout.spec.ts` holds the first row inside
the first screen at both agreed widths and in both languages. It also holds the
search form to exactly one visible button with the filters open and closed.
