# Task 15: A feed line carries its beer's style, strength and id

- **Status:** in-progress
- **Iteration:** [7.5](../iteration-7.5.md)
- **PR:** #342
- **Covers:** none

## Why

The front page the product owner chose
([ADR-0068](../../adr/0068-front-page-one-column-cellar-or-pitch-above-a-ruled-feed.md))
gives every feed entry a band in the beer's style colour with its strength set
large, the beer slot [ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md)
defines, and links the beer's name to the beer's own page. It shipped without
both, because a feed line carries the beer's name and brewery but not its
style, strength or id, and the feed's data belongs to
[iteration 7](../iteration-7.md) rather than to the layout task.

The feed already records which beer each line is about and resolves the name
and brewery from the catalog when it is read, so the facts are one lookup away
rather than unrecorded.

## Scope

A feed line read from the API carries the beer's style, strength and id
alongside its name and brewery. The front page's feed entries show the style
band and link the beer to its own page, as ADR-0068 describes.

## Non-goals

- What a feed line says about the person, and which lines a visitor may see:
  [iteration 7 task 09](../iteration-7/09-feed-and-private-cellars.md) decided
  that, and nothing here widens it.
- Recording anything new when a bottle is added. The facts are the catalog's,
  read when the feed is read.

## Constraints

- A feed line is a record of an act, frozen at write time; the catalog is read
  across the module boundary only through its public API
  ([ADR-0058](../../adr/0058-feed-event-recording-model.md),
  [docs/architecture.md](../../architecture.md)).
- The generated client is regenerated, never edited
  ([ADR-0012](../../adr/0012-orval-api-client.md)).
- The band's geometry and the measurements it must hold are in ADR-0068's
  Evidence.
- The agreed widths are the iteration-wide decision recorded in
  [the iteration index](../iteration-7.5.md).
- [ADR-0019](../../adr/0019-adr-format-and-conventions.md): an accepted ADR is
  amended, not rewritten. ADR-0068's revisit trigger fires with this task, and
  both it and [ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md)
  say the feed draws no beer slot, as does `docs/design.md` under "What each
  placeholder stands in for". All three are amended in the implementing pull
  request.
- [Task 13](13-accessibility-and-contrast-reverified.md) re-verified the front
  page before this task changes it, so the front page's WCAG 2.2 AA scan must
  stay green on the changed row. The band is decorative and hidden from
  assistive technology, like every beer slot.

Decided with the product owner in refinement, 2026-10-11:

- **A feed line shows the beer's *current* style and strength**, resolved from
  the catalog when the feed is read, exactly as its name and brewery already
  are. Nothing new is recorded when a bottle is added, `BottleAdded` and
  `feed.line` keep their shape, and a strength corrected in the catalog later
  reads corrected in the feed too.
- **The facts come through `catalog`'s module API.** The `BeerSummary` record
  that `CatalogApi.getBeerSummaries` returns gains the beer's style and ABV;
  the feed reads nothing else from `catalog`.
- **`FeedLineDto` gains `beerId`, `style` and `abv`**, named as the catalog's
  own `BeerSummaryDto` names them, and all three are required: a beer cannot
  exist without a style and an ABV, and a line whose beer no longer resolves is
  already dropped.
- **The beer's name links to `/{locale}/beers/{beerId}`**, replacing the
  catalog search ADR-0068 used in the meantime.
- **The row carries the band at both agreed widths**, as direction A4 drew it,
  with the person's square shrinking beside the username (ADR-0068's revisit
  trigger). It is not the cellar's band-on-desktop, strip-on-phone split
  ([ADR-0070](../../adr/0070-cellar-sortable-beers-beside-their-band-with-bottle-tiles-headed-by-vintage.md)).
  The product owner signs off the built row at both widths in the pull
  request.
- **The front page's loading skeleton gains the band's shape** in its row
  grid, because a skeleton not matched to the row it stands in for is a silent
  regression ([ADR-0022](../../adr/0022-loading-error-empty-states.md)).
- **The task stays in iteration 7.5.** It completes the front page the product
  owner chose, and iteration 8's catalog editing changes nothing here, given
  the first decision above.
- **The overflow check uses KBS at 12.0%**, the strongest beer in the seeded
  catalog.

## Open questions

**None.**

## Acceptance criteria

- [x] The feed API returns each line's beer id, style and strength, covered by
      the feed's integration test and reflected in the regenerated client
- [x] A front-page feed entry shows its beer's style band and links the beer's
      name to the beer's own page, covered by a component test and seen in a
      browser at both agreed widths
- [x] The front page's loading skeleton carries the band's shape in its row
- [x] No style band overflows at either width in either locale, checked in a
      browser against KBS at 12.0%
- [x] ADR-0068, ADR-0065 and `docs/design.md` describe the feed row that ships
- [ ] The product owner has signed off the built row at both agreed widths
- [x] `make verify` is green
