# ADR-0072: The rack read as any app launcher, so Kalia's mark is a bottle pouring into foam on a deep teal tile

- **Status:** accepted
- **Date:** 2026-10-11

## Context

[ADR-0065](0065-imagery-icons-and-mark-specimen.md) made the mark a cellar
rack: nine square cells, eight ink and one cobalt. It was chosen as one part of
a direction whose real subject was imagery and icons, so it was never explored
on its own, and the product owner found that it did not look unique or fresh. A
three-by-three grid of squares is the shape of the common app-launcher icon,
and of many other marks besides.

The mark is the one piece of the identity a visitor sees on every page, in
every browser tab and on a phone's home screen. It had not yet travelled:
[task 11](../tasks/iteration-7.5/11-keycloak-pages-carry-the-identity.md) is
about to carry it onto the Keycloak pages, so this was the cheapest moment to
replace it.

The brief was left open in refinement
([task 16](../tasks/iteration-7.5/16-kalia-mark-redesign.md)): the mark need
not express the cellar, may break the identity's rules in shape and colour,
and may bring colours of its own provided they are used nowhere else. It must
survive 16 px, be static, and meet WCAG 2.2 AA. This was run under the
`design-task` skill ([ADR-0062](0062-a-design-task-is-a-skill-and-a-marker.md)),
in six rounds of built mockups, each shown at 16 px, in the header and footer
at 375 and 1280 px in both locales, as the touch icon, and large, with the
contrast of every colour it used.

## Decision

**Kalia's mark is a clear bottle, outlined in coral, tipped neck-down and
pouring a sheet of yellow beer into a billow of white foam, drawn on a deep
teal square tile, with no label on the bottle.** It is the direction the
product owner chose as "Paljas" (bare) with the "Syvä 1" (deep 1) tile.

- **The mark is a tile, so it is its own compact form.** The favicon, its
  PNG fallback and the apple-touch icon are the mark itself, with no white
  ground around it, and it keeps its edge on a dark browser tab.
- **Its colours belong to the mark alone.** A deep teal, a sun yellow, a
  darker yellow for the runs in the falling beer, a coral, and the page's white
  for the foam. They join `globals.css` as primitives behind five `mark` tokens
  and are used nowhere else, so [ADR-0064](0064-visual-identity-can-art-square.md)'s
  one action colour and its style colours are not reopened through the mark.
- **Each part is held to 3:1 against what it is seen on**: the tile against
  the page, and the bottle's edge, the beer and the foam against the tile.
  These four pairings are declared in `docs/design.md` and checked in the
  build. The darker runs in the beer, and the bottle's edge where it meets the
  beer inside it, are texture within one part and are not held.
- **The lockup is unchanged.** The mark at 32 px beside the wordmark in the
  header, at 20 px beside the tagline in the footer, with the spacing they had.
  Every round showed the marks in that lockup, and none raised a change.
- **Accessibility is unchanged.** Where the mark is the home link the link
  carries the name; everywhere else the mark is hidden from assistive
  technology.
- **One drawing feeds every rendering.** The component paints it through the
  `mark` tokens; the SVG favicon and the two generated PNGs are serialised from
  the same shapes with literal values, which a test pins to `globals.css`. No
  raster file is tracked.

This replaces ADR-0065's mark bullet and nothing else in it.

## Alternatives considered

Round one offered six subjects, each drawn once.

**Putous, the pour** (the product owner's own suggestion). A pint of clear
yellow IPA tipped past horizontal on an ink tile, emptying like a waterfall
into a big billow of foam. Kept, and taken into variations.

**Holvi, the vault.** Three round arches one inside another, ink, white and a
cobalt door at the far end, like a vaulted cellar receding from its doorway.
Kept for one variation.

**Korkki, the crown cap.** A crown cap from above: a crimped ink rim around a
cobalt disc. **Tynnyri, the barrel.** An oak barrel on its side with two ink
hoops, for time and ageing, in an oak colour of its own. **K, the letter.** A
heavy ink stem and a cobalt chevron pointing into it without touching.
**Kataja, the juniper.** A sprig of juniper with violet berries, for sahti,
the Finnish farmhouse beer filtered through juniper. All four rejected in
round one; the product owner did not give a reason.

Round two took the pour into five variations and redrew Holvi.

**Pour A, Yö (night)**, round one's pour tightened, the glass full of beer.
**Pour B, Pop**, the pour on an electric violet tile with lemon beer and hot
pink spray. **Pour D, Viiva (line)**, the pour drawn in ink line on the page
with no tile, like the icon set. **Holvi, Maakellari**, the vault taken outdoors
as a Finnish earth cellar: a mound with a moss roof, an arch of round
fieldstones and a red-ochre door. **Hylly**, a new concept the product owner
asked for: a dusty old oak shelf of aged bottles, one sealed in cobalt wax.
All rejected for C and E; no reason given.

**Pour C, Kesä (summer)**: the pour on a lake-teal tile with sun-yellow beer,
a coral glass and white foam. **Pour E, Koski (falls)**: the glass cropped by
the tile's corner so the drawing is a tall waterfall into a wide pool of foam,
on forest green. Both kept, and taken into variations.

Round three kept C and E and set beside them a bottle in place of the pint.

**C2, Kesä · Pullo**: C with a clear coral-lined bottle carrying a white label.
Kept: the product owner liked its colour, its foam and the idea of a bottle.
**C3, Kesä · Koski**, E's cropped waterfall in C's colours, built as a blend
to be seen. **E2, Koski · Pullo**, E poured from a bottle cropped to its
shoulder and neck. **E3, Koski · Kumossa**, a bottle hanging upside down at the
top of the tile, pouring one vertical column. C, C3, E, E2 and E3 rejected for
C2; no further reason given.

Round four kept C2 and tried six labels on its bottle, each with the bottle
raised and the foam lowered so the falling beer is about two thirds longer.

**Nauha**, C2's white band; **Soikio ja kaulus**, a white oval and a coral neck
collar; **Koralli**, a wide coral label; **K-etiketti**, a white label with a
teal K; **Vuosikerta**, a cream vintage label with coral lines and a seal.
Rejected for **Paljas**, the same bottle with no label, beer from base to neck.

Rounds five and six were about one pairing. Paljas's coral outline stood at
2.17:1 against its original lake-teal tile, under the 3:1 the task holds the
mark's pairings to.

**Keeping the coral and declaring only the other pairings.** Paljas exactly as
chosen, with the shortfall recorded here. Offered and declined: the product
owner chose to make every pairing pass.

**Paljas · Persikka**, the outline lightened to a pale peach that reaches 3:1
on the original teal, at the same weight and a third heavier. Rejected: the
product owner preferred the coral, and the peach nearly vanishes where it
meets the yellow beer. A different beer colour was asked about; it cannot
help, because the beer is not in the failing pairing.

**A deeper tile.** Four tiles that bring the coral to 3:1 or more, with the
bottle, beer and foam untouched: **Syvä 1**, just deep enough; **Syvä 2**, a
step deeper; **Syvä 3**, a deep teal leaning towards forest green; and
**Petrooli**, deepened and turned towards blue. Syvä 1 was chosen, the smallest
change from what the product owner had picked; the other three were rejected
for it.

## Consequences

- Good, because the mark is no longer a shape a visitor has seen on a hundred
  other launchers, and it is the one bright thing in an otherwise quiet
  identity.
- Good, because the mark is its own square, so the favicon keeps an edge on a
  dark browser tab, which the rack on a white ground did only by its ground.
- Good, because every part a visitor reads the mark by passes 3:1 against what
  it sits on, and the build checks it.
- Bad, because the mark is a scene of eighteen shapes rather than nine squares.
  At 16 px it comes down to a teal square with a yellow fall into white, and
  the bottle is recognisable only from about 32 px up.
- Bad, because the mark says "beer" before it says "cellar": the bottle is what
  a cellar keeps, but nothing in the drawing shows the keeping.
- Neutral, because the identity now holds five colours that are not its own.
  They are tokens with meaning rows, used only by the mark, and a re-theme of
  the page must leave them alone.
- Neutral, because the mark's five raw values live in `lib/kaliaMark.ts` as
  token exceptions, as the rack's three did, and `app/icon.svg` is that
  drawing serialised; a test holds both to `globals.css`.
- Neutral, because the Keycloak pages keep the iteration-6.5 snifter until
  task 11 carries this mark across.
- **Revisit trigger:** a surface where the mark must sit on a colour other
  than the page's white, which would add a pairing for the tile; or the
  Keycloak pages showing that the scene does not hold at their size.

## Evidence

**Contrast of what the mark adds**, computed by `node scripts/check-contrast.mjs`
on 2026-10-11 from the declared pairings:

| Pairing | Ratio | Needs |
|---|---|---|
| mark tile on the page background | 7.97:1 | 3:1 |
| mark bottle (coral outline) on the tile | 3.11:1 | 3:1 |
| mark beer on the tile | 5.76:1 | 3:1 |
| mark foam on the tile | 7.97:1 | 3:1 |

Not held, as texture within one part: the darker runs on the beer at 1.30:1,
and the coral outline against the beer inside the bottle at 1.85:1.

**The original lake-teal tile failed the outline**, by the same formula on
2026-10-11: coral on that teal was 2.17:1, and the beer on it 4.02:1. Each
deeper tile offered in round six, with the coral's ratio on it: Syvä 1 3.11:1,
Syvä 2 3.33:1, Syvä 3 3.95:1, Petrooli 3.20:1. The lightened outline offered
in round five reached 3.09:1 on the original teal and 1.30:1 against the beer.

**The generated PNGs draw the same picture as the SVG.** They now render the
serialised drawing as a `data:image/svg+xml` image inside `ImageResponse`
rather than as JSX shapes. Against the running stack on 2026-10-11 (Next.js
16.3.6), each icon URL the page links to was decoded in Chromium under the
real CSP and drawn to a 64 × 64 canvas: the SVG (150 × 150 natural) and the
180 × 180 apple-touch icon sampled `#005b57` on the tile, `#ffd84a` in the
falling beer, `#ffffff` in the foam and `#ff7a59` / `#f37959` on the bottle's
edge; the 32 × 32 PNG matched on the tile and the foam, its two thin-edge
samples blended by downscaling. `e2e/app-icons.spec.ts` passed in the same
run.
