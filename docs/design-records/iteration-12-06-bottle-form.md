# Design record: how bottles are entered and edited on the phone

- **Status:** accepted
- **Date:** 2026-11-28
- **Task:** [iteration 12 task 06](../tasks/iteration-12/06-design-the-bottle-form.md)
- **ADR:** [ADR-0116](../adr/0116-the-phone-draws-the-platforms-own-date-pickers-through-the-community-datetimepicker-at-the-version-the-expo-sdk-lists.md)

## Question

Adding bottles and editing one ask for the same things: the container, a brewed
day and a best-before day, and for an add, how many. On a phone the platform's
date pickers, the keyboard and the largest text compete for the same space, and
the two platforms differ most here. The API's rules were not open
([the task](../tasks/iteration-12/06-design-the-bottle-form.md)); what was open
was the quantity control, and how each of the two optional dates is entered and
cleared.

## Directions shown

One round, native, because pickers are felt rather than seen: one build with an
in-app switch between three directions, add and edit, English and Finnish, over a
made-up beer with a long Finnish name, on the iOS Simulator and the Android
emulator. The code was not committed. All three drew the container as three
tiles, each a picture and a word, with the beer's and brewery's names above them,
and put the submit button in a bar at the foot.

**A: a stepper and a row for each date.** **Chosen.** The quantity is − and + around
a large number. Each date is a full-width row naming the field and its day, or "Not
set". Pressing it opens the platform's calendar: on iOS in place under the row,
with Done and, while the day is empty, Cancel, or once set, Clear date; on Android
the system's calendar dialog, with a Clear button once set. A set row also has
Clear date under it.

**B: a typed number and a compact date.** The quantity is a number field labelled
with its range. Each date is a line with Add date; on iOS that records today in
the system's compact date control, on Android it opens the calendar, and Remove
clears it. It was the shortest form, at the cost that adding a date on iOS wrote
one before it was chosen, and that on Android the keyboard hid the range error
behind the button.

**C: common counts and date wheels.** The quantity is a row of buttons for 1, 2, 4,
6, 12 and 24 and Other, which opens a number field. Each date has a switch for
whether it is known; turning it on shows wheels on iOS and the spinner dialog on
Android. Years back were quicker to reach on wheels than on a calendar, but every
date cost a switch first, and an uncommon count cost two controls.

B and C lost to A, which the product owner liked best.

## Choice

**A quantity stepper and one row for each date that opens the platform's calendar
(direction A).** The product owner named it on 2026-11-28 and confirmed it as
final.

It covers the form's fields, their order, how a date is entered and cleared, the
messages and the two actions, as one component for add and edit.

It leaves alone how the beer is found. The product owner asked, while comparing,
for the Add action to let the user pick the beer from the catalog or enter a new
one, with its brewery; that is
[task 07](../tasks/iteration-12/07-design-the-add-action-and-finding-the-beer-to-add.md)'s
form, which puts the beer above these fields, and is built by tasks
[09](../tasks/iteration-12/09-a-user-finds-a-beer-to-add-from-the-add-action-or-the-cellar.md)
and [26](../tasks/iteration-12/26-a-user-suggests-a-beer-the-catalog-lacks-while-adding-bottles-of-it.md).
It does not cover sending the form, or where it opens from. The standing intent is
[`docs/design.md`](../design.md#mobile-bottle-form).

## Agreed departures

- **Errors follow the written style.** The native round drew the refusal as red
  words. [`docs/design.md`](../design.md#feedback-and-errors) says an error's words
  are never red, and the product owner chose to follow it: a red edge on the row,
  and a red square with a white cross before words in ordinary ink.
- **Android's accent is the primary colour, app-wide.** The native round showed the
  calendar dialog in the platform's teal. The product owner chose to tint it; a
  theme for the dialog alone drew it white with invisible days in dark, and they
  chose to set the accent for the whole app instead, knowing other system controls
  take it too.
- **The containers stack at large text sizes.** Side by side, the Finnish words
  broke mid-word at the largest size, so from the size at which other cards stack,
  the tiles go one under another.
- **The calendar takes the whole width at large text sizes.** Inside its frame the
  iOS calendar lost its Saturday column at the largest size.
- **The sheet scrolls to an opened calendar.** On iOS the calendar opened partly
  below the view; the product owner asked on the built form for it to open whole.

## Sign-off

The product owner tried all three directions on the iOS Simulator and the Android
emulator and named A on 2026-11-28, and on the same day
signed off the built form on the iOS Simulator, the Android emulator and their
iPhone in phone mode, on a release build.

They walked it with VoiceOver on the iPhone in Finnish and dark mode, approved the
walk and reported nothing from it. They did not walk the largest text size, an
English voice or light mode, and on this day narrowed what a hand walk covers to
the settings their phone is in
([ADR-0075](../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md), amended).

The agent looked at the largest size: on the Simulator in Finnish, calendar
included, and on the Android emulator in English, with the calendar closed. The
calendar's full width at large sizes was added after that sign-off and has been
seen on the Simulator only; the default size is unchanged by it.

The form is not mounted on any screen: it was signed off behind a temporary menu
that was not committed. [Task 08](../tasks/iteration-12/08-a-user-adds-bottles-of-a-beer-from-its-page.md)
and [task 11](../tasks/iteration-12/11-a-user-edits-a-bottle.md) mount it.

Not done: TalkBack, which nobody has walked.
