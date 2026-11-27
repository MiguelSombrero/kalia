# Design record: what opens from a cellar row, and how a beer's bottles are shown

- **Status:** accepted
- **Date:** 2026-11-23
- **Task:** [iteration 12 task 03](../tasks/iteration-12/03-design-a-cellar-entry-and-its-bottles.md)

## Question

The cellar list says which beers are held; this is where the bottles are read, and
where the actions on one begin. A beer holds bottles that each carry their own
brewed and best-before dates and their own container
([ADR-0034](../adr/0034-cellar-two-level-bottle-model.md)), and the web shows each
as a tile headed by its vintage. How a phone shows a dozen of them, one of which
has expired, was the product owner's choice from built alternatives. Refinement
fixed the rest: the beer's facts at the head, each bottle's container, vintage and
best-before, a way to the beer's catalog page, room for the edit, remove and add
actions, and a withdrawn beer that keeps its bottles but has no catalog link.

What was open: the entry's presentation (a sheet over the Cellar tab, as a beer's
page is over the Catalog, or a pushed screen), a bottle's row (alike bottles as one
row with a count, or a row each), the bottles' order (vintage as on the web, or
best-before), what a bottle with no recorded date says instead of a blank, and how
a bottle past its best-before date is marked without colour alone and without
reading as spoiled. The identity was not open: the head is
[ADR-0110](../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)'s
colour field, in dark [ADR-0112](../adr/0112-the-phone-follows-the-system-into-a-dark-mode-of-neutral-cards-with-the-style-colour-in-a-slab.md)'s
neutral card with a slab.

## Directions shown

Framed, because the question was appearance: interactive phone frames on the real
identity, in light and dark, English and Finnish, at the largest text size (iOS
310 %, Android 200 %) with iOS and Android chrome, over four sample beers: one of
24 bottles with a long Finnish beer and brewery name, bottles past their
best-before date, a bottle whose best-before date is today, bottles with one date
or none, and cans and a keg among bottles; one of five; a withdrawn one; and one
whose bottles have no dates. A switch changed the bottles' order for every
direction so order could be judged apart from layout. The code is not committed.
Round one showed A, B and C; round two showed D and E.

**A: a sheet, a card for each bottle.** *Framed round 1.* The entry opens as a sheet
over the Cellar tab with a visible Close, like a beer's page over the Catalog. Under
the beer's colour field, Add a bottle (cobalt) and See in the catalog (outlined) sit
together, then a heading with the bottle count and how many are past best-before.
Every bottle is a card: its container and number at the start of the head, its
vintage large at the end, then Brewed and Best before as two stacked labelled
lines and Edit and Remove along the foot. Bottles run in vintage order, oldest
first. A missing vintage reads "Vintage unknown" and a missing date "Not
recorded". A bottle past its best-before date carries a bordered tag with a clock
beside its date. Taken forward as the base of D.

**B: a sheet, alike bottles as one row.** *Framed round 1.* The same sheet, with Add
a bottle pinned in a bar at the foot. Bottles of one container, brewed date and
best-before date are one row with a large "×6", Edit and Remove one in the row. Rows
run in best-before order, soonest first, undated last. A bottle with neither date
gets a dashed row saying "No dates recorded"; only recorded facts show on others. A
bottle past its best-before date says "Past best before · date" with an hourglass
and a heavy rule on its leading edge. It put what to drink next at the top and
shortened a cellar of cases, at the cost that "edit" on a group of bottles was
ambiguous and that a bottle was no longer a thing of its own. Not chosen; its
foot bar went into D.

**C: a pushed screen, sections by state.** *Framed round 1.* The entry is pushed
inside the Cellar tab with a Back button and the tab bar kept, on the reason that it
is a place to work in (many bottles, edits, removals) and not a peek. Under the head,
Add a bottle and See in the catalog sit side by side. Bottles sit under three
headings: past best-before, within it, and no best-before date, each with its bottle
count, in best-before order inside each. A row is compact: container, number and
vintage, one date line, and a 48 pt button at its end for edit and remove. Taken
forward as the base of E.

**D: A with Add at the foot and dates side by side.** *Framed round 2, after the
owner liked A and C and asked for changes.* A with Add a bottle moved into a bar at
the foot, in thumb reach (scrolling with the list at the largest text size), and
Brewed and Best before set in two columns so a card is shorter. Not chosen.

**E: C as one list in vintage order.** *Framed round 2.* **Chosen.** C with the
three sections and the past-best-before heading removed, the rows in vintage order,
Best before and then Brewed under the vintage, and the container drawn instead of
spelt "Bottle 1": a bottle, a can or a keg. With the heading gone, a bordered clock
tag after the date carried the past-best-before mark, which the task requires to be
more than colour.

## Choice

**The entry is a screen pushed inside the Cellar tab, a colour-field head over one
list of bottles in vintage order, a row each, each row a picture of its container
and its vintage, best-before and brewed dates (direction E).** The product owner
named E in the second round.

It covers:

- **Pushed, not a sheet,** and the exception to
  [ADR-0109](../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)'s
  sheets is the reason E carries: the entry is a place that stays open while a
  bottle is edited, removed and added, so it keeps the tab bar and the swipe back,
  and its Back button is the visible way out. The Cellar tab becomes its own stack.
- **The head** is the beer's colour field with its name, brewery, style and strength
  large. Under it Add a bottle is the one cobalt block and See in the catalog is the
  same block outlined, side by side and stacking at the largest text size. A
  withdrawn beer's head carries the bordered withdrawn label and the sentence that
  its bottles stay, shows no See in the catalog and no Add a bottle.
- **A row is one bottle** in a list, in vintage order, oldest first, a bottle with
  no brewed date last. It carries a picture of its container, its vintage large (or
  "Vintage unknown"), its best-before date and its brewed date, each missing date
  said in words ("Best before: not recorded"). The picture is decorative; the row's
  spoken name carries the container.
- **A bottle past its best-before date** is strictly before today, as on the web,
  and carries a bordered tag with a clock beside its date. It is in ink and not
  red, and it does not say spoiled.
- **Room for the actions:** a row ends with its full width free for a 48 pt button,
  which [task 10](../tasks/iteration-12/10-design-acting-on-a-bottle-edit-and-remove.md)
  opens edit and remove from, and the head already carries Add. The button is not
  drawn until that task, so nothing inert is on the screen.
- **It reads what the list holds,** so it opens offline.

It does not cover reading the data
([task 05](../tasks/iteration-12/05-a-user-opens-a-beer-in-their-cellar-and-sees-its-bottles.md)),
or how a bottle is edited, removed or added. The standing intent is
[`docs/design.md`](../design.md#mobile-cellar-entry).

## Agreed departures

- **The two buttons carry no pictures.** The frame drew a plus on Add a bottle and an
  arrow-out on See in the catalog; the built buttons are the app's one text-only
  block and outlined block, which have no place for a picture.
- **The edit and remove button is not drawn.** The frame showed a 48 pt button at the
  end of each row. Building it would put an inert control on the screen, and what it
  opens is [task 10](../tasks/iteration-12/10-design-acting-on-a-bottle-edit-and-remove.md)'s
  to design; the owner confirmed on the phone that it is out of this task's scope and
  that the room is what this one leaves.
- **The way back scales with the system text.** At the largest text size the pinned
  Back button is large; the owner judged it on the phone and raised nothing.

## Sign-off

The product owner named E from the second framed round on 2026-11-23, after choosing
A and C in the first and asking for the changes that made D and E.

The built entry ran on the iOS Simulator (default and largest text size, English and
Finnish, over the sample cellar's 24-bottle beer with a long Finnish name) and on the
product owner's iPhone in phone mode. The agent did not run it on Android.

The owner walked it with VoiceOver on the iPhone and found it in order. They noticed
no button for editing and removing a bottle at the end of a row, asked whether it was
in this task's scope, and signed the entry off once it was agreed that it is not.

Not done: TalkBack, which nobody has walked, and the entry on Android.
