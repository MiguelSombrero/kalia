# Design record: the Cellar tab's list

- **Status:** accepted
- **Date:** 2026-11-23
- **Task:** [iteration 12 task 02](../tasks/iteration-12/02-design-the-cellar-list.md)

## Question

The signed-in Cellar tab was a placeholder, and the cellar is the product. The
web answers with a sortable list beside each beer's style band and a summary
above it ([ADR-0070](../adr/0070-cellar-sortable-beers-beside-their-band-with-bottle-tiles-headed-by-vintage.md)),
which is a page's answer. What a phone shows first, in one hand and standing at
a shelf, was the product owner's choice from built alternatives. Refinement
fixed the rest: the web's five orders with name first, a find field that narrows
the loaded list by beer or brewery name, and a cellar that holds at most 2,000
bottles.

What was open: where the order control and the find field sit, what a row says
beyond the bottle count, a flat list or beers grouped by style, and where the
totals sit and whether they stay in view. The row, the identity and the tabs were
not open: a row is [ADR-0110](../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)'s
colour field, in dark [ADR-0112](../adr/0112-the-phone-follows-the-system-into-a-dark-mode-of-neutral-cards-with-the-style-colour-in-a-slab.md)'s
neutral card with a slab, under [ADR-0109](../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)'s tabs.

## Directions shown

Framed, because the question was appearance: interactive phone frames on the real
identity, in light and dark, English and Finnish, at the largest text size (iOS
310 %, Android 200 %) with iOS and Android chrome, over one sample cellar of 17
beers and 50 bottles that held a long Finnish beer and brewery name, a withdrawn
beer, a style the app does not know, bottles past their best-before and undated
bottles. Their code is not committed. Round one showed A, B and C; round two
showed D.

**A: the Catalog's pattern.** *Framed round 1.* A flat list. A find field and a
Sort button sit side by side under the title, pinned, as the Catalog's search
field and Filters button do; Sort opens a sheet of five radio rows. A row says the
bottles held and the soonest best-before on one line, and a bottle already past it
adds a bordered tag. Under the title one line gives the beers and bottles with a
tag for bottles past best-before, and scrolls away with the list. **Taken forward
as the base of D.**

**B: a ledger that stays in view.** *Framed round 1.* A flat list. A bar pinned to
the top holds the totals as large figures, a Find button that opens its field
under the bar, and an order chip that opens a small menu; the title scrolls away.
A row says the bottle count beside the strength, and shows the soonest best-before
only while the list is ordered by it. It kept the totals and the controls in view
at every scroll position, at the cost of a permanent bar that grows with the text
size and a find field hidden behind a button. Not chosen.

**C: grouped by style, controls in the thumb zone.** *Framed round 1.* Beers sit
under headings in the twelve style colours, in the style table's order, each
folding its group with a tap and carrying its own beers and bottles; the order
applies inside each group. A large bottle count and the beer and style counts sit
above the groups. Find and Sort ride in a bar above the tab bar, and the sort menu
opens upward. A row leads with a large bottle count and gives the soonest
best-before. It put the controls in reach of a thumb and made a style a place,
at the cost that "soonest best-before" and "strongest" could not order the whole
cellar, and a cellar of one or two styles read as one long group. Not chosen; its
bottom bar is what D took.

**D: A with the controls moved down.** *Framed round 2, after the owner preferred
A and asked for three changes.* A's flat list and totals line, with Find and Sort
in C's bar above the tab bar, no past-best-before tag anywhere, and no best-before
on the row. **Chosen.**

## Choice

**The Cellar tab is a flat list of colour-field rows under the title and one totals
line, with a find field and a Sort button in a bar above the tab bar and the five
orders in a menu that opens upward from it (direction D).** The product owner named
D in the second round.

It covers:

- **A row** is the beer's colour field: name, brewery, style, the bottles held and
  the strength, large, at the end. It does not say a best-before date, and it has no
  past-best-before tag: the date and the bottles belong to the entry task 03
  designs. A withdrawn beer's row keeps its bottles and carries a bordered
  "Withdrawn from the catalog" tag; a style the app does not know takes the neutral
  colour rather than being dropped.
- **The totals** are one line, beers and bottles, under the title, and scroll away
  with the list. They are the cellar's, not the find's.
- **The bar** holds the find field, which matches a beer's or a brewery's name,
  and a Sort button that names the current order. The order is a menu of five
  radio rows (name, style, strength, bottles, best before) that applies on a tap
  and closes, with a backdrop that closes it without choosing. Name is first.
- **A find with no match** says so with the find's words and a way to clear it, and
  is not the empty cellar.
- **The empty cellar** says it is empty, says what fills it, and offers a main
  action, add a bottle, and an outlined one, browse the catalog. It shows no totals,
  find or sort.
- **At the largest text size** the bar stops being pinned and scrolls with the list
  under the totals, so the controls never take a screen; a row stacks its strength
  beneath its text.

It does not cover what opens from a row or the bottle dates
([task 03](../tasks/iteration-12/03-design-a-cellar-entry-and-its-bottles.md)), the
read from the API ([task 04](../tasks/iteration-12/04-a-user-sees-their-cellar-on-their-phone.md)),
loading, error or offline states, or the Add form. The standing intent is
[`docs/design.md`](../design.md#mobile-cellar-list).

## Agreed departures

- **The orders are named as the web names them,** "Bottles" and "Best before", not
  the frame's "Bottles held" and "Soonest best-before": the strings already exist
  in both languages and one name serves both clients.
- **A find shows the cellar's totals unchanged,** where the frame of B counted the
  matches. Counting matches belongs to B's bar, which was not chosen.
- **The sort menu ends in a visible Close.** The frame closed it by tapping outside
  or choosing; on the iPhone the owner's VoiceOver walk found nothing visible to
  press to leave it without choosing, so the menu carries a Close and its backdrop
  is hidden from screen readers.
- **The list makes room for the keyboard.** The frame did not show the keyboard; on
  the iPhone it covered the find field at the foot of the screen, so the list pads
  its bottom by the keyboard's overlap and the field stays in view while typing.
- **A long name wraps beside the strength.** On the iPhone a beer whose name nearly
  filled the row lost its strength, pushed off the card; the name now wraps and the
  strength keeps its width.
- **The controls stack at the largest text size.** With the bar scrolling with the
  list, the find field and the Sort button sit one above the other at full width
  rather than side by side.

## Sign-off

The product owner named D from the second framed round on 2026-11-23, after
choosing A in the first and asking for the changes that made D.

The built list ran on the iOS Simulator (default and largest text size) and on the
product owner's iPhone in phone mode, over the sample cellar of 17 beers. Their use
of it on the iPhone found three faults, each fixed and then confirmed fixed by the
owner on the phone: a strength missing from a row with a long name, the keyboard
covering the find field, and a sort menu with nothing visible to press to leave it
without choosing, which they found in a Finnish VoiceOver walk (the backdrop was read
last as "close sort menu" and a tap elsewhere only read it). After those, the owner
confirmed the fixes and raised nothing further.

The agent also checked the list once on the Android emulator (Pixel, default text
size, signed in as the seeded dev account): the list, the totals, the find field,
the no-match state and the sort menu with its Close drew as on iOS. There the
keyboard covered the bar until the list padded for it on Android as well, because
the app draws edge to edge, so the same padding is applied on both platforms. The
largest text size and Finnish were not run on Android.

Not done: a separate, explicit pass of the whole list in a VoiceOver walk after the
fixes, and TalkBack, which nobody has walked.
