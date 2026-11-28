# Accessibility hand walk

What no test can judge: how VoiceOver and TalkBack speak a screen, where focus
lands, and what the largest text size does to it. The rules are in
[CONVENTIONS.md](CONVENTIONS.md) and
[ADR-0075](../docs/adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md); the tests
that hold the rest are named beside each rule there. This file is not loaded
with the README: read it when a walk is owed.

**Record each walk in the pull request in words** (what was spoken, quoted; what
was wrong): never a screenshot ([rule](../.claude/rules/no-screenshots.md)). A
finding is fixed in the pull request or filed in the
[quality backlog](../docs/tasks/quality-backlog.md) with its ID.

## What to walk, and when

Walk a screen when it is new or its controls, order, labels or sheets change.

**Walk it in the settings the product owner's phone is in** (Finnish and dark
mode on 2026-11-28) and ask for no other: no switching language, appearance, text
size or reduced motion
([ADR-0075](../docs/adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md), amended).
Record which settings it was. Every walk has the same three passes:

1. **Spoken order and names.** Swipe through the screen once. Each control says
   its name, then its role or state, then its place in a set where it has one.
   Nothing is read twice, nothing decorative is read (a tab's drawing, a
   chevron), no word is in the wrong language.
2. **Focus.** Open a sheet or a page inside one: focus lands on its heading, not
   on a row or the page behind. Close or go back: it lands on the heading of
   the page returned to, or on the control that opened it.
3. **State and messages.** Change something (pick an option, run a search that
   finds nothing, fail a request): the new state is spoken, an error or an empty
   result without the user moving to it.

**The largest text size is not a pass of the walk.** The tests hold it
([CONVENTIONS.md](CONVENTIONS.md)), and the agent who changes a screen looks at it
at the largest size on a Simulator or emulator, with a long Finnish name:
everything reachable and readable, nothing cut by a fixed height.

## iPhone and VoiceOver

The Simulator has no VoiceOver, only Accessibility Inspector, so this walk is on
the phone, in [phone mode](README.md#reach-the-stack-from-the-iphone) with the
release build ([A release build on the iPhone](README.md#a-release-build-on-the-iphone)).

1. **Set up once.** Settings > Accessibility > VoiceOver > on. Settings >
   Accessibility > Accessibility Shortcut > VoiceOver, so a triple-click of the
   side button turns it on and off.
2. **Gestures.** Swipe right or left: next or previous item. Double-tap: press.
   Three fingers swipe: scroll. Two fingers tap: pause speech. Rotor (twist two
   fingers): Headings to jump between titles. Touch an item to hear it without
   moving on.
3. **The voice.** The app follows the phone's language, and VoiceOver's voice
   follows it too. In a Finnish voice, React Native's own English words show: any
   English word spoken is a finding.

## Android and TalkBack

The reference emulator (Maestro's and CI's) has no Google Play, so TalkBack is
walked on a **second emulator with a Google Play system image**, used for
nothing else.

1. **Create it once.** Android Studio > Device Manager > Create Device > a Pixel
   with a system image marked *Google Play*. Start it, sign in to Google Play with
   your own account in its Settings or Play Store, and install **Android
   Accessibility Suite** (it holds TalkBack; the plain image may carry it already).
2. **Turn TalkBack on.** Settings > Accessibility > TalkBack > on. In TalkBack
   settings > Developer settings, turn **Display speech output** on: every spoken
   phrase is printed on screen, which the record quotes.
3. **Reach the stack.** Only one session drives an Android emulator at a time.
   `make mobile-android` installs the development build and forwards the ports
   (`adb reverse` is per device: run it for this one).
4. **Drive it with mouse and keyboard.** The mouse touches; TalkBack takes the
   keyboard with its own modifier (Alt or Search, shown in TalkBack settings >
   Keyboard shortcuts, which also lists every shortcut): modifier+Right and
   Left move between items, modifier+Enter presses. A tap in TalkBack only
   selects: a double tap presses.
## The catalog's walk

Run the three passes over each. Expected speech is the English wording; in
Finnish the same, from `@kalia/locales`.

- **Tab bar.** Left to right: Feed, Catalog, **Add a beer**, Cellar, Profile, each
  a button; the selected tab is said as selected; the pictures are silent.
  Add is a plain button and opens the Add sheet.
- **Catalog list.** The title is a heading. The search field says "Search beers",
  the Filters button its count ("Filters, 2 in force"), each active filter a
  button "Remove filter: IPA", each beer a button with its name, brewery and
  strength, and "waiting for review" for a pending one. Scrolling to the end
  loads more and says nothing wrong; a failed page has a Try again button.
- **Search.** Type a name that matches nothing: the empty result is announced
  without touching the screen. Clear search says what it does.
- **Filter sheet.** Opening: focus on the heading "Filters". Style, Brewery and
  Country are buttons that say their current value ("Style: Any style"). Strength
  has two labelled fields, an error is announced. Sort is a labelled group of five
  options, each saying its name, whether it is selected, and its place ("2 of 5";
  in Finnish "vaihtoehto 2, yhteensä 5"; on Android TalkBack says "radio button"
  and its own position). The apply button says how many beers it will show.
- **A picker.** Opening a picker: focus on its heading ("Style"), not on a row.
  Rows say the option, selected or not, and their place in the set; **no English
  "checked" in a Finnish voice**. Picking a row returns to the form with focus on
  "Filters". The back control says "Back to filters" and does the same.
- **A beer's page.** Heading, the beer's name and strength, a "waiting for review"
  note if pending, then the style, brewery and country links, each saying what it
  does ("IPA, show beers of this style"), then the similar beers as buttons. A
  beer not found says so and offers a way back. Close returns to the Catalog.

Other screens (Profile, the Add and sign-in sheets, the update, maintenance and
crash screens) are held by the structure test and the largest-text test, and
walked only when changed.
