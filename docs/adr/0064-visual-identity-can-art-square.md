# ADR-0064: Kalia's identity had outgrown the catalog it was chosen for, so it becomes Can art drawn square, with beer styles coloured by group

- **Status:** accepted
- **Date:** 2026-10-03
- **Supersedes:** [ADR-0021](0021-design-tokens-ui-primitives.md) (partial) —
  its palette, its typefaces, its claim that border-radius is not a re-theming
  concern, and its contrast evidence; its two-layer token rule, its primitives
  and its light-only decision stand

## Context

[ADR-0021](0021-design-tokens-ui-primitives.md) chose Kalia's identity in
iteration 2, when the app was a beer catalog: a warm cream ground, one mint
action colour, a single coral tint for badges, Fraunces for display and Inter
for everything else. The product has since grown a personal cellar, a public
cellar, a profile and a live front page, and the product owner judged the
identity should be more attractive and more modern.

The vocabulary was also thin in measurable ways. There was no state colour,
though the removal toast reports both success and failure and the remove
dialog confirms something that cannot be undone. There was no type scale
beyond one display size. The one accent was a single tint, and form fields were
edged in a colour that measured about 1.3:1 against the page, under the 3:1
WCAG asks of a control's boundary. And contrast was only checked when the
Playwright scans ran, which ADR-0021 itself records as a cost.

This was the first task run under the `design-task` skill
([ADR-0062](0062-a-design-task-is-a-skill-and-a-marker.md)): directions built
as mockups, shown to the product owner, and the choice recorded here. Where
the feel the identity aims at is written down is
[ADR-0063](0063-design-intent-has-its-own-document.md)'s answer, `docs/design.md`.

## Decision

**Kalia's visual identity is direction F, "Can art, square": a white page,
hairline ink edges, one cobalt action colour, Archivo run wide for display and
at normal width for reading, square corners and no shadows, with each beer's
style coloured by one of twelve style groups.**

- **The token layer** gains what the identity needs and the app already used
  without a token: a sunken surface, an ink `border` for every object's edge
  and a separate quiet `divider` for rules between lines, success and
  destructive state colours with their foregrounds, and a beer-style colour
  pair. The removal toast and the remove dialog use the state colours, and so
  does the profile's visibility-error toast. What each token means is
  `docs/design.md`; the values are `frontend/app/globals.css`.
- **Typography is one family.** Archivo loads through `next/font/google` with
  its width axis; the display face is the same family at 125 % width, set by
  the token itself, so a component asks for `font-display` and gets the wide
  cut. A four-step type scale (`display`, `title`, `heading`, `label`) joins
  the `@theme` block; running text stays on Tailwind's sizes. Labels on
  buttons, badges and navigation are tracked capitals.
- **Beer styles are coloured by group, not one by one.** Twelve groups and a
  grey for anything else. The product owner chose groups over a colour per
  style after seeing thirty: near-identical styles sharing a colour reads
  calmer, and the name tells a Porter from a Baltic Porter. A style name, which
  is free text in the catalog, is matched to its group by keyword in
  `frontend/lib/beerStyle.ts`, first match wins. Each group's colour is a
  `[data-beer-style]` block in `globals.css` setting one pair of variables,
  which two `@theme` tokens expose, so a component writes `bg-style` once and
  the attribute picks the colour. The mapping lives in the frontend only; the
  product owner chose that over a backend-owned style list, and the existing
  style badges use it from this change on.
- **Border-radius becomes a token; spacing does not.** ADR-0021 held that
  "spacing and border-radius … are not a re-theming concern". This redesign
  changed the radius of every primitive, which is what a re-theming concern
  is, so `--radius-control` and `--radius-surface` now carry it, both square
  in this identity. Spacing did not move with the identity: every direction
  was built on Tailwind's scale and the chosen one needed nothing else, so
  ADR-0021's claim stands for spacing.
- **No elevation.** Nothing casts a shadow; a dialog or toast is told from the
  page by its ink edge and, for a dialog, the scrim. There is no elevation
  token because there is nothing to vary.
- **Contrast is a build check.** `scripts/check-contrast.mjs` computes the
  WCAG 2.1 contrast of every pairing `docs/design.md` declares, and of every
  beer-style block, from the values in `globals.css`, and fails `make verify`
  and CI below AA. It replaces "computed by hand before committing" with a
  check that runs on every change to either file.
- **Light only, as before.** F is a light design; dark mode stays closed, as
  the iteration recorded.

**Not decided here:** how any page is laid out (tasks 06–10), the mark,
imagery and icons (task 04), the Keycloak pages (task 11), or a build rule
that rejects a hard-coded colour (task 05). Those pages keep their present
layouts in the new tokens until their tasks run, with one exception the
product owner agreed at sign-off: below the `sm` width a cellar row's badges
wrap onto their own line under the beer's name. The capitalised badges
otherwise squeezed an already-collapsed row (audit finding AUD-28) until its
name column was gone and a bottle count spilled past the card. Task 09 still
lays that row out.

## Alternatives considered

Every direction was a self-contained HTML mockup carrying seed beers and
Finnish strings, with a switch between a desktop and a 375px width, published
as a private Artifact. Each showed the identity on a cellar, the feed, a
catalog row, the remove dialog and both removal toasts, with its palette's
contrast computed from its own values and a type scale set in English and
Finnish.

**Round one: three directions.**

- **A, Nordic cellar.** A cool limestone ground, a deep fjord-blue action
  colour, warm amber marking a beer's strength, and soft raised cards with two
  shadow levels, set in Schibsted Grotesk and Hanken Grotesk. Calm, airy and
  restrained. Rejected because restraint was the opposite of what the product
  owner wanted: bold and cheerful.
- **B, Can art.** A white ground, 2px ink outlines, a cobalt action colour and
  six style-family colours as flat fields, Archivo at 125 % width set heavy,
  pill-shaped controls and no shadows. The product owner's favourite in this
  round and the next two; its boldness and cheerful colour became the aim.
- **C, Cellar ledger.** Ink on cool paper, a black action colour, one ochre
  stamp for vintages, Instrument Serif titles and IBM Plex Mono figures in a
  dense ruled table. Rejected as too quiet: colour played almost no part.

**Round two: B kept, two new directions.**

- **D, Bottle cap.** As bold as B in a different vocabulary: a butter-yellow
  ground, a violet action colour, rounded Fredoka titles, buttons on a solid
  ledge that pressed down, and crown caps coloured by strength. Rejected for
  B, whose vocabulary the product owner preferred.
- **E, Candlelit cellar.** The only dark direction: a warm near-black room
  lit by amber, smoked-glass panels, large calm Syne titles in one centred
  column. Choosing it would have turned ADR-0021's light-only identity into a
  dark-only one. Rejected for B.

**Round three: B kept, one new direction.**

- **F, Can art, square.** B's colours and Archivo unchanged, but every corner
  square, the ink edges 1px instead of 2px, titles a weight lighter, small
  tracked capitals for labels, and lighter ruled rows instead of filled wells.
  **Chosen**, as a slightly lighter, more minimal B.

**After the choice, two refinements of F, each built and shown before
building it into the app.**

- **A colour per style.** Thirty colours, one for every style in the catalog
  plus Stout and Baltic Porter, in families of related shades. Rejected by the
  product owner as too much variation.
- **A colour per style group.** Twelve groups and a grey, with the grouping
  rule live in the mockup so any style name could be tried. **Chosen**, with
  Märzen, Oktoberfest and Rauchbier added to the brown lagers.

**B's six style families as they stood.** The grouping F's mockup inherited
put pale ales, lagers and wheat beers in one blue, and stouts and porters in
one brown. Rejected in favour of the twelve groups above, which the product
owner specified.

**A backend-owned style list**, giving each catalog style a group in the
database and the API. More robust once users add beers with styles nobody
listed (iteration 8), but a schema and API change well outside a visual
identity. Rejected by the product owner for a frontend-only mapping; its
revisit trigger is below.

**Superseding ADR-0021 in full, or amending it.** Its two-layer rule, its
primitives, its dependency exceptions and its light-only decision all stand,
so superseding the whole would misdescribe it, and
[ADR-0019](0019-adr-format-and-conventions.md) forbids rewriting it. An
amendment would have buried a reversal of its identity, and of one of its
claims, inside a document whose title says nothing about either. Partial
supersession says exactly which parts moved.

**Declaring the contrast pairings somewhere other than `docs/design.md`**: in
`globals.css` comments, or in a JSON file the checker reads. Rejected because
the pairings are a statement of which tokens are meant to combine, which is
what `docs/design.md`'s token rows already describe, and a comment is a format
nothing else in the repository parses.

## Consequences

- Good, because the identity now has the vocabulary its six surfaces need: a
  state colour for success and for failure, a type scale, an edge strong
  enough for a form control, and a colour for every beer style.
- Good, because contrast fails `make verify` the moment a value or a pairing
  drops below AA, instead of when Playwright first renders the page.
- Good, because a style's colour comes from a rule anyone can read, change and
  test in one file, and a style nobody listed still lands somewhere sensible
  or in a neutral grey.
- Bad, because grouping by keyword on free text is a heuristic. A style whose
  name contains another group's keyword lands in that group, and moving one
  needs a frontend pull request rather than catalog data.
- Bad, because the pages keep their current layouts until tasks 06–10 run, so
  between now and then they show the new tokens in the old arrangement.
- Bad, because tracked capitals lengthen Finnish labels further than English
  ones, about 30 % for the longest button today, which every later layout has
  to leave room for.
- Neutral, because the two radius tokens are square, so today they do nothing
  visible. They exist so the next identity is a token change.
- Neutral, because a fill drawn at reduced opacity, such as a button's hover or
  the dialog scrim, is a blend the contrast check cannot see. The Playwright
  axe scans remain the check on those.
- **Revisit trigger:** the catalog gaining a controlled style vocabulary, most
  likely through iteration 8's beer contributions, should reopen whether the
  backend owns each style's group.

## Evidence

**Contrast of what ships**, computed by `node scripts/check-contrast.mjs` from
`globals.css` on 2026-10-03. Text needs 4.5:1 and non-text 3:1:

| Pairing | Ratio | Needs |
|---|---|---|
| foreground on background, and on surface | 18.73:1 | 4.5:1 |
| foreground on surface-sunken | 16.56:1 | 4.5:1 |
| muted-foreground on background, and on surface | 7.46:1 | 4.5:1 |
| primary-foreground on primary | 8.42:1 | 4.5:1 |
| accent-foreground on accent | 15.09:1 | 4.5:1 |
| success-foreground on success | 5.48:1 | 4.5:1 |
| destructive-foreground on destructive | 5.61:1 | 4.5:1 |
| style-foreground on style (the grey of *Anything else*) | 14.17:1 | 4.5:1 |
| border on background, and on surface | 18.73:1 | 3:1 |
| focus-ring on background, and on surface | 8.42:1 | 3:1 |
| focus-ring on surface-sunken | 7.45:1 | 3:1 |
| stout, porter, brown-lager (white text) | 18.69, 14.81, 7.91:1 | 4.5:1 |
| light-lager, wheat, belgian-light (ink text) | 16.63, 15.18, 12.38:1 | 4.5:1 |
| belgian-dark, ipa, pale-ale (ink text) | 5.49, 14.70, 12.27:1 | 4.5:1 |
| english-ale (white text) | 5.45:1 | 4.5:1 |
| strong-ale, sour (ink text) | 7.99, 10.10:1 | 4.5:1 |

Every direction in every round showed its own palette's ratios, computed from
its values, before the product owner saw it. All passed AA; none was shown
with a failing pairing.

**The contrast checker was confirmed to fail before it existed.**
`scripts/check-contrast.test.mjs` was written first, and the suite errored on
the missing module. Run against a stub that never reports a failure, 10 of
its 11 tests failed; the one that passed asserts the real palette meets AA,
which a checker that never fails satisfies trivially. With the checker, the
10 fixture tests pass, and the real-palette test passed once `docs/design.md`
declared its pairings.

**The design-token checker** learned that a Tailwind sub-property
(`--text-label--letter-spacing`) belongs to its token. Its new fixture test
failed against the checker as it was on `dev` and passes now.

**Every style in the catalog lands in the group the product owner described**:
`frontend/lib/beerStyle.test.ts` pins all 27 seeded styles, ten that are not in
the catalog yet (Baltic Porter, Märzen, Oktoberfest, Rauchbier among them), and
the five cases the rule order decides. A second test fails if a group has no
`[data-beer-style]` block or a block has no group.

**The cellar row at 375px**, measured in the running app: with the new badges
and the old row, the name column shrank to 0–10px (the audit had recorded
about 60px) and one bottle count ended 7px past its card. The surface tour
(`frontend/e2e/surface-tour.spec.ts`) gained a check that nothing in a cellar
row escapes the row or overflows its own box. Run against the unfixed row it
failed at 375px, naming the beer and brewery, and passed at 1280px. With the
badges wrapping below `sm`, all four tour tests pass.

**The product owner signed off the built app live** on 2026-10-03, in the
desktop app's browser pane at both agreed widths against the chosen mockup:
"Matches".

**Type, measured in the running app at 375px** (a 343px column, Archivo at
125 % width, bold): at `--text-title` (28px) the widest word in any Finnish
title is the username in *Käyttäjän olutharrastaja_88 kellari*, about 295px;
*rekisteröitymissivulla* would be about 353px, which is why headings break a
word wider than the line. *JATKA REKISTERÖITYMISEEN* at `--text-label` is
about 210px against 162px for *CONTINUE TO SIGN-UP*.
