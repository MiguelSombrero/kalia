# Design record: the phone's tab icons are Shine, a bottle and a barrel, filled on a soft pill when selected

- **Status:** accepted
- **Date:** 2026-11-13
- **Task:** [iteration 11 task 22](../tasks/iteration-11/22-design-mobile-tab-icons.md)
- **Departs from:** [ADR-0065](../adr/0065-imagery-icons-and-mark-specimen.md) — the phone's tabs show a picture beside their word; the web's navigation stays words

## Question

[ADR-0109](../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)
fixed the phone's destinations (Feed, Catalog, a central Add action, Cellar and
Profile) and left the pictures as placeholders. The task asked for a coherent
set, each with a selected and an unselected state, shown in the real mobile
navigation in light and dark, in both locales and at the largest text size. The
product owner had decided at refinement that every tab shows its picture with
its word, always, and that the pictures take the bar's tint.

## Directions shown

Three framed rounds ran on 2026-11-13, then a native phase. Every frame showed
the real tab bar on real screens with seed beers, light and dark side by side,
English and Finnish, default and largest text, the selected and unselected
states, and the contrast and label fit computed from the token values.

**Round one, three directions.**

- **A, Drawn.** The web's own line style (a 2 px line with butt ends and square
  corners, from ADR-0065's seven icons) extended to ruled rows for Feed, a grid
  of four squares for Catalog, a barrel for Cellar and a person for Profile.
  There was one drawing per destination: the selected tab changed only tint,
  the bold word and the cobalt underline the bar had. The cost was that
  selection rested on tint and an underline alone, and square drawing sat beside
  a round card. The owner preferred C.
- **B, Platform symbols.** Each platform's own symbols (an approximation in the
  frame; the real glyphs render natively), with an iOS and an Android switch.
  The selected tab swapped to the filled symbol; on iOS that was all, on
  Android it also sat on a pill of the soft cobalt tint. It needed no drawing,
  but the shapes were generic and differed between platforms. The owner
  preferred C.
- **C, Beer-led pictograms.** Rounded drawings from Kalia's world: three
  bubbles for Feed, a pint for Catalog, a bottle for Cellar and a person for
  Profile, with round ends and joins. The selected tab filled the picture and
  sat on a 56 × 32 pill of the soft cobalt tint with the bold word and no
  underline. The direction the owner liked best, with comments: keep Profile,
  make the bubbles more obviously bubbles, and give Catalog and Cellar reasons
  to differ (a pint is a beer drunk fresh, a bottle one put away).

**Round two, C with variants.** One page let any variant be placed in the real
tab bar. Profile stayed as in C.

- **Feed:** *Shine* (a large bubble with the glint that makes a circle read as
  a bubble, a medium and a small one), *Fizz stream* (six bubbles growing as
  they rise) and *Foam cluster* (five bubbles packed like a foam head).
- **Catalog:** *Card drawer* (the library card catalogue), *Open book* (a
  reference), *Hop cone* (the ingredient nearly every beer shares), *Crown cap*
  (a cap from every beer) and *Beer card* (the list's own card with its style
  edge). The owner had dropped the pint.
- **Cellar:** *Bottle on a shelf* and *Crate of bottles*.

The owner chose Shine for Feed, locking Feed and Profile. None of the Catalog
or Cellar variants was taken; the owner gave no reason beyond choosing the
round-three arrangement below.

**Round three.** Shine for Feed, C's bottle moved from Cellar to Catalog, and
the barrel from round one's A redrawn in C's rounded stroke for Cellar, with
the owner's own reasoning that the barrel is where beer is kept. The owner
took this set to native.

**Native phase.** The set was built in a scratch worktree with `react-native-svg`
and shown live on the iOS Simulator (iPhone 18 Pro) and once on the Android
emulator, in light and dark, English and Finnish, at the default and the
largest text size.

## Choice

**The phone's tabs are Shine bubbles (Feed), a bottle (Catalog), a barrel
(Cellar) and a person (Profile), each drawn with round ends, outlined when
unselected and filled on a pill of the soft cobalt tint when selected, with the
Add action a plus on its cobalt circle and no word.** Every tab shows its
picture above its word in both languages; the picture takes the bar's tint, has
no colour of its own and is hidden from assistive technology beside its word;
Add is named "Add a beer" or "Lisää olut". The bar is 64 pt of content and
fixed, the picture is 24 pt, and the word stays at most 1.2× its default size.

This covers the four destinations and Add only. It leaves the web's navigation
as words, the app icon and splash, and how the selected state moves, which are
other tasks'. Standing intent is under
[Tab icons](../design.md#tab-icons) in `docs/design.md`. The drawings
are `mobile/src/features/navigation/tabIcons.ts`, rendered through
`react-native-svg`, the one new dependency (version pinned by the installed Expo
SDK, confirmed with the owner).

The cost the owner accepted: a barrel is a cask for storing beer at a brewery
or pub, so it says "cellar" by place more than by what a person keeps; at small
sizes its hoops can read as a drum, so the word beside it carries part of the
meaning; and a bottle in Catalog reads as "beer", which is also what the cards
and Add are about.

## Sign-off

The owner reviewed the icons live on the iOS Simulator and said they looked
good. Android was checked once on the emulator, where the bar renders the same
in light and dark. The owner was asked to sign off on their iPhone in phone
mode, the route ADR-0108 names, but the iPhone would not connect to the Mac for
the build (paired, not connected, and no device on USB) and the owner chose to
skip that check. **No sign-off on an iPhone was given, and the owner's VoiceOver
walk was not done**; the component tests check every tab and Add by accessible
name in both languages, that each picture is hidden from assistive technology
beside its word, and the bar at the largest font scale. Contrast is held in
`scripts/check-contrast.mjs`: the icon states are at least 5.08:1 against 3:1.
