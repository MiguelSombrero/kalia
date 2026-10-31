# Kalia — Design intent

What Kalia is meant to look and feel like, and what a change to how it looks
is judged against. The values that produce the look live in
[`web/app/globals.css`](../web/app/globals.css), the structure that
carries them in [architecture.md §5](architecture.md#5-client-design), and
the reasons each was chosen in the ADRs; this file holds the part none of
those can: the intent.

It exists for the reason [the glossary](glossary.md) does. Every screen here
is drawn by an agent whose context is discarded between sessions
([README.md](../README.md) roles), so a visual language that lives only in
the code is one each session re-derives from the values it happens to see.
Why this is a separate document rather than a section of an ADR, and where
its boundaries with the other three homes run:
[ADR-0063](adr/0063-design-intent-has-its-own-document.md).

It is linked rather than loaded. Read it before designing or restyling
anything a visitor sees; the `design-task` skill and
[architecture.md §5](architecture.md#5-client-design) point here.

## How this file is kept current

- **Every semantic token has exactly one meaning row** under
  [Semantic tokens](#semantic-tokens) below, and every row names a token that
  exists. A semantic token is anything declared in an `@theme` block of
  `web/app/globals.css`, inline or not — the layer components consume
  through Tailwind utilities. A Tailwind sub-property such as
  `--text-label--letter-spacing` belongs to its token's row rather than
  having one of its own. `scripts/check-design-tokens.mjs` fails the build in
  both directions; it runs under `make check`, hence CI's static-checks job,
  with a fixture self-test (`scripts/check-design-tokens.test.mjs`) because
  nothing in the real tree would otherwise trip it. Add the row in the same pull request as the token.
- **Every pairing under [Contrast pairings](#contrast-pairings) meets WCAG 2.2
  AA**, and so does every beer-style colour. `scripts/check-contrast.mjs`
  computes each from `globals.css`'s values and fails the build below AA; it
  runs under `make check`, hence CI's static-checks job, with its own fixture
  self-test.
- **Everything else is review-maintained.** Whether a feel statement still
  describes what ships, or a layout principle is still followed, is a
  reviewer's call — a checker that judged it would be guessing.
- **No values, ever.** A hex code, a font name or a pixel size written here is
  a second copy of `globals.css` or `app/[locale]/layout.tsx`, and a second
  copy is what drifts. Say what a token is *for*; the file it lives in says
  what it *is*.
- **This file is not an ADR and does not earn one.** It is the standing brief
  later work is held against, and it changes as that work adds to it. The
  decisions it reflects are each recorded in their own ADR, linked from the
  section they shaped.

## Not covered here

- **Values** — `web/app/globals.css` for colour and every other token,
  `web/app/[locale]/layout.tsx` for which typefaces load.
- **The token system's shape** —
  [architecture.md §5](architecture.md#5-client-design), decided in
  [ADR-0021](adr/0021-design-tokens-ui-primitives.md).
- **Rules for writing a component** —
  [web/README.md](../web/README.md) conventions. This file says
  which token to reach for; the README says how to reach.
- **Component documentation.** There is none, by decision: `components/ui/`
  stays the web app's own primitives rather than a design system, a look that
  recurs becomes a primitive there rather than a rule here, and a primitive's
  props are documented by its source and test
  ([ADR-0073](adr/0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md)).
- **UX copy and tone of voice** — out of scope for the redesign
  ([iteration 7.5](tasks/iteration-7.5.md)), and a translation-policy question
  under [ADR-0011](adr/0011-i18next-localization.md) when it is taken up.

---

## Feel

Can art drawn with a ruler. Kalia should feel like a shelf of craft-beer cans
you want to browse: bold, cheerful and quick to scan, more poster than
paperwork. It is a small-batch label printed on uncoated paper rather than a
glossy one, so the colour is flat and confident but the drawing is quiet: square
corners, hairline ink edges, a wide headline face used a weight lighter than it
could be, small tracked capitals doing the labelling, and plenty of white
around everything. Colour does a job rather than decorating: one cobalt means
"act here", and a beer's style group gives it a colour you learn once and then
read without thinking, so a sour and a stout are told apart across the page
before either name is read.

Reference points, so a later change can be checked against the same sources:

- Contemporary Nordic craft-can labels (Omnipollo, Põhjala, Lervig): flat
  colour fields and wide, heavy type.
- Small-batch brewery labels on uncoated stock, specialty coffee bags and
  record sleeves: one block of colour, lots of white, small type.
- Transit maps: a colour that stands for a category, learned once.
- Swiss grid posters: big shapes, few colours, no gradients, every edge
  straight.
- Archivo's own width axis: one family run wide for shouting and set normal
  for reading.

Chosen from built alternatives in
[iteration 7.5 task 03](tasks/iteration-7.5/03-visual-identity.md); the
directions that were rejected, and why, are
[ADR-0064](adr/0064-visual-identity-can-art-square.md).

## Semantic tokens

What each token means and when to reach for it. These rows describe the
identity [ADR-0064](adr/0064-visual-identity-can-art-square.md) chose; the
two-layer rule they sit in is
[ADR-0021](adr/0021-design-tokens-ui-primitives.md)'s.

### Colour

| Token | Means | Reach for it when |
|---|---|---|
| `--color-background` | The page itself — the ground every surface sits on. | Only the document body uses it as a fill; a component that wants to sit "on the page" leaves its background unset rather than repeating this. As text it is the paper showing through an ink tag. |
| `--color-surface` | A plane that holds one thing: a card, a dialog, a toast, a form field. | Content or an input needs to read as its own object. It shares the page's colour, so an edge in `--color-border` is what makes it one. |
| `--color-surface-sunken` | A well: a quieter plane set into a surface or the page. | Hovering an outline control, or grouping rows inside a card. Never for an object that should stand out. |
| `--color-foreground` | Primary text, and anything that must read at full strength. | Body copy, headings, values. Also the dialog scrim, at reduced opacity, and the fill of an ink tag: a flag a reader must not miss, such as a bottle past its best-before. Never a second action colour. |
| `--color-muted-foreground` | Secondary text: supporting, never essential to the task. | Labels, metadata, helper text, empty-state explanations — text a reader may skip. |
| `--color-border` | An object's edge, drawn in ink. | Every card, dialog, toast, field, badge and button outline: the hairline that makes a white plane read as a thing on a white page. Strong enough for WCAG's 3:1 for a control's boundary. |
| `--color-divider` | A quiet rule between lines of one list, and the fill of something not there yet. | Separating rows inside a surface, and the blocks of a loading skeleton. Never an object's edge — that is `--color-border`. |
| `--color-primary` | Kalia's one action colour: cobalt. | The fill of the single main action in a view, and the hover cue on anything else that can be activated. Used sparingly, so it keeps meaning "act here". |
| `--color-primary-foreground` | Text and icons placed on `--color-primary`. | Whenever something sits on a primary fill; never on its own. |
| `--color-accent` | A soft cobalt tint for an attribute that labels rather than acts. | The strength badge, the "You" tag on the visitor's own feed entries, and the one-time highlight on feed entries just shown. A beer's style is not an accent; it has its own colour below. |
| `--color-accent-foreground` | Text placed on `--color-accent`. | Whenever something sits on an accent fill; never on its own. |
| `--color-success` | Something the visitor asked for worked. | The icon cell of a toast reporting success. Not decoration, and never a second action colour. |
| `--color-success-foreground` | Text and icons placed on `--color-success`. | Whenever something sits on a success fill; never on its own. |
| `--color-destructive` | Something is removed for good, or something failed. | The confirm button of a removal that cannot be undone, the red square of every error (see [Feedback and errors](#feedback-and-errors)), and the edge of a field whose value is wrong. Never for a merely cautious action, and never for the words of an error. |
| `--color-destructive-foreground` | Text and icons placed on `--color-destructive`. | Whenever something sits on a destructive fill; never on its own. |
| `--color-focus-ring` | Where keyboard focus is. | Only `:focus-visible` outlines. It carries no other meaning, so it is never reused for decoration. |
| `--color-style` | The colour of a beer's style group. | A style badge, or anything else that labels a beer by its style. The element carries `data-beer-style` set from `beerStyleGroup()` in `lib/beerStyle.ts`; without it, it takes the grey of *Anything else*. See [Style groups](#style-groups). |
| `--color-style-foreground` | Text placed on `--color-style`. | Whenever something sits on a style fill; never on its own. Ink or white, whichever the group's colour needs. |
| `--color-mark-tile` | The mark's ground: the square its scene is drawn on. | Only inside the mark. Never a page, surface or label colour. |
| `--color-mark-beer` | The beer in the mark, in the bottle and falling from it. | Only inside the mark. It is not a style colour and never an accent. |
| `--color-mark-streak` | The darker runs in the falling beer. | Only inside the mark. |
| `--color-mark-bottle` | The bottle's outline in the mark. | Only inside the mark. Never an action or an error colour, warm as it is. |
| `--color-mark-foam` | The foam the beer lands in, and the light on the bottle's empty glass. | Only inside the mark. It is the page's white, kept as the mark's own so that changing the page never changes the mark. |

### Type

| Token | Means | Reach for it when |
|---|---|---|
| `--font-display` | The voice of the page: Archivo run wide, used large and briefly. | Page titles, dialog titles and `SectionHeading`'s `heading` look. Never for body text or controls. |
| `--font-sans` | The working face: the same family at normal width, for everything read or operated. | Everything not set in the display face — the body's default, so it rarely needs naming. |
| `--text-display` | A page title at desktop width. | The page's one `h1`, from the `md` breakpoint up. `PageTitle` in `components/ui/` renders it; a page never sets it by hand. |
| `--text-name` | A person's username as the title of their own profile, at desktop width. | Only the profile's `h1`, from the `md` breakpoint up, as `PageTitle size="name"`; below it the name takes `--text-title` like any page title. Larger than `--text-display` because the profile is the one page about a name. |
| `--text-title` | A page title on a phone, and a dialog title. | The page's `h1` below `md`, and `DialogTitle`. Sized so every word of today's Finnish titles fits a 375px column. |
| `--text-heading` | A section heading inside a page. | A section is headed by `SectionHeading` in `components/ui/`, in one of two looks. This token, in the display face, is the `heading` look: for a section whose heading is read as a sentence and which stands as a block of its own, such as an empty cellar, a sign-in prompt or the profile's visibility choice. The `label` look is `--text-label`: for a section whose heading only names the list or rack directly under it, such as the front page's feed, a beer's same-style list and the cellar summary. |
| `--text-label` | Small tracked capitals that label rather than read. | Button text, badges, navigation and other one- or two-word labels, always `uppercase` and `font-semibold`, and `SectionHeading`'s `label` look. Never for a sentence. |
| `--text-wordmark` | The name Kalia, set beside the mark. | The wordmark in the header, `uppercase` and `font-semibold`, in the working face at normal width and spaced wider than a label. Never for anything else: titles are `--font-display`, labels are `--text-label`. |

### Shape

| Token | Means | Reach for it when |
|---|---|---|
| `--radius-control` | The corner of anything that can be operated or that labels: buttons, fields, badges, skeleton blocks. | Every control. Square in this identity; it is a token so the next identity can change it in one place. |
| `--radius-surface` | The corner of a plane: a card, a dialog, a toast. | Every surface. Square in this identity, for the same reason. |

### Motion

| Token | Means | Reach for it when |
|---|---|---|
| `--animate-feed-reveal` | Content the visitor just asked to see, highlighted once so the eye finds it. | Feed entries shown by pressing "N new", and the catalog row of a beer the visitor has just added. Only under `motion-safe:`, so `prefers-reduced-motion` skips it; never on content that arrived without being asked for. |

There is no elevation token: nothing in this identity casts a shadow. A dialog
or a toast is told from the page by its ink edge and, for a dialog, the scrim.

## Style groups

A beer's style is free text in the catalog, so Kalia colours it by **group**
rather than by exact style: twelve groups, and a grey for anything that falls
outside them. Near-identical styles share a colour on purpose; telling a
Porter from a Baltic Porter is the name's job, not the colour's.

`beerStyleGroup()` in `web/lib/beerStyle.ts` maps a style name to its
group by keyword, first match wins — so a Belgian IPA is an IPA, a Berliner
Weisse is a sour before it is a wheat beer, and a Weizenbock is a wheat beer
before it is a bock. Each group's colour is a `[data-beer-style]` block in
`web/app/globals.css`. Its test fails if a group has no block or a block
has no group, and `scripts/check-contrast.mjs` holds every block to AA.

| Group | Takes | Colour |
|---|---|---|
| `stout` | Every stout, whatever its prefix: Imperial, Oatmeal, Milk, Pastry. | Black, white text. |
| `porter` | Every porter: Porter, Baltic Porter, Robust Porter. | Near-black brown, white text. |
| `brown-lager` | Dark and amber lagers: Dunkel, Bock, Doppelbock, Schwarzbier, Märzen, Oktoberfest, Vienna and other amber lagers, Rauchbier. | Mid brown, white text. |
| `light-lager` | Pale lagers: Pils, Helles, Kölsch, everyday lagers, Maibock. | Pale straw — the lightest yellow. |
| `wheat` | Wheat beers: Hefeweizen, Weizenbock, Dunkelweizen, Witbier. | Lemon yellow. |
| `belgian-light` | Pale Belgian ales: Tripel, Blonde, Strong Golden, Belgian Pale Ale, Saison. | Tripel gold. |
| `belgian-dark` | Dark Belgian ales: Dubbel, Quadrupel, Belgian Strong Dark. | Amber copper. |
| `ipa` | Every IPA: IPA, Double, Session, Belgian, New England. | Hop green. |
| `pale-ale` | Pale ales that are not IPAs: Pale Ale, Session Ale, Golden and Blonde Ale. | Sky blue. |
| `english-ale` | Darker-than-pale British-style ales, wherever brewed: ESB, Bitter, Mild, Brown, Amber and Scottish ales. | Copper-red, white text. |
| `strong-ale` | Barleywines and strong ales: Barleywine, Old Ale, Wee Heavy, Scotch Ale. | Orange. |
| `sour` | Sours, lambics and wild ales: Gueuze, Kriek, Fruit Lambic, Wild Ale, Gose, Berliner Weisse. | Pink. |
| `other` | Anything no keyword matches. | Neutral grey, until the style is given a group. |

Colours are expected to be tuned as the pages are laid out. Changing one is a
`globals.css` edit that the contrast check guards; moving a style between
groups, or adding a group, changes `lib/beerStyle.ts`, its test and this table
in the same pull request.

## Contrast pairings

Every foreground-on-background pairing the app uses, which
`scripts/check-contrast.mjs` holds to WCAG 2.2 AA in `make verify` and CI:
4.5:1 for `text`, 3:1 for `non-text` (a control's boundary or a focus
indicator). Every `[data-beer-style]` block is checked as well, without being
listed here. A new pairing gets a row in the pull request that introduces it.

| Foreground | Background | Kind |
|---|---|---|
| `--color-foreground` | `--color-background` | text |
| `--color-foreground` | `--color-surface` | text |
| `--color-foreground` | `--color-surface-sunken` | text |
| `--color-muted-foreground` | `--color-background` | text |
| `--color-muted-foreground` | `--color-surface` | text |
| `--color-muted-foreground` | `--color-surface-sunken` | text |
| `--color-primary-foreground` | `--color-primary` | text |
| `--color-accent-foreground` | `--color-accent` | text |
| `--color-foreground` | `--color-accent` | text |
| `--color-background` | `--color-foreground` | text |
| `--color-muted-foreground` | `--color-accent` | text |
| `--color-success-foreground` | `--color-success` | text |
| `--color-destructive-foreground` | `--color-destructive` | text |
| `--color-style-foreground` | `--color-style` | text |
| `--color-primary` | `--color-background` | text |
| `--color-primary` | `--color-surface` | text |
| `--color-primary` | `--color-surface-sunken` | text |
| `--color-primary` | `--color-background` | non-text |
| `--color-destructive` | `--color-background` | non-text |
| `--color-border` | `--color-background` | non-text |
| `--color-border` | `--color-surface` | non-text |
| `--color-focus-ring` | `--color-background` | non-text |
| `--color-focus-ring` | `--color-surface` | non-text |
| `--color-focus-ring` | `--color-surface-sunken` | non-text |
| `--color-mark-tile` | `--color-background` | non-text |
| `--color-mark-bottle` | `--color-mark-tile` | non-text |
| `--color-mark-beer` | `--color-mark-tile` | non-text |
| `--color-mark-foam` | `--color-mark-tile` | non-text |

What the check cannot see: a fill drawn at reduced opacity (a primary or
destructive button's hover, the dialog scrim, a button sending its form) is a
blend of two tokens, not a token. Those stay close enough to their solid
pairing to pass, and the Playwright `@axe-core/playwright` scans remain the
check on the rendered page. axe skips a disabled control, so it does not see
a button sending its form: that strength was measured by hand against its
label, and [ADR-0082](adr/0082-a-beer-is-added-over-the-search-that-missed-it-and-a-pending-button-stays-legible.md)
records the figures.

The mark is held part by part against what each part is seen on: the tile
against the page, and the bottle's edge, the beer and the foam against the
tile. The darker runs in the beer, and the bottle's edge where it meets the
beer inside it, are texture within one part and are not held.

## Typography across the two locales

Measured in the running app at 375px, where the content column is 343px wide:

- **Finnish is longer and builds long words.** The same string runs 20–40 %
  longer than its English, and compounds reach 22 letters
  (*rekisteröitymissivulla*). The wide display face makes that sharper than it
  would be in a normal-width face.
- **At `--text-title` (28px) every word of today's Finnish titles fits on one
  line.** The widest single word a title holds is a username in
  *Käyttäjän olutharrastaja_88 kellari*, at about 295px. A 22-letter compound
  would not fit (about 353px), and usernames have no length limit, so headings
  break a word that is wider than the line rather than overflowing it. A
  title is written so that does not happen in practice: a phone title stays at
  `--text-title`, and nothing longer than a title goes in the display face.
- **Labels in capitals grow the most.** *JATKA REKISTERÖITYMISEEN* is about
  30 % wider than *CONTINUE TO SIGN-UP* at `--text-label` (about 210px against
  162px), which still fits a phone column with the button's padding. A label is
  one or two words in both languages; a sentence never goes in capitals.
- **Finnish titles take two lines on a desktop where English takes one.** At
  `--text-display` (48px) the longest Finnish title phrases
  (*Kirjaudu sisään nähdäksesi kellarisi*, *Käyttäjän olutharrastaja_88
  kellari*) measure about 980–1,010px against 700–725px for their English, so
  in a column narrower than about 1,000px the Finnish wraps and the English
  does not. Layouts leave room for the second line rather than truncating.

## Layout principles

What holds on every page rather than on one. A rule that holds for one page
only belongs in that page's own task and ADR, not here. Chosen from built
alternatives in [iteration 7.5 task 06](tasks/iteration-7.5/06-page-shell.md);
the directions that were rejected, and why, are
[ADR-0067](adr/0067-page-shell-sticky-bar-and-page-component.md). The widths
and the breakpoint live in `web/components/ui/page.tsx` and
`web/app/[locale]/SiteHeader.tsx`, not here.

- **A page is a `Page` and one of three widths, and never a container of its
  own.** *Text* is for reading a list or a short page, *wide* for a page whose
  content is a grid that wants the whole frame, *narrow* for a form or a
  message. A new page picks one of these; it does not invent a fourth.
- **The header, every page and the footer share one frame, and every width is
  flush to its left edge.** A page's title starts where the wordmark above it
  starts, whichever width the page chose. A narrow page is not centred.
- **A page is as tall as its content.** Nothing is given a viewport height to
  fill the window; the space between the header and the footer belongs to the
  page, so a short page ends on the footer and a message sits at the top of the
  page, not in the middle of an empty one.
- **The header is one row, always on screen, at every width.** It holds the
  mark and wordmark as the way home, the destinations, and the account actions.
  Below the large breakpoint the destinations move behind one Menu button and
  the row does not grow or wrap; the phone is not a second, taller header.
- **Sign in is the one filled control in the header**, and Create an account is
  outlined beside it. They are the two ways into the product and are never as
  quiet as the navigation.
- **A control has one home.** Language and account live in the header and, on a
  phone, its menu; the footer repeats neither. A destination may appear in both
  the header and the menu because the menu is the header on a phone.
- **The footer carries identity and nothing that does a job**: the mark and the
  tagline. It is there so no page ends in empty paper, not to be navigated from.
- **A form shows one submit button at a time, and it comes last.** Its place
  says what it sends: everything above it. A form that folds part of itself
  away on a phone keeps that one button outside the fold rather than giving
  the fold a second one. Chosen in
  [iteration 7.5 task 08](tasks/iteration-7.5/08-catalog-layout.md)
  ([ADR-0069](adr/0069-catalog-one-ruled-column-beside-a-filter-column-with-one-search-button.md)).
- **A page that is one form is a narrow page, flush left like every other.**
  Sign-up is the model: a title, what happens next as numbered steps when the
  form starts a sequence, the fields, and the one button filling the column.
  Chosen in
  [iteration 7.5 task 10](tasks/iteration-7.5/10-profile-and-sign-up-layout.md)
  ([ADR-0071](adr/0071-profile-a-name-tag-over-two-visibility-choices-and-one-error-style.md)).
- **Keycloak's pages are the same single form with no frame around it.** They
  have no header or footer of Kalia's to sit flush against, so the form column
  is centred in the window instead, under the mark and wordmark as the header
  sets them, which link home, and a hairline rule. Every one of them starts at
  the same height, and none of them carries a second language control. Chosen
  in [iteration 7.5 task 11](tasks/iteration-7.5/11-keycloak-pages-carry-the-identity.md)
  ([ADR-0074](adr/0074-keycloak-pages-one-open-column-under-the-lockup-with-a-palette-drift-check.md)).
- **Every page is laid out for 375 and 1280 wide, and everything in the shell
  can be tapped.** Header, menu and footer controls are comfortably above the
  iteration's smallest target; a page's own controls are held to the same
  floor by its own task.

## Feedback and errors

How Kalia tells a visitor what happened. Chosen in
[iteration 7.5 task 10](tasks/iteration-7.5/10-profile-and-sign-up-layout.md)
([ADR-0071](adr/0071-profile-a-name-tag-over-two-visibility-choices-and-one-error-style.md)).

- **A red square with a white cross means "error", everywhere.** It is the
  one sign for something gone wrong, at three sizes. Nothing else is drawn in
  `--color-destructive` except the confirm button of a removal.
- **An error about one field sits on that field.** The field's edge turns
  `--color-destructive`, and a line under it starts with the small red square
  and says what to fix. The line is tied to the field, so assistive technology
  reads it with the field. The words are in `--color-foreground`, never red.
- **An error about a whole action is a box above that action's button**: an
  ink edge, the red cell with the cross, and the message. A failure to load
  part of a page is the same box where that part would be, with a way to try
  again.
- **A refusal because something already exists names it and links to it.**
  The box above the button says which beer or brewery the catalog already
  has and offers the way to it, never a generic error. Chosen in
  [iteration 8 task 03](tasks/iteration-8/03-add-beer-ui.md)
  ([ADR-0082](adr/0082-a-beer-is-added-over-the-search-that-missed-it-and-a-pending-button-stays-legible.md)).
- **A button sending its form says so, and fades only as far as its label
  stays legible.** From the press until the request settles, its label names
  the action in progress (*Adding…*, *Saving…*), it is disabled, it is drawn
  faded with the progress cursor, and hover does not change it. The fade is
  `Button`'s `pending` state, set to the faintest strength at which its label
  still meets AA as text; reach for that state rather than a fade of a
  button's own. A destructive button is never left waiting this way, because
  white on its fill falls below AA at that strength: a removal closes its
  dialog at once and reports by toast. A control disabled for any other
  reason is not this state. Chosen in
  [iteration 8 task 03](tasks/iteration-8/03-add-beer-ui.md)
  ([ADR-0082](adr/0082-a-beer-is-added-over-the-search-that-missed-it-and-a-pending-button-stays-legible.md)).
- **The outcome of something already done is a toast, and it goes away.** A
  toast reports success in green or failure in red, the cell beside the
  message, and dismisses itself. Nothing about a save stays on the page once
  the toast is gone; the page's own state already shows what is now true.
- **A choice that publishes something asks first. Undoing it does not.**
  Making a cellar public asks once, inline, and lists what becomes visible;
  making it private happens at once.

## Imagery and the mark

**Kalia draws no pictures of beers.** There are no beer photographs to show,
and a generated stand-in, a pattern or a monogram, would tell a visitor less
than the facts a beer already has while taking room in every row. Imagery in
Kalia is a fact drawn large enough to scan, never decoration, and where a
surface does not know the fact, nothing is drawn.

Chosen from built alternatives in
[iteration 7.5 task 04](tasks/iteration-7.5/04-imagery-iconography-and-the-mark.md);
the directions that were rejected, and why, are
[ADR-0065](adr/0065-imagery-icons-and-mark-specimen.md). The mark was chosen
again on its own in
[task 16](tasks/iteration-7.5/16-kalia-mark-redesign.md), and the directions
rejected there are [ADR-0072](adr/0072-the-mark-is-a-bottle-pouring-into-foam-on-a-teal-tile.md).

### What each placeholder stands in for

- **A beer's slot stands in for the beer's photograph.** Where the strength is
  known it is a band of the beer's style colour with the strength set large,
  like the figure on a specimen label. In a list, where only the style is
  known, it is a thin strip of that colour beside the row. Where neither is
  known, there is no slot and the row is text. A layout reserves room for a
  slot only when the data to fill it exists; it never leaves an empty box.
- **A person's slot stands in for their photograph.** It is their initials in
  a hairline square, with no colour. Colour in this identity has two jobs,
  telling beer styles apart and marking the one action, so a person is not
  given a third. The mark's own colours are outside both, and are used nowhere
  but the mark.
- **Both are decorative.** A beer's strength and a person's name are always
  written beside them as text, so the slots are hidden from assistive
  technology rather than named. A feed entry writes the strength for assistive
  technology only, since its band already shows it to the eye.
- **They are the frames an upload will later fill.** The band and the square
  are the shapes a beer photograph and a profile picture would go in, so
  adding uploads later changes what is inside the frame and not the layout
  around it.

### Icons

A word is the default. An icon appears only for the few jobs a word cannot do
well, such as a menu on a phone, a close on a dialog, a tick or a cross in a
toast, an arrow or a search. There are few of them on purpose: Finnish labels
are longer than English ones and an icon beside every word would take room the
word needs. They are drawn in the same plain line as the hairline edges, with
square ends, so they read as part of the same hand. An icon beside a word is
hidden from assistive technology; one that stands alone carries a name.
Navigation tabs, container types, edit, remove and visibility stay words.

### The mark

The mark is a bottle being poured. A clear bottle, outlined in coral, is
tipped neck-down and empties a sheet of yellow beer that falls into a billow
of white foam, all on a deep teal square. The bottle is what a cellar keeps,
and the pour is the moment it was kept for: Kalia is about laying beer down,
and this is what laying it down is for. The bottle carries no label, so beer
fills it from base to neck and its shape alone says "bottle".

It is a scene on its own tile, so it is its own square form: the browser tab
and the home-screen icon show the mark itself, and it keeps its edge on a dark
tab as on a light one. At the size of a browser tab it comes down to a teal
square with a yellow fall into white.

Its colours belong to it alone. The teal, the yellows, the coral and the
foam's white are used nowhere else in the app, so the page keeps its one action
colour and the style colours keep their meaning; the mark is the one place the
identity is bright. Each part of it is held to the contrast bar for graphics
against what it is seen on.

Beside it the name is set in capitals at normal width and widely spaced. The
wide display face is for page titles, so the wordmark labels and does not
shout. The mark stands alone, without the name, wherever there is only room
for a square: the browser tab and the home-screen icon.

Keycloak's pages carry the same mark and wordmark in the same lockup. No
typeface is loaded on Keycloak's origin, so there the wordmark, like every
other word, is set in the visitor's system face: the same shape and spacing,
not the same letters.
