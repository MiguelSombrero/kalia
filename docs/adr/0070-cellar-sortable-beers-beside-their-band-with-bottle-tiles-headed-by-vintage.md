# ADR-0070: The cellar is a sortable list of beers, each beside its style band with every bottle shown as a tile headed by its vintage

- **Status:** accepted
- **Date:** 2026-10-10

## Context

The cellar is the product, and until now it was laid out as one stack of
accordion rows, one per beer, each opening onto a list of its bottles. That
shape came from the two-level data model of
[ADR-0034](0034-cellar-two-level-bottle-model.md). Nobody had decided that
two levels of data should be shown as one level of accordion.
[Iteration 7.5 task 09](../tasks/iteration-7.5/09-cellar-layout.md) lays
out again both cellar surfaces and the components they share: the owner's
cellar, and the public cellar a stranger opens by link.

The opening audit's findings on these pages
([the audit](../tasks/iteration-7.5/audit.md)) were these:

- On a phone the row put the title, brewery, style, strength and count on one
  line, so a long name wrapped one word per line and the style chip covered
  the brewery (AUD-28, AUD-35).
- Bottles entered without dates were identical "Bottle" lines (AUD-29).
- The empty cellar gave no way to fill it (AUD-30).
- A row led nowhere, and the page had no total (AUD-31).
- The cellar did not say who could see it (AUD-32).
- The sign-in prompt offered nothing to a visitor without an account (AUD-33).
- A stranger learned nothing but a username (AUD-34).
- The cellars also had their share of the cross-page findings: small targets
  (AUD-06), the heading scale (AUD-07), one bordered card meaning six things
  (AUD-09), the not-found pages (AUD-45) and the skeletons (AUD-47).

Before prototyping, the product owner added two findings of their own. The
bottles under a beer did not read as separate rows. A bottle's dates,
container and both buttons were crammed onto one line. They also asked for a
way to sort the cellar. While choosing, they added two facts about how a beer
enthusiast uses a cellar. Someone who buys the same beer every year needs to
tell the 2020 bottle from the 2021 one at a glance. And the brewed date
matters more than the best-before date, because a well-cellared beer is often
good years after its best-before.

Two constraints shaped the choice. The owner's cellar fetched a beer's
bottles only when its row opened. The task also requires a bottle past its
best-before to be marked, judged against the visitor's local day.

## Decision

**The cellar is one column of beers. Each beer sits beside its style band and
shows every bottle as a tile, with the bottle's number and vintage in the
tile's header. Above the list sit a counts line, the cellar's visibility and a
Sort by control. Nothing folds away, so the owner's cellar read returns every
entry's bottles.** This is direction D, the product owner's choice from six
built directions across three rounds. It combines A2's top of page with B2's
list.

- **Top of the page.** The title comes first. Under it is the counts line,
  "N beers · N bottles", followed by an ink tag counting bottles past their
  best-before when there are any. Next is one line saying whether the cellar
  is public, linking to the public cellar or, when private, to the profile
  where that is changed. Last come Sort by, a dropdown, and an outlined
  *Find beers* that opens the catalog.
- **A beer.** On a desktop, the beer sits beside the style band of
  [ADR-0065](0065-imagery-icons-and-mark-specimen.md) with its strength set
  large. On a phone, that becomes the list strip, and the strength joins the
  line under the name. The beer's name links to its page. Under the name are
  the brewery, style and strength, and the bottle count sits at the right.
- **A bottle.** Each bottle is a tile with an ink edge. Its header reads
  *Bottle 2* on the left and its vintage, the brewed date's year, on the
  right, with no label. A screen reader hears the word "vintage" before the
  year. The tile's body is the brewed date and the bottle's age. Best-before
  is one small line at the foot. A bottle past it gets a small ink tag there,
  and a bottle on its best-before day does not. Edit and Remove split the
  tile's bottom edge, and stack on a phone, where half a tile is too narrow
  for Finnish labels. A beer's bottles are in vintage order, oldest first,
  with undated bottles last. A bottle with no brewed date shows a dash where
  the year would be.
- **Adding from the cellar.** The owner's last tile under each beer is a
  dashed *Add bottle*. It opens the catalog's add-bottle dialog for that
  beer. A beer's first bottle still comes from the catalog.
- **Sorting.** The options are name (the default), style, strength (strongest
  first), bottle count (most first) and best-before (soonest first, undated
  last). The order is written to the URL as `sort`, so a reload or a shared
  public-cellar link keeps it. Changing it reorders the page in place. It
  replaces the history entry rather than navigating, so focus stays on the
  control.
- **The read.** `GET /api/v1/cellar` returns each entry with its bottles, the
  shape the public read already has. The per-entry bottles read is removed,
  and the shared accordion and its lazy fetch go. The product owner chose
  this over an opt-in query flag and over a separate read of all bottles.
- **Time on the page.** Dates are date-only values. The server renders them as
  absolute dates. The bottle's age and the past tag are worked out in the
  browser from the visitor's local day, once the page has hydrated. A server
  in another time zone therefore never marks a bottle a day early or late.
- **The public cellar is the owner's page without its controls**, the same
  components with the buttons and the Add bottle tile left out. Its top shows
  the owner's initials, the title, the counts and when a bottle was last
  added, then Sort by. The owner still sees "This is how others see your
  cellar". A stranger gets a short block about Kalia at the foot, with
  *Browse the catalog* and *Create an account*.
- **Empty and signed-out states.** These carry no mark. The empty cellar is a
  new user's first run: it says what the cellar is for, lists the three steps
  to fill it, and offers *Browse the catalog* as its one primary action. The
  sign-in prompt offers *Sign in* and *Create an account*.

## Alternatives considered

**A, "Ledger".** The catalog's ruled row, with the bottle count as the button
that opened a grey well of bottles. Each bottle was a white band with a number
square and two labelled dates, and Sort by was a dropdown. The product owner
liked it and asked for changes. Those became A2.

**B, "Rack".** No accordion. Each beer sat beside its style band, every bottle
was a tile with best-before as its big figure, and Sort by was a row of
buttons. The public cellar was a page of its own, with a style-mix bar. The
product owner liked it and asked for changes. Those became B2.

**C, "Drink-by".** Bottle-first: every bottle a row under headings by
best-before ("Past", "Within 3 months" and so on), with a second tab that
listed beers. Not chosen: the product owner preferred A and B. Their later
point that best-before is a weak guide to when a cellared beer should be
opened removes the axis C was built on. C also listed a beer once per bottle.

**A2, A with vintages and a strength band.** The bottle's vintage became the
leading figure in the well, and a small style band with the strength started
each row. Not chosen as it stood. The product owner took its top of page into
D, but wanted every bottle visible as a tile rather than behind a row that
opens.

**B2, B with the vintage first.** The vintage became the tile's big figure,
best-before dropped to the foot of the tile, and the header figures became a
quiet line. Not chosen as it stood. The product owner took its list into D,
asked for A2's top of page in place of B2's, and asked for the vintage to move
into the tile's header without its label.

**The read, as an opt-in query flag or a separate bottles read.** Either would
have left the list's three other callers untouched: the front page, the
catalog list and a beer's page. Not chosen, because each costs a second shape
or a second request to document, test and keep in step. Cellars are small, and
the list was never paginated.

## Consequences

- Good, because every bottle is on screen without a click. A beer bought every
  year reads as its vintages in order, and each bottle has room for its dates
  and its two buttons.
- Good, because a bottle past its best-before is marked, without the marking
  outweighing the brewed date the product owner called the one that matters.
- Good, because the owner's and the public cellar now share one data shape and
  one set of components, and the public cellar is the owner's page minus its
  controls.
- Bad, because a large cellar makes a long page: forty beers came to about a
  hundred tiles in the mockup. Nothing folds, so length is the price of seeing
  everything.
- Bad, because the bottle's age and the past tag appear only after hydration.
  The server cannot know the visitor's day, so these few words arrive a moment
  after the rest of the tile.
- Neutral, because the front page, the catalog list and a beer's page now
  receive bottles they only count. This reverses the read model that existed so
  that a list would not load every bottle just to count them.
- Neutral, because the past tag is ink on white reversed, a pairing the
  contrast list did not have before.
- **Revisit trigger:** a cellar large enough that its page is hard to move
  around, at which point folding or paging comes back as a decision. Uploads
  (backlog), at which point the band holds the beer's photograph.

## Evidence

The round 1 mockups placed B's Edit and Remove side by side in a tile.
Measured at 375px in Finnish, half a tile was about 78px wide, and the icon
plus *MUOKKAA* in tracked capitals needed about 95px, so *POISTA* overflowed
the tile. The real layout would have broken the same way. Stacking the two
buttons on a phone, as in B2 and D, keeps every label inside its tile.
