# Task 07: Design the Add action and finding the beer to add

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1
- **Kind:** design

## Why

The central button in the tab bar was designed as the way to add a bottle,
carried by a scan that is now dropped
([iteration 14](../iteration-14.md)): a barcode is a number and carries none of
the name, brewery or strength Kalia would need. What the button opens today
([ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md))
is a sheet that says scanning is not available yet and points to the catalog,
which is a sentence with no way forward and a promise that will not be kept.

The button is the first thing a user sees on every screen and now has to mean
something by itself: one way, among others, to put a bottle in the cellar. A
user who does not start from a beer's own page has to find the beer first, and
the backlog's "adding a beer from the cellar" is that flow, mobile first.

## Scope

What the Add action does and how a beer is found from it: whether it opens a
search straight away or a short choice, how the search reads and shows its
results, what a result says about what the user already holds, what picking one
leads to (the form of [task 06](06-design-the-bottle-form.md)), what the user
sees when it is added, and what the search says when nothing is found. How the
same flow starts from inside the cellar, from its header and its empty state,
and how the button behaves signed out. Built as working components over local
sample data, in both locales and at the largest text size, on both platforms'
conventions where they differ. The chosen behaviour amends ADR-0109, and
standing intent goes in [`docs/design.md`](../../design.md).

## Non-goals

- Wiring the search and the add — [task 09](09-a-user-finds-a-beer-to-add-from-the-add-action-or-the-cellar.md).
- The add from a beer's own page — [task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md).
- Scanning, which is dropped, and any other way to find a beer.
- The button's icon, and the shape beneath it that
  [iteration 11.5 task 15](../iteration-11.5/15-nothing-is-drawn-beneath-the-add-action.md)
  removes.

## Constraints

- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)); how a
  sheet moves under a finger and what the button feels like are judged in a
  native build
  ([ADR-0108](../../adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md)).
- A choice that contradicts ADR-0109 names it in the record's `Departs from`,
  and the ADR gets an `Amended` line
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)). Its
  Evidence records two things the owner saw in the VoiceOver walk: the Add
  action should identify the beer it would add where there is one, and opening
  its sheet focused a gearwheel in a development build.
- A signed-out visitor is offered sign-in from the context they are in, with
  the system browser doing the sign-in
  ([ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md),
  [ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).
- The catalog search sends nothing per keystroke
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)); a contributor's
  own pending beer is in its results, and the API takes bottles of it; a beer an
  operator rejected or removed does not appear
  ([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)).
- Sheets have an explicit close; no control needs a gesture; roles, names and
  no fixed height around text
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)); every
  string in `en` and `fi`.

## Open questions

- **Does Add ever add something other than a bottle?** A beer the catalog does
  not hold can be suggested on the web
  ([iteration 8](../iteration-8.md)); the phone has no such flow, and the scan
  that was to lead into it is dropped. Does a search with no result offer to
  suggest the beer, here or in a task of its own, or leave it to the web?
- **On a beer's page, what the Add action adds.** The owner asked in the
  VoiceOver walk that Add identify the beer; does it add that beer, or always
  open the search?
- **Before anything is typed,** does the search show something — the beers last
  added, the beers held — or nothing?
- **After an add,** does the sheet close, return to where it was opened, or
  offer to add another?
- **Whether the button's label changes** between screens, and what a screen
  reader hears from it.

## Acceptance criteria

- [ ] The product owner chose from built alternatives, at minimum what the Add
      action opens and how a result and the end of the add are shown, each
      judged at the largest text size in both locales; a design record holds
      the directions and the choice and names ADR-0109 in `Departs from`
- [ ] ADR-0109 carries an `Amended` line pointing to the record, and the
      scan-not-yet-available copy and its `en` and `fi` strings are gone
- [ ] A component test finds the Add action, the search field, a result and the
      close action by role and accessible name, and shows the sheet's empty,
      no-match and signed-out states
- [ ] A component test renders a result with a long Finnish beer and brewery
      name at the largest font scale, reading in full
- [ ] `docs/design.md` carries the chosen behaviour as standing intent, and
      `scripts/check-design-tokens.mjs` and `scripts/check-contrast.mjs` pass
      over it
- [ ] The product owner signed off the built behaviour live, on both platforms
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Add a beer from inside
the cellar"), the backlog's "Adding a beer from the cellar", and the product
owner's request of 2026-11-20 that the tab bar's Add button be one way to add a
bottle. `mobile/README.md`'s line on the Add sheet is brought up to date when
the behaviour is built.
