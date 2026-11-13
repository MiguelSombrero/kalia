# Kalia — Design intent

What Kalia is meant to look and feel like, and what a change to how it looks
is judged against. The values that produce the look live in
[`packages/tokens/src/tokens.ts`](../packages/tokens/src/tokens.ts), the structure that
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
  exists. Semantic token families are defined in the source; composite
  animations remain in `web/app/globals.css`. A Tailwind sub-property such as
  `--text-label--letter-spacing` belongs to its token's row rather than
  having one of its own. `scripts/check-design-tokens.mjs` fails the build in
  both directions; it runs under `make check`, hence CI's static-checks job,
  with a fixture self-test (`scripts/check-design-tokens.test.mjs`) because
  nothing in the real tree would otherwise trip it. Add the row in the same pull request as the token.
- **Every pairing under [Contrast pairings](#contrast-pairings) meets WCAG 2.2
  AA**, and so does every beer-style colour. `scripts/check-contrast.mjs`
  computes each from the token source in both modes and fails the build below AA; it
  runs under `make check`, hence CI's static-checks job, with its own fixture
  self-test.
- **Everything else is review-maintained.** Whether a feel statement still
  describes what ships, or a layout principle is still followed, is a
  reviewer's call — a checker that judged it would be guessing.
- **No values, ever.** A hex code, a font name or a pixel size written here is
  a second copy of the token source or `app/[locale]/layout.tsx`, and a second
  copy is what drifts. Say what a token is *for*; the file it lives in says
  what it *is*.
- **This file is not an ADR and does not earn one.** It is the standing brief
  later work is held against, and it changes as that work adds to it. The
  choices it reflects are each recorded in their own
  [design record](design-records/README.md) — or, before 2026-11-13, their
  own ADR — linked from the section they shaped.

## Not covered here

- **Values** — `packages/tokens/src/tokens.ts`; the generator writes the web
  and Keycloak stylesheets and mobile theme
  ([ADR-0107](adr/0107-one-typescript-token-source-generates-the-webs-css-the-apps-theme-and-keycloaks-stylesheet-by-a-generator-of-our-own.md)).
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

## Mobile navigation

Feed, Catalog, a central Add action, Cellar and Profile stay in that order.
Add, filters and beer details open as sheets with a visible dismissal; the
platform supplies its own navigation chrome. Screen-specific layout remains for
the corresponding screen task.
([ADR-0109](adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md))

### Tab icons

Every tab shows a picture above its word, always, in English and Finnish: Feed
is rising bubbles with a glint, Catalog a bottle, Cellar a barrel and Profile a
person. Add is a plus on its cobalt circle and has no word.
([design record](design-records/iteration-11-22-mobile-tab-icons.md))

- **Pictures from Kalia's world, drawn by us.** Round ends and joins, one stroke
  weight, a rounded outline when unselected and the same picture filled when
  selected. The phone's drawings are its own: the web's navigation stays words
  ([ADR-0065](adr/0065-imagery-icons-and-mark-specimen.md)).
- **A picture means one thing.** Catalog is the beer itself, the bottle; Cellar
  is where it is kept, the barrel. A new destination takes a picture that
  names it by what it holds or where it lives, and does not reuse one.
- **The picture takes the bar's tint** and carries no colour of its own, so one
  drawing is right in light and dark. The selected tab fills its picture, sets
  it on a pill of the soft action tint and sets its word bold, with no underline.
- **Decorative beside its word.** The word names the tab, so assistive
  technology never sees the picture; the Add circle is named by its action.
- **The bar's height is fixed** and holds the picture and the word, so the word
  stays near its default size however large the system text is.

## Mobile identity

Colour fields, set light. On a phone a beer is a flat field of its style group's
colour with its name set heavy and its strength set large, so the list reads like
a shelf of cans and a style is learned once and read across the screen. Colour
still does a job: a beer's style is its field, and cobalt marks the one action.
The mark and the twelve style colours are the web's; the typeface, the corners
and the density are the phone's own.
([ADR-0110](adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md))

- **A light page.** A white ground, a white tab bar with an ink hairline above
  it, and cobalt for the selected tab. When the system is set to dark the phone
  follows it with the identity below.
- **One round corner.** Cards, buttons, fields and a person's slot share one
  radius, `--radius-card`; nothing on the phone is square and nothing is
  rounder. The web stays square.
- **One face.** Titles, names and strengths are the heaviest weight, supporting
  lines one step lighter, and nothing is lighter than ordinary. Reading text
  scales with the system text size without a limit. A screen title stops at
  twice its size so one word still fits the width, and the tab bar's labels
  stay near their default size because its height is fixed. Where the strength
  would squeeze a beer's name, the card gives it a line of its own.
- **A card is the beer's slot.** The style colour fills it, the text on it takes
  the colour paired with that group, and the strength is the largest thing on it.
  A style that belongs to no group, or a group this build does not list, takes
  the neutral grey and stays readable.
- **A person is initials in an ink-edged slot,** never in a colour: colour on
  the phone means a beer's style or the action.
- **A main action is one cobalt block** and stretches the width of its
  container; any other action beside it is the same block outlined in ink, so
  a screen has one cobalt action.
- **Taller than a thumb needs.** Pressable things are at least `--spacing-touch`
  high and the main action `--spacing-action`.
- **Not decided here.** The mark's place in the app, search and
  filters ([task 23](tasks/iteration-11/23-design-the-catalogs-search-and-filters.md)).

### Dark

The phone follows the system's setting and has no switch of its own. In dark a
beer is a neutral raised card with its style colour carried by a slab down the
card's leading edge, so the colour a user learned in light is the same colour
in dark and the card itself does not glare.
([ADR-0112](adr/0112-the-phone-follows-the-system-into-a-dark-mode-of-neutral-cards-with-the-style-colour-in-a-slab.md))

- **A graphite page.** The ground is near-black graphite and a card, the
  person's panel and the tab bar are each a step lighter. The ink is a soft
  white, the action is a lightened cobalt with ink on it, and the tab bar has a
  quiet divider above it where light has an ink hairline.
- **The slab carries the style.** Its colour is the group's colour exactly as
  in light and it is as tall as the card. The name, the brewery, the style and
  the strength are ordinary text on the card, so their contrast never depends
  on the style. A slab that cannot stand off the card by 3:1 is outlined so it
  stays visible.
- **Only the card's surface differs.** A card is a style-coloured field in
  light and a neutral card with a slab in dark; the corner, the face, the sizes,
  the weights and the controls are the same in both.
- **The splash and the mark are unchanged.** The splash keeps its teal in both
  modes and the mark stays off dark pages. The first frame reads the system's
  scheme, so no light frame flashes in dark.
- **Not decided here.** A switch of the user's own, and a dark web
  ([ADR-0112](adr/0112-the-phone-follows-the-system-into-a-dark-mode-of-neutral-cards-with-the-style-colour-in-a-slab.md)).

## Mobile motion

Motion on the phone explains a change and never decorates one, and the amount
is small. Durations and easings are the tokens under [Motion](#motion); the
values live in the token source, never in a component.

- **A screen change is quick.** Switching tabs cross-fades over `--duration-tab`.
  A pushed screen and a sheet use the platform's own transition, which already
  follows a finger; a sheet is never replaced by a custom one.
- **A press shrinks the control a little** over `--duration-press` and dims it,
  and returns on release. Only controls that act do this; text and cards that
  do not act stay still.
- **Content that arrives fades in once** over `--duration-reveal`, with no
  movement and no stagger, so a list that fills never looks like it is
  travelling.
- **A list that changes slides the rows that stay** over `--duration-layout`.
  A list that updates while it is scrolled never moves content under the
  finger: rows inserted above the viewport keep the scroll position.
- **Loading shows the shape of what is coming.** Placeholder blocks breathe
  slowly over `--duration-pulse`, beside the words that say it is loading.
  Refreshing a list is the platform's own pull indicator.
- **Reduced motion follows the system setting on both platforms,** with no
  switch in the app. Every one of the above reaches its final state at once:
  tabs switch without a fade, a pushed screen cross-fades, a pressed control
  changes only its opacity, content is simply there, rows jump to their new
  place and placeholders hold still. No information is carried by motion
  alone, so a screen reads the same with all of it removed.
- **What is felt is only the result of an action the person took:** a success
  when something was saved, a warning when something was removed, an error when
  it could not be. Taps, tab changes, sheets and refreshes carry no haptic. A
  haptic is never the only sign of a result, and it follows the system's own
  haptics setting and does nothing where the device has no motor.

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
[ADR-0021](adr/0021-design-tokens-ui-primitives.md)'s. A token keeps its
meaning in the phone's dark mode, where it has its own value; a phrase such as
"ink" or "white" below names the role in light, not the value in dark.

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
| `--color-bar-edge` | The line above the phone's tab bar. | Only the tab bar's top edge. Ink in light, where it is the identity's hairline, and a quiet divider in dark, where an ink-bright line would shout. |
| `--color-style` | The colour of a beer's style group. | A style badge, or anything else that labels a beer by its style. The element carries `data-beer-style` set from `beerStyleGroup()` in `@kalia/api`; without it, it takes the grey of *Anything else*. See [Style groups](#style-groups). |
| `--color-style-foreground` | Text placed on `--color-style`. | Whenever something sits on a style fill; never on its own. Ink or white, whichever the group's colour needs. |
| `--color-mark-tile` | The mark's ground: the square its scene is drawn on. | Only inside the mark. Never a page, surface or label colour. |
| `--color-mark-beer` | The beer in the mark, in the bottle and falling from it. | Only inside the mark. It is not a style colour and never an accent. |
| `--color-mark-streak` | The darker runs in the falling beer. | Only inside the mark. |
| `--color-mark-bottle` | The bottle's outline in the mark. | Only inside the mark. Never an action or an error colour, warm as it is. |
| `--color-mark-foam` | The foam the beer lands in, and the light on the bottle's empty glass. | Only inside the mark. It is the page's white, kept as the mark's own so that changing the page never changes the mark. |

### Type

| Token | Means | Reach for it when |
|---|---|---|
| `--font-display` | The voice of the page: Archivo run wide, used large and briefly. On the phone the display and the working text share one face. | Page titles, dialog titles and `SectionHeading`'s `heading` look. Never for body text or controls. |
| `--font-sans` | The working face: the same family at normal width, for everything read or operated. | Everything not set in the display face — the body's default, so it rarely needs naming. |
| `--text-display` | A page title at desktop width. | The page's one `h1`, from the `md` breakpoint up. `PageTitle` in `components/ui/` renders it; a page never sets it by hand. |
| `--text-name` | A person's username as the title of their own profile, at desktop width. | Only the profile's `h1`, from the `md` breakpoint up, as `PageTitle size="name"`; below it the name takes `--text-title` like any page title. Larger than `--text-display` because the profile is the one page about a name. |
| `--text-title` | A page title on a phone, and a dialog title. | The page's `h1` below `md`, and `DialogTitle`. Sized so every word of today's Finnish titles fits a 375px column. |
| `--text-heading` | A section heading inside a page. | A section is headed by `SectionHeading` in `components/ui/`, in one of two looks. This token, in the display face, is the `heading` look: for a section whose heading is read as a sentence and which stands as a block of its own, such as an empty cellar, a sign-in prompt or the profile's visibility choice. The `label` look is `--text-label`: for a section whose heading only names the list or rack directly under it, such as the front page's feed, a beer's same-style list and the cellar summary. |
| `--text-label` | Small tracked capitals that label rather than read. | Button text, badges, navigation and other one- or two-word labels, always `uppercase` and `font-semibold`, and `SectionHeading`'s `label` look. Never for a sentence. |
| `--text-wordmark` | The name Kalia, set beside the mark. | The wordmark in the header, `uppercase` and `font-semibold`, in the working face at normal width and spaced wider than a label. Never for anything else: titles are `--font-display`, labels are `--text-label`. |
| `--text-screen-title` | A screen's title on the phone. | The one heading that names a screen: Catalog, Profile, the sign-in invitation, "update required". Larger than any other text, tight set, and always the heaviest weight. |
| `--text-item-title` | The title of one item on the phone. | A beer's name on its card, the line that names the signed-in person, a sheet's heading. Never for a screen's own title. |
| `--text-strength` | A beer's strength written large, like the figure on a specimen label. | The strength numeral on a beer's card, with its unit set in `--text-supporting`. Never for any other number. |
| `--text-body` | Ordinary reading text on the phone. | Explanations, hints and button labels. Sized to the platform's own reading size so the system text-size setting scales it as every other app's. |
| `--text-supporting` | Supporting text on the phone: a line that adds to a heading and is never essential. | A brewery under a beer's name, the build line, the unit after a strength. |
| `--weight-normal` | Ordinary text weight on the phone. | Text that is only read: a status line, the loading notice. |
| `--weight-medium` | A little firmer than ordinary, for text read alongside a heading. | Hints, explanations and a brewery under a beer's name. |
| `--weight-bold` | The weight of everything that names or acts on the phone. | Titles, names, strengths, labels and button text. The phone has no other heavy weight, so a bold line is always one of these. |

### Spacing

| Token | Means | Reach for it when |
|---|---|---|
| `--spacing-small` | A small separation on the phone. | The gap between cards in a list, and between a heading and the line under it. |
| `--spacing-tight` | The vertical padding inside a card, a little tighter than the one beside it. | A beer's card, so its colour field hugs the three lines it holds. |
| `--spacing-medium` | A regular separation on the phone. | A screen's side margin, a card's side padding, the gap before a section. |
| `--spacing-large` | A generous separation. | The space above a button, and between a screen's blocks. |
| `--spacing-xlarge` | A larger separation. | The space before a screen's footer, such as the build line. |
| `--spacing-touch` | The smallest thing a thumb is asked to hit. | The minimum height or width of anything pressable that is not the main action, and the slot a person's initials sit in. |
| `--spacing-action` | The height of the main action. | A screen's one primary button, which is taller than the least a thumb needs. |

### Shape

| Token | Means | Reach for it when |
|---|---|---|
| `--radius-control` | The corner of anything that can be operated or that labels: buttons, fields, badges, skeleton blocks. | Every control. Square in this identity; it is a token so the next identity can change it in one place. |
| `--radius-surface` | The corner of a plane: a card, a dialog, a toast. | Every surface. Square in this identity, for the same reason. |
| `--radius-card` | The one rounded corner of the phone: a card, a button, a field and the slot for a person. | Every plane and every control in the app. It is a token of its own because the phone's identity is round where the web's is square, and the web's two radii do not reach the phone. |

### Motion

| Token | Means | Reach for it when |
|---|---|---|
| `--animate-feed-reveal` | Content the visitor just asked to see, highlighted once so the eye finds it. | Feed entries shown by pressing "N new", and the catalog row of a beer the visitor has just added. Only under `motion-safe:`, so `prefers-reduced-motion` skips it; never on content that arrived without being asked for. |
| `--duration-feed-reveal` | Duration of a reveal. | The feed reveal animation. |
| `--easing-out` | A slowing movement. | The feed reveal animation; on the phone a press and a reveal. |
| `--easing-in-out` | A movement that eases at both ends. | On the phone, a tab fade and a placeholder's breathing. |
| `--duration-press` | How long a pressed control takes to shrink and return. | The phone's pressable controls ([mobile motion](#mobile-motion)). |
| `--duration-reveal` | How long arriving content takes to fade in. | A list row or other content that has just loaded, on the phone. |
| `--duration-layout` | How long rows take to slide to their new place. | A list on the phone whose rows are added or removed. |
| `--duration-tab` | How long the tab cross-fade takes. | Switching tabs on the phone. |
| `--duration-pulse` | Half a breath of a loading placeholder. | A placeholder block while content loads, on the phone. |

There is no elevation token: nothing in this identity casts a shadow. A dialog
or a toast is told from the page by its ink edge and, for a dialog, the scrim.

## Style groups

A beer's style is free text in the catalog, so Kalia colours it by **group**
rather than by exact style: twelve groups, and a grey for anything that falls
outside them. Near-identical styles share a colour on purpose; telling a
Porter from a Baltic Porter is the name's job, not the colour's.

`beerStyleGroup()` in `@kalia/api` (`packages/api/src/core/beer-style.ts`), which both clients use, maps a style name to its
group by keyword, first match wins — so a Belgian IPA is an IPA, a Berliner
Weisse is a sour before it is a wheat beer, a Weizenbock is a wheat beer
before it is a bock, and a Wheatwine is a strong ale before it is a wheat beer.
The ingredient words (fruit, Brett, Faro) are tried last, so a Fruited Stout
stays a stout. Each group's colour is a `[data-beer-style]` block in
the generated web token stylesheet. Its test fails if a group has no block or a block
has no group, and `scripts/check-contrast.mjs` holds every block to AA.

| Group | Takes | Colour |
|---|---|---|
| `stout` | Every stout, whatever its prefix: Imperial, Oatmeal, Milk, Pastry. | Black, white text. |
| `porter` | Every porter: Porter, Baltic Porter, Robust Porter. | Near-black brown, white text. |
| `brown-lager` | Dark and amber lagers: Dunkel, Bock, Doppelbock, Schwarzbier, Märzen, Oktoberfest, Vienna and other amber lagers, Rauchbier and other smoked beers, Steam Beer. | Mid brown, white text. |
| `light-lager` | Pale lagers: Pils, Helles, Kölsch, everyday lagers, Maibock, Zwickelbier, and the light, ice and rice beers. | Pale straw — the lightest yellow. |
| `wheat` | Wheat beers: Hefeweizen, Weizenbock, Dunkelweizen, Witbier. | Lemon yellow. |
| `belgian-light` | Pale Belgian ales: Tripel, Blonde, Strong Golden, Belgian Pale Ale, Saison, Farmhouse Ale, Champagne Beer. | Tripel gold. |
| `belgian-dark` | Dark Belgian ales: Dubbel, Quadrupel, Belgian Strong Dark. | Amber copper. |
| `ipa` | Every IPA: IPA, Double, Session, Belgian, New England. | Hop green. |
| `pale-ale` | Pale ales that are not IPAs: Pale Ale, Session Ale, Golden, Blonde and Cream Ale. | Sky blue. |
| `english-ale` | Darker-than-pale British-style ales, wherever brewed: ESB, Bitter, Mild, Brown, Amber and Scottish ales, Altbier, Bière de Garde, Pumpkin Ale. | Copper-red, white text. |
| `strong-ale` | Barleywines and strong ales: Barleywine, Wheatwine, Old Ale, Wee Heavy, Scotch Ale, Winter Warmer. | Orange. |
| `sour` | Sours, lambics, wild ales and fruit beers: Gueuze, Kriek, Fruit Lambic, Wild Ale, Brett Beer, Faro, Gose, Berliner Weisse, Fruit Beer. | Pink. |
| `other` | Anything no keyword matches, including styles that name a strength or an ingredient rather than a colour: Low-Alcohol Beer, Chili Beer, Small Beer, Rye Beer. | Neutral grey, until the style is given a group. |

On the phone in dark a group's colour is the slab on a neutral card, and the
twelve colours and their pairs are the same as in light
([Mobile identity](#dark)).

Colours are expected to be tuned as the pages are laid out. Changing one is a
`globals.css` edit that the contrast check guards; moving a style between
groups, or adding a group, changes `beer-style.ts`, its test and this table
in the same pull request.

## Contrast pairings

Every foreground-on-background pairing the app uses, which
`scripts/check-contrast.mjs` holds to WCAG 2.2 AA in `make verify` and CI:
4.5:1 for `text`, 3:1 for `non-text` (a control's boundary or a focus
indicator). Every `[data-beer-style]` block is checked as well, without being
listed here. A new pairing gets a row in the pull request that introduces it.
`Modes` says where it is held: `both` for the light and the dark phone, `light`
for a pairing that only the light identity has (a row with no fourth cell is
`both`).

| Foreground | Background | Kind | Modes |
|---|---|---|---|
| `--color-foreground` | `--color-background` | text | both |
| `--color-foreground` | `--color-surface` | text | both |
| `--color-foreground` | `--color-surface-sunken` | text | both |
| `--color-muted-foreground` | `--color-background` | text | both |
| `--color-muted-foreground` | `--color-surface` | text | both |
| `--color-muted-foreground` | `--color-surface-sunken` | text | both |
| `--color-primary-foreground` | `--color-primary` | text | both |
| `--color-accent-foreground` | `--color-accent` | text | both |
| `--color-foreground` | `--color-accent` | text | both |
| `--color-background` | `--color-foreground` | text | both |
| `--color-muted-foreground` | `--color-accent` | text | both |
| `--color-success-foreground` | `--color-success` | text | both |
| `--color-destructive-foreground` | `--color-destructive` | text | both |
| `--color-style-foreground` | `--color-style` | text | both |
| `--color-primary` | `--color-background` | text | both |
| `--color-primary` | `--color-surface` | text | both |
| `--color-primary` | `--color-surface-sunken` | text | both |
| `--color-primary` | `--color-background` | non-text | both |
| `--color-destructive` | `--color-background` | non-text | both |
| `--color-border` | `--color-background` | non-text | both |
| `--color-border` | `--color-surface` | non-text | both |
| `--color-muted-foreground` | `--color-surface` | non-text | both |
| `--color-primary` | `--color-surface` | non-text | both |
| `--color-primary` | `--color-accent` | non-text | both |
| `--color-focus-ring` | `--color-background` | non-text | both |
| `--color-focus-ring` | `--color-surface` | non-text | both |
| `--color-focus-ring` | `--color-surface-sunken` | non-text | both |
| `--color-mark-tile` | `--color-background` | non-text | light |
| `--color-mark-bottle` | `--color-mark-tile` | non-text | both |
| `--color-mark-beer` | `--color-mark-tile` | non-text | both |
| `--color-mark-foam` | `--color-mark-tile` | non-text | both |

What the check cannot see: a fill drawn at reduced opacity (a primary or
destructive button's hover, the dialog scrim, a button sending its form) is a
blend of two tokens, not a token. Those stay close enough to their solid
pairing to pass, and the Playwright `@axe-core/playwright` scans remain the
check on the rendered page. axe skips a disabled control, so it does not see
a button sending its form: that strength was measured by hand against its
label, and [ADR-0082](adr/0082-a-beer-is-added-over-the-search-that-missed-it-and-a-pending-button-stays-legible.md)
records the figures.

A tab's icon is held to 3:1 in every state it has: the unselected icon in the
muted ink on the bar, the selected icon in the action colour on the bar, the
selected icon on its soft pill, and the Add circle against the bar; the glyph
inside Add is the pairing already held for text on the action colour.

The mark is held part by part against what each part is seen on: the tile
against the page in light, and the bottle's edge, the beer and the foam against
the tile in both. The tile cannot stand off a dark page by 3:1, since even a
black page gives it under 2.6:1, so the mark stays off dark pages and the tile
against the page is held in light only
([ADR-0112](adr/0112-the-phone-follows-the-system-into-a-dark-mode-of-neutral-cards-with-the-style-colour-in-a-slab.md)). The darker runs in the beer, and the bottle's edge where it meets the
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
only belongs in that page's own task and design record, not here. Chosen from built
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

## The admin review page

Kalia's first tool rather than a page for readers: an admin works through the
suggestions waiting for review. Its structure (a queue beside the suggestion,
editing in place, a dialog guarding rejection) was chosen from built
alternatives in [iteration 10.5 task 11](tasks/iteration-10.5/11-design-the-admin-review-page.md)
([ADR-0105](adr/0105-the-admin-reviews-suggestions-in-a-queue-beside-the-suggestion-and-rejects-through-a-dialog-that-asks-for-the-reason.md)).
What holds on it, beyond the rules above:

- **A decided suggestion shows its outcome where it was**, until the admin moves
  on to the next. The outcome is page state, not only a toast: it says what
  happened to the beer and, when the brewery came with it, to the brewery.
- **A brewery left `PENDING` is never called rejected.** Rejecting one of
  several suggestions that need the same new brewery leaves it waiting, and the
  page says so.
- **A refusal is shown where the action was.** A decision lost to another admin
  says how it was decided and when; one on a suggestion no longer waiting says
  so; the edit's refusals stay in the form, on the field they name or in the
  box above it.
- **Rejecting asks first, and the reason is chosen in the asking.** The red
  confirm stays disabled until a reason is picked, so a reason is never chosen
  before the admin has been asked and never skipped.
- **Editing shows what was suggested.** A changed field says what it was
  suggested as, and a choice between the brewery a suggestion came with and an
  existing one is named for what it is, never "as suggested".
- **An empty queue says nothing is waiting, and loading is the queue's own
  skeleton.** The admin route has no `loading.tsx`
  ([web README](../web/README.md)), so the skeleton is drawn below the guard.
- **Below the large breakpoint the list and the suggestion take turns**, and
  nothing is marked as chosen while only the list shows.

## Notifications

The first thing Kalia says to one person rather than to everyone: what became
of a beer the contributor suggested. Its structure (one signal in the sticky
bar, a panel over the page) was chosen from built alternatives in
[iteration 10.5 task 12](tasks/iteration-10.5/12-design-the-contributors-notifications.md)
([ADR-0106](adr/0106-a-contributors-unread-notifications-are-one-signal-in-the-sticky-bar-that-opens-a-panel-over-the-page.md)).
What holds on it, beyond the rules above:

- **The signal is in the bar on every page that renders the signed-in shell,**
  the admin area included, and nowhere else. Nothing is drawn when nothing is
  unread: an empty signal would be a control with nothing behind it.
- **The signal is one object.** On a phone the envelope and the count are drawn
  together as a single filled control, never an icon with a separate box
  beside it, so they cannot read as two things. From the large breakpoint up it
  is a word and a count.
- **The signal is announced, not only drawn.** A screen reader hears how many
  are unread; the count the eye sees is hidden from it so it is not read twice.
- **Opening the panel acknowledges nothing.** A notification is acknowledged by
  pressing its own control, it leaves the panel at once, and one that was
  already gone is simply gone, with no error. When the last one leaves, the
  panel says nothing is new and the signal leaves the bar once the panel closes.
- **The panel is a dialog.** Focus moves into it on opening and returns to the
  signal on closing, and Escape closes it. It carries the dialog's scrim and ink
  edge; it is not a toast and does not go away by itself, because a
  notification stays until it is read.
- **An outcome is told in its own mark, never in the error red.** An approval
  takes the success cell with a tick; a rejection takes a hollow ink square. A
  rejection is a decision on a suggestion, not a failure of anything the
  contributor did.
- **An approval links to the beer; a rejection links nowhere** and states its
  reason in the reader's language.
- **An edit is shown as a pair.** The name as suggested, struck through, then the
  name as decided, with the edit marked. An edit that left the name alone is
  marked as edited and points to the beer's page, which shows the rest.
- **Several unread are listed newest first, each with its time**, and the panel
  scrolls inside itself rather than growing past the window.

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
