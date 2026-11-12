# ADR-0110: The phone's identity is colour fields set light in a rounded face, where the web's is hairlines and square corners

- **Status:** accepted
- **Date:** 2026-11-11

## Context

The app had no identity of its own: a white page, near-black text and sizes
written into each screen. [ADR-0064](0064-visual-identity-can-art-square.md)
chose Kalia's look for a browser, with rem-based type, hover and focus rings,
hairline ink edges and square corners, and the refinement of this task asked for
an identity that is recognisably Kalia without being the web in a smaller window.

The refinement fixed what carries over: the mark and the web's twelve style-group
colours in every direction. The typefaces, the rest of the palette, the density
and the shape were free to differ. The app's icon, splash and name were
not redrawn. This was the first mobile identity chosen under
[ADR-0108](0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md):
framed mockups on the same three screens, shown in English and Finnish and at
the largest Dynamic Type size, with each pairing's contrast computed.

## Decision

**The phone's identity is colour fields set light: each beer is a flat field of
its style group's colour, on a white page, in one rounded face, with one round
corner for every card and control.**

- **A beer's card is its slot.** The style group's colour fills it, the text
  takes the colour paired with that group, and the strength is the largest
  thing on it. A style that belongs to no group, or a group this build does not
  list, takes the neutral grey and stays readable.
- **The page is light.** A white ground, and a white tab bar under an ink
  hairline with the selected tab in cobalt. Cobalt is also the one action's
  fill; a person is initials in an ink-edged slot, never a colour.
- **One round corner,** a mobile-only token. The web's two radii stay square and
  no longer reach the phone.
- **One bundled face,** Bricolage Grotesque, in three weights: the heaviest for
  everything that names or acts, one step lighter for supporting lines, ordinary
  for text that is only read. It replaces the system face, and the type scale and
  weights the phone uses are mobile-only tokens; the web's title, heading and
  display tokens no longer reach the phone. The face is loaded behind the splash
  screen, and a face that fails to load leaves the system face rather than a
  blank app, so an "update required" screen still opens.
- **The values are in the token source and the intent in `docs/design.md`,**
  which holds the mobile identity as a section of its own.
- **Not part of this decision:** the mark inside the app (the owner declined the
  SVG library it needs), the search and filter row (task 09), tab icons
  (task 22), dark mode (task 04) and motion (task 05).

## Alternatives considered

Every direction shared its three screens and its data, so only the identity
varied. Three rounds ran, seven directions in all.

**A: the web's Can art, carried over.** Archivo, white page, 1 pt ink edges,
square corners, ruled rows of about 64 pt with a 6 pt strip of style colour,
tracked capitals and one cobalt action. The most recognisably the web's and the
densest. Not carried forward once the owner preferred C.

**B: native first.** The system face, a tinted ground, white grouped lists with
inset dividers, a 34 pt large title, 14 pt corners and a 10 pt style dot before
the style name. No dependency and the platform's own manners, but the style
colour was small and little but the mark told it from another app. Not carried
forward once the owner preferred C.

**C: colour fields.** Each beer a card filled with its style colour, a heavy
face, a 34 pt strength numeral, round corners, an ink tab bar and spacious cards
of about 96 pt. The owner preferred it to A and B and asked for variations, one
lighter, one square, each in a different face. Its own dark tab bar was the
part the owner did not carry forward.

**C2: C set light, in Archivo.** A white ground and a white tab bar, an outlined
filter chip, lighter weights and cards of about 84 pt, with 18 pt round
corners. Shown in the same round as C3. Not chosen; C4 is C2 in another face.

**C3: C square, in Big Shoulders.** Square corners everywhere, a condensed face
in capitals, the ink tab bar kept. The loudest. Its costs were two more
font packages and all-capital Finnish compounds, which are longer than their
lowercase. The owner did not choose it.

**C4: C2 in Bricolage Grotesque, round corners.** The direction chosen.

**C5: C2 in Bricolage Grotesque, square corners.** The same as C4 with every
corner square, which matches the web identity's shape, not its face. Not chosen.

## Consequences

- Good, because the style colour, which is the one thing the web's identity
  lets a user learn once, is the biggest thing on the catalog list, and the
  web's colours and mark carry over unchanged.
- Good, because the web's generated stylesheet is byte-for-byte the same, so
  the web is untouched by the phone's choices.
- Bad, because a card is about 84 pt where direction A's row was about 64 pt, so
  fewer beers fit one screen at the default text size and far fewer at the
  largest.
- Bad, because a bundled face is a new dependency and each weight is a file in
  the app; a fourth weight, or a second face, is another file each.
- Bad, because the phone's round corner and the web's square one are now two
  statements of the identity, and a later change that touches shape has to say
  which platform it is for.
- Neutral, because the in-app mark is deferred rather than designed out: the
  screens in the framed mockup showed it, and the built ones do not.
- **Revisit trigger:** dark mode ([task 04](../tasks/iteration-11/04-decision-and-design-dark-mode.md))
  re-checks every colour against a dark ground; the white tab bar and the light
  cards are the part most likely to move.

## Evidence

Bricolage Grotesque is licensed under the SIL Open Font License 1.1, and its
package is MIT and OFL-1.1. The app bundles three static cuts, 400, 500 and
700, through `expo-font` at the Expo SDK's pinned version.

The framed rounds ran on 2026-11-10 and 2026-11-11. The owner named C4 in the
third. The built app was checked on the iOS Simulator (iPhone 18 Pro) at the
default text size and at accessibility size 5, and once on the Android emulator
at the default size and at a 2x font scale. At the largest size the Simulator
showed a title breaking mid-word, beer names breaking mid-word, clipped tab
labels and a cut-off Add glyph; the caps and the stacked card in Decision are
the fixes. The owner approved the Simulator and reported that it looks good on
their iPhone, where the catalog did not load because the build was made
without phone mode. The catalog and the signed-out screens were therefore not
seen on the iPhone, VoiceOver was not walked, and sign-in was not exercised
anywhere because Keycloak would not start on the machine. Those are recorded
here as not done.

Deliberate differences from the framed C4 mockup: the catalog has no search or
filter row, the screens show no mark, the tab bar shows words only, the main
button is 56 pt tall with 17 pt text, and a second action is an ink-edged
outline.
