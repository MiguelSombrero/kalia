# Task 15: A feed line carries its beer's style, strength and id

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
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

## Open questions

- Should a feed line show a beer's *current* style and strength from the
  catalog, or the ones it had when the bottle was added? They differ only if
  the catalog is edited, which [iteration 8](../iteration-8.md) makes possible.
- Does this belong in iteration 7.5 at all, or in iteration 8 beside the
  catalog changes it would meet?

## Acceptance criteria

- [ ] The feed API returns each line's beer style, strength and id, covered by
      the feed's integration test and reflected in the regenerated client
- [ ] A front-page feed entry shows its beer's style band and links the beer's
      name to the beer's own page, covered by a component test and seen in a
      browser at both agreed widths
- [ ] No style band overflows at either width in either locale, checked in a
      browser against the catalog's strongest beer
- [ ] `make verify` is green
