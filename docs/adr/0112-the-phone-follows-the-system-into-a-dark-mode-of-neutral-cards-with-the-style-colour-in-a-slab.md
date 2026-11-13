# ADR-0112: The phone follows the system into a dark mode of neutral cards with the style colour in a slab, and keeps the mark off dark pages

- **Status:** accepted
- **Date:** 2026-11-13

## Context

[ADR-0110](0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)
chose the phone's identity on a white page: each beer a flat field of its style
group's colour. The app was pinned to light, so a phone set to dark showed a
white app, and a beer cellar is a dark place. ADR-0110 named dark mode as its
revisit trigger and said the white tab bar and the light cards were the part
most likely to move.

A second palette doubles what every colour must be checked against, and the
twelve style colours were chosen against a light surface. The token source
([ADR-0107](0107-one-typescript-token-source-generates-the-webs-css-the-apps-theme-and-keycloaks-stylesheet-by-a-generator-of-our-own.md))
already models a light and a dark mode, but held the same values in both. The
refinement of this task decided three things before any direction was built:
the app follows the system's setting with no switch of its own, the splash
follows the system, and every pairing of the dark palette is held to the
contrast of [ADR-0075](0075-the-accessibility-bar-is-wcag-2-2-aa.md). It left
open whether the style colours are re-derived on dark, and the palette itself.
This was the second mobile identity decision under
[ADR-0108](0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md),
and the first to run its native phase.

## Decision

**The phone follows the system's light or dark setting, and in dark a beer is a
neutral raised card with its style colour carried by a slab down the card's
leading edge.**

- **No switch of its own.** The system decides, live. The status bar and the
  grounds behind a sheet follow the scheme, and the first frame reads the
  system's scheme before it draws.
- **A graphite page.** The ground is near-black graphite, and a card, the
  person's panel and the tab bar are each a step lighter. The ink is a soft
  white and the action is a lightened cobalt with ink on it. The tab bar keeps
  its line above it, quieter than light's ink hairline.
- **The slab carries the style.** The twelve style colours and the neutral grey
  are exactly the light ones, so a style looks the same in either mode. A slab
  is as tall as its card and 22 pt wide. The text on the card is ordinary text on
  the card, so its contrast never depends on the style. A slab that cannot stand
  off its card by 3:1 is outlined, which today is the stout, porter, brown lager
  and copper groups.
- **Nothing else in the identity changes.** The corner, the face, the sizes, the
  weights and the secondary action are the same in both modes. The secondary
  action stays an outlined block on the page's colour.
- **The splash keeps its teal in both modes, and the mark stays off dark
  pages.** The pairing of the mark's tile against the page is held in light only.
  The teal tile cannot stand off any dark page by 3:1, since even a black page
  gives it under 2.6:1, so the pairing has a `Modes` column in
  `docs/design.md` and `scripts/check-contrast.mjs` reads it. Every other pairing
  and every style pair is held in both modes.
- **Dark values are in the token source, and only mobile sees them.** A dark
  alias may name a primitive that is mobile-only, because only the phone emits a
  dark value, so the web's and Keycloak's stylesheets are unchanged.
- **Not part of this decision:** a switch of the user's own, a dark web, and the
  mark's place inside the app.

## Alternatives considered

Every direction was shown in framed mockups on the same screens, in English and
Finnish and at the largest Dynamic Type size, with each pairing's contrast
computed. Two rounds ran, five directions in all, and the chosen one was then
built and judged natively.

**A: lit fields.** The twelve style colours unchanged as flat fields on an
ink-black page, a paper hairline on every card so the near-black stout and
porter stay objects, and a lightened cobalt. The smallest change to the token
source. A list of pale fields glows against a black page in a dark room, and
stout and porter are almost the page's own colour. Not chosen.

**B: deep fields.** Every style colour re-derived to a deep field with paper
text, on a warm roast-black page that layers by tone and has no hairlines. One
text colour on every card. Yellows are the hardest hue to darken: straw, lemon
and gold became olive and ochre, straw sat close to the browns and orange close
to brown. It also meant twelve new fields to maintain and a style learned once
per mode. Not chosen.

**C: slab.** A neutral raised graphite card with paper text, the style colour
unchanged in a slab on the card's leading edge. A departure from ADR-0110's
"a beer is a flat field", least glare, much less colour on a screen. The
direction chosen, on the owner's reasons that the style colours match light and
that it is easy on the eyes, because colour is only at the edge.

**C2: greyer ground.** C on a mid graphite page, with the card and the tab bar a
step lighter, so no button is black on black. The page is about 2.7 times as
bright as C's. Built after the owner called the black secondary button hard on
the eyes. Not chosen.

**C3: softer secondary.** C's page with the secondary action as a raised grey
block with a thin edge. It needs a new token role, since the secondary fill
would no longer be the page's colour. Not chosen; the owner kept C as drawn.

**The mark.** Three ways to satisfy the tile-against-page pairing were laid out:
lift the tile on dark, which takes the coral bottle below 3:1 against it; keep
the tile with a paper edge on dark and exempt the pairing in dark; or keep the
mark off dark pages and hold the pairing in light only. The owner chose the
last, and that the splash keeps its teal rather than taking the page's colour.

## Consequences

- Good, because a style's colour is the same in either mode, and it is the one
  thing the identity lets a user learn once.
- Good, because a dark list is calm: no large bright field appears, and the
  contrast of every card's text is the same whatever the style.
- Good, because the web's generated stylesheet and Keycloak's are byte-for-byte
  unchanged, since dark-only primitives are mobile-scoped.
- Bad, because a beer is now two shapes, a coloured field in light and a card
  with a slab in dark. Light and dark differ in structure and not only in value,
  so a later change to a card has to say which mode it is for.
- Bad, because much less colour shows on a dark screen, and the shelf-of-cans
  effect of ADR-0110 weakens there.
- Bad, because a dark list's style colour has to be read from a 22 pt edge, and
  four groups need an outline to be seen at all.
- Bad, because the secondary action is a near-black outlined block on a
  near-black page, which the owner called the weak point of the direction. It is
  the same in both modes, so changing it is a decision for both.
- Bad, because a dark variant's text colour is held to contrast but the card does
  not use it, so the token source holds a pair that only a future use would read.
- Neutral, because the mark has no dark appearance on a page: it is on the splash
  and the icon, both teal, and the dark pairing the check dropped has no use today.
- **Revisit trigger:** a screen that puts the mark on a dark page, which needs
  the tile and its edge decided; or the secondary action proving hard on the eye
  on the owner's phone in use.

## Evidence

The framed rounds ran on 2026-11-12 and 2026-11-13. The owner named C in the
second, after asking for variants of it. The prototype was built from the
disposable worktree and judged on the iOS Simulator (iPhone 18 Pro) in dark at
the default text size and at the largest accessibility size, where the card
stacks, no word breaks mid-word and the slab runs the full height. It was
checked once on the Android emulator, where it renders the same. The owner
signed it off on their iPhone in phone mode, in dark, after the first attempt
connected to another worktree's Metro server and showed the old light app.

Contrast, from `scripts/check-contrast.mjs`: in dark the foreground is 13.96:1
on a card and 16.56:1 on the page, the muted text 7.16:1 on a card, the action's
ink 7.29:1 on its fill and the edge 5.17:1 on a card. Every pairing and every
style pair passes in dark except the mark's tile against the page, 2.37:1
against 3:1, which is held in light only. The tests cover a pairing below AA
failing in dark, a pairing marked light being skipped in dark, and a dark alias
of a mobile-only primitive not reaching the web.

The final code, built apart from the prototype, was run on the iOS Simulator in
both modes. Light matched ADR-0110 and dark matched the owner's sign-off, after
a refactor that dropped the slab's rounded corners was caught and fixed, and a
test now holds them. A light frame before the first dark one was not seen in
the Simulator, and was not specifically looked for on the iPhone.

Not done: VoiceOver was not walked on the dark build, and sign-in was not
exercised in dark on the iPhone beyond opening the sheet. The "update required"
and "maintenance" screens are checked by component tests in both modes and
both locales, and were not forced on a native build.
