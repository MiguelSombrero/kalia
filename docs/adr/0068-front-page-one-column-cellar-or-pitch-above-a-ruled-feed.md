# ADR-0068: The front page is one column, a pitch or the visitor's cellar above a ruled feed, so that the feed starts on the first screen for both audiences

- **Status:** accepted
- **Date:** 2026-10-04

## Context

[Iteration 7](../tasks/iteration-7.md) made the front page a feed under a
compact masthead: newest first, paging back as the visitor scrolls, new
entries waiting behind an "N new" control, and an empty feed that explains and
invites. It settled what the page does and left how it looks to
[iteration 7.5 task 07](../tasks/iteration-7.5/07-front-page-layout.md).

The opening audit found that the page did not explain Kalia to a new visitor
or offer a way in (AUD-14). A feed entry was one sentence at one weight in a
card, with only the username a link (AUD-15). A failing feed replaced the
whole page with the generic error page (AUD-16), and the page was a 768px
column with empty cream either side on a desktop (AUD-17). The front page
also had a share of the cross-page findings on small targets (AUD-06), the
heading scale (AUD-07), one bordered card meaning six things (AUD-09) and
skeletons that did not match their content (AUD-47).

The page also has two audiences, and nobody had drawn either. A visitor with
no account sees strangers' bottles, while a signed-in visitor with a cellar
sees the same page and may want something else from it.

Two facts about the data shaped every direction. A feed line carries the
username, the beer's name and brewery, the bottle count, the brewed date and
the time, but no style, strength or beer id. So a feed entry cannot carry the
beer slot [ADR-0065](0065-imagery-icons-and-mark-specimen.md) defines, and its
beer cannot link to the beer's own page. And because the feed pages back
without end, nothing placed below it is ever reached.

This was run under the `design-task` skill
([ADR-0062](0062-a-design-task-is-a-skill-and-a-marker.md)) in four rounds of
mockups at 375×812 and 1280×800. They used seeded catalog beers, feed lines
shaped exactly like the API's, and English and Finnish strings, with switches
for signed in or out, a public or private cellar, and a loaded, waiting,
empty, failing or loading feed. The identity is
[ADR-0064](0064-visual-identity-can-art-square.md) and the shell
[ADR-0067](0067-page-shell-sticky-bar-and-page-component.md).

## Decision

**The front page is one `wide` column. At its top sits the pitch for a
signed-out visitor or the visitor's own cellar for a signed-in one, and under
it the feed, headed "Latest additions", as ruled rows. Feed entries do not
carry the beer's style colour yet; that waits for the feed line to carry the
beer's style, strength and id
([task 15](../tasks/iteration-7.5/15-feed-line-carries-beer-facts.md)).** This
is direction A4, the product owner's choice from seven built directions across
four rounds.

- **One layout for both audiences, with a different top.** Signed out, the top
  is the tagline as the page's `h1`, the sentence that explains what the feed
  shows, and How Kalia works in three numbered steps. Signed in, the `h1` is
  visually hidden and the top is *My cellar*: the visitor's bottle and beer
  counts, whether their cellar is public (with the way to change it when it is
  not), and Open my cellar. The top carries no Create an account or Sign in,
  no catalog count and no search; those belong to the header and the catalog.
- **A feed entry is a ruled row, not a card.** It has the person's initials
  square, the username as a link to their cellar, the time, the beer's name as
  the row's heading-weight line, the brewery and vintage beneath, and the
  bottle count as a figure at the right. The sentence the row replaces
  survives for assistive technology: "added N bottles" is read after the
  username. The signed-in visitor's own entries carry a "You" tag. Until task
  15, the beer's name links to a catalog search for that name.
- **"N new" never moves what the reader is looking at.** It is a full-width
  primary bar pinned under the header, laid over the feed's heading rather than
  inserted above the list. Pressing it shows the waiting entries at the top,
  scrolls to them and highlights them once. The scroll is instant and the
  highlight skipped under `prefers-reduced-motion`.
- **The feed's three other states render inside the page, under the same top.**
  An empty feed shows an empty rack of nine hairline cells, says what the feed
  is, and invites a signed-out visitor to create an account, or tells a
  signed-in owner of a private cellar why their additions are missing. A
  failing first read shows the error and Try again where the feed would be.
  The masthead stays, and the route's `error.tsx` is no longer what a feed
  failure shows. The loading skeleton has the signed-out top's shape and the
  row's grid, because the skeleton renders before anyone knows who is
  signed in. The page and its skeleton live in an `app/[locale]/(home)` route
  group: a `loading.tsx` beside the locale layout is the fallback for every
  route under it, so the front page's skeleton was briefly showing on the
  cellar and the not-found pages too.
- **What the chosen mockup showed that does not ship with this decision.** The
  style band and the beer's own page link wait for task 15. The oldest-vintage
  and last-added figures in *My cellar* wait for a cellar summary the API does
  not have; they are in [the backlog](../tasks/backlog.md). The product owner
  agreed both on 2026-10-04.
- **Where the built page departs from the mockup, by agreement.** The product
  owner signed the built page off against A4 at both widths on 2026-10-04,
  accepting three differences the build introduced. A signed-out empty feed
  does not repeat the sentence the pitch above it already says. The "You" tag
  is the app's existing accent badge, with its ink edge. The skeleton always
  has the signed-out top's shape.
- **Audit findings on this page.** AUD-14 is partly fixed, by the product
  owner's decision. The page now says what Kalia is and what the feed shows,
  and the ways in stay the header's (on a phone, Create an account is behind
  Menu). The empty feed still invites signing up. AUD-15, AUD-16 and AUD-17 are
  fixed, and the front page's share of AUD-06, AUD-07, AUD-09 and AUD-47 is
  fixed. AUD-49 is kept.

## Alternatives considered

**A, "Can label": two columns.** A sticky label column set the name KALIA at a
new size above `--text-display`, with the pitch, both ways in, the steps and a
catalog search, beside a quiet ruled feed. The product owner took its feed and
its label's content forward but asked for one column instead of two, which
became A2.

**B, "Departure board": a ledger.** A masthead band over the feed laid out in
columns (when, who, bottles, beer, brewery, vintage), the densest of the
directions, with the visitor's own rows marked. Not carried forward. Columns
cut long brewery names short, its column labels could only be visual because a
table fights a list that grows at both ends, and its boldness was density
rather than type. Its "You" tag was carried into A2.

**C, "Poster wall": tiles.** Every entry was a poster tile with its bottle
count as the figure, and the masthead an inverted ink tile in the same grid.
Not carried forward. It brought back AUD-09's bordered box for every entry,
needed a new paper-on-ink surface and a white edge on the cobalt button to
keep contrast, and showed about two entries on a phone's first screen.

**A2, A in one column.** A's label column on top, with the sign-up buttons
removed because the header already has them. The product owner removed the
large name (already in the header), the catalog count and the search (both the
catalog's), which became A3. As built, A2 also put the first feed entry at
759px of an 812px phone screen when signed out, which went against iteration
7's compact masthead.

**A+, A with style colour.** A, with each entry carrying a band of the beer's
style colour and its strength, the shape ADR-0065 defines. It was built to show
what the feed would look like if a line carried those facts, and its band was
carried into A3.

**A3, A2 with style colour.** A2 without the name, count and search, with A+'s
band. The product owner asked for the style colours to come out of *My cellar*
(a rack of every bottle in its style's colour) and for the band's strength to
stop spilling out of the box, which became A4.

## Consequences

- Good, because the feed starts on the first screen at both widths and for
  both audiences, while the page still explains Kalia to a stranger.
- Good, because one layout serves both audiences. Signing in changes the top
  and tags your own entries, so there is one page to test, not two.
- Good, because a feed entry is told apart from the other bordered objects on
  the site, and the beer's name is now something to follow.
- Bad, because the chosen direction ships without its loudest feature until
  task 15 widens the feed line, a change in a module this iteration does not
  own.
- Bad, because a signed-out phone visitor sees Sign in but not Create an
  account without opening the menu. AUD-14 is only partly fixed, by decision.
- Neutral, because feed rows are 960px wide on a desktop, so the bottle count
  sits far from the beer's name. The product owner chose the wide column
  knowing that.
- Neutral, because How Kalia works adds new copy in both languages, which
  iteration 7.5 otherwise keeps out of scope; the layout needed a heading and
  three steps to explain the page.
- **Revisit trigger:** task 15 landing (the row gains the band, and the person
  square shrinks beside the username), or a cellar summary in the API (the two
  deferred figures return).

## Evidence

Measured in the round 3 and 4 mockups, from the top of the 1280×800 or 375×812
frame to the first feed entry. Signed out: 474px on a desktop, and 567px on a
phone (611px in Finnish). In A2, with the large name, it was 625px and 759px
(802px in Finnish). The signed-out top is the same in A3 and A4. The built page
is measured again in its pull request.

In round 3 the style band's strength overflowed its box ("10.2%" for
Westvleteren 12, "11.3%" for Rochefort 10). The cause was the mockup: a fixed
28px figure in a fixed 84px box. The real `BeerSlot` sizes the figure in
container units on a 16:7 band. Rendered with Archivo at `wdth` 125, weight
800, at band widths of 84, 160, 320 and 600px with strengths 4.2, 9.6, 10.2,
11.3, 12, 12.5 and "10,2", no case overflowed, and 11.3% at 84px left 16px to
spare. The same measurement flagged an oversized "1000.25" as 38px over, so the
check can fail. Round 4 drew the band with that geometry and all 20 entries fit
at both widths in both languages. The band is not in the shipped page yet (see
Decision), and these numbers are what task 15 inherits.
