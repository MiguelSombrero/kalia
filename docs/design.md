# Kalia — Design intent

What Kalia is meant to look and feel like, and what a change to how it looks
is judged against. The values that produce the look live in
[`frontend/app/globals.css`](../frontend/app/globals.css), the structure that
carries them in [architecture.md §5](architecture.md#5-frontend-design), and
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
[architecture.md §5](architecture.md#5-frontend-design) point here.

## How this file is kept current

- **Every semantic token has exactly one meaning row** under
  [Semantic tokens](#semantic-tokens) below, and every row names a token that
  exists. A semantic token is anything declared in an `@theme` block of
  `frontend/app/globals.css`, inline or not — the layer components consume
  through Tailwind utilities. `scripts/check-design-tokens.mjs` fails the build in
  both directions; it runs in CI (the `design-token-check` job) and under
  `make check`, with a fixture self-test
  (`scripts/check-design-tokens.test.mjs`) because nothing in the real tree
  would otherwise trip it. Add the row in the same pull request as the token.
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

- **Values** — `frontend/app/globals.css` for colour and every other token,
  `frontend/app/[locale]/layout.tsx` for which typefaces load.
- **The token system's shape** — two layers, components reading only the
  semantic one, primitives in `components/ui/`:
  [architecture.md §5](architecture.md#5-frontend-design), decided in
  [ADR-0021](adr/0021-design-tokens-ui-primitives.md).
- **Rules for writing a component** — which layer a class may reference, how
  primitives compose: [frontend/README.md](../frontend/README.md) conventions.
  This file says which token to reach for; the README says how to reach.
- **Component documentation.** Whether `components/ui/` becomes a design
  system, and where that would be documented, is
  [iteration 7.5 task 12](tasks/iteration-7.5/12-do-we-need-a-design-system.md)'s
  question; if it says yes, its ADR decides which of the two documents
  contains the other.
- **UX copy and tone of voice** — out of scope for the redesign
  ([iteration 7.5](tasks/iteration-7.5.md)), and a translation-policy question
  under [ADR-0011](adr/0011-i18next-localization.md) when it is taken up.

---

## Feel

*Not yet written.* The statement of what Kalia should feel like, and the
reference points behind it, arrive with the visual identity the product owner
chooses in
[iteration 7.5 task 03](tasks/iteration-7.5/03-visual-identity.md).

## Semantic tokens

What each token means and when to reach for it. These rows describe the
identity iteration 2 chose
([ADR-0021](adr/0021-design-tokens-ui-primitives.md));
[task 03](tasks/iteration-7.5/03-visual-identity.md) rewrites them alongside
the token layer it replaces.

### Colour

| Token | Means | Reach for it when |
|---|---|---|
| `--color-background` | The page itself — the ground every surface sits on. | Only the document body uses it; a component that wants to sit "on the page" leaves its background unset rather than repeating this. |
| `--color-surface` | A raised plane that holds one thing: a card, a dialog, a toast, a form field. | Content or an input needs to read as a separate object from the page around it. |
| `--color-foreground` | Primary text, and anything that must read at full strength. | Body copy, headings, values. Also the dialog scrim, at reduced opacity. |
| `--color-muted-foreground` | Secondary text: supporting, never essential to the task. | Labels, metadata, helper text, empty-state explanations — text a reader may skip. |
| `--color-border` | A quiet edge between planes or groups, and the fill of something not there yet. | Separating a surface from the page or one list item from the next, and, faded, the blocks of a loading skeleton. Never to draw attention. |
| `--color-primary` | Kalia's one action colour. | The fill of the single main action in a view, and the hover cue — an edge or a faint tint — on anything else that can be activated. Used sparingly, so it keeps meaning "act here". |
| `--color-primary-foreground` | Text and icons placed on `--color-primary`. | Whenever something sits on a primary fill; never on its own. |
| `--color-accent` | A soft, low-emphasis tint for marking a category or attribute. | Badges and tags — style, strength — that label rather than act. |
| `--color-accent-foreground` | Text placed on `--color-accent`. | Whenever something sits on an accent fill; never on its own. |
| `--color-focus-ring` | Where keyboard focus is. | Only `:focus-visible` outlines. It carries no other meaning, so it is never reused for decoration. |

### Type

| Token | Means | Reach for it when |
|---|---|---|
| `--font-display` | The voice of the page: a face with character, used large and briefly. | Page titles and dialog titles. Never for body text or controls. |
| `--font-sans` | The working face: everything that is read or operated. | Everything not set in the display face — the body's default, so it rarely needs naming. |

## Typography across the two locales

*Not yet written.* What English and Finnish each demand of the type scale —
Finnish compounds in a heading, the longer of the two strings in a button —
arrives with the type scale in
[task 03](tasks/iteration-7.5/03-visual-identity.md), judged against both
locales ([ADR-0011](adr/0011-i18next-localization.md)).

## Layout principles

*Not yet written.* The principles that hold on every page rather than on one —
container width, rhythm, how a page reads at a phone width and a desktop
width — arrive with the page shell in
[task 06](tasks/iteration-7.5/06-page-shell.md). A rule that holds for one
page only belongs in that page's own task and ADR, not here.

## Imagery and the mark

*Not yet written.* What imagery is for, what the placeholder that reserves a
beer's or a person's image slot stands in for, and what the Kalia mark is
meant to say arrive with
[task 04](tasks/iteration-7.5/04-imagery-iconography-and-the-mark.md).
