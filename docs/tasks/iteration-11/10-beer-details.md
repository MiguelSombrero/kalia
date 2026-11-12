# Task 10: A user opens a beer and reads its details on their phone

- **Status:** refined
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-3, DW-4

## Why

The catalog list ([task 09](09-catalog-search-and-list.md)) shows a beer's
name, brewery, style and strength, and there is nowhere to go from a row. A
beer's own page is where the catalog stops being a list and becomes the thing
the cellar attaches to: [iteration 12](../iteration-12.md) adds "put a bottle of
this in my cellar" to it. The web has the page; the app's version should use
the platform's conventions for opening and leaving a screen rather than its
layout.

## Scope

A beer's details screen, a sheet over the Catalog
([ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)),
reached from a row of the list and from a `kalia://` link, reading
`GET /api/v1/beers/{id}`: what the beer is, who brews it and where, its style on
the style colour and its strength in the beer slot
([ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md),
[ADR-0110](../../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)),
with the loading, error and not-found states, and — for a contributor looking at
their own suggestion — that it is waiting for review. It shows other beers of
the same style, and it leaves a place, with nothing in it, for iteration 12's
cellar action.

## Non-goals

- Adding to the cellar, and any other action — [iteration 12](../iteration-12.md).
- A brewery's own screen; the brewery links to the catalog filtered to it.
- Sharing a beer.
- Admin actions on a beer, which stay on the web.

## Constraints

- The status of a beer is in the response only once
  [task 24](24-a-contributor-sees-the-status-of-their-own-beers.md) lands.
- A beer that is not `APPROVED` is answered `404` to everyone but its
  contributor ([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md),
  [iteration 10 task 15](../iteration-10/15-a-withheld-beer-is-withheld-consistently.md)):
  the not-found state is an expected answer, not a failure, and writes no
  error line — [task 17](17-the-transport-logs-a-failure-only-where-a-feature-calls-it-one.md)
  lands first.
- A value the server adds to a field the screen maps is shown with a fallback
  ([task 18](18-a-client-falls-back-on-an-enum-value-it-does-not-know.md)).
- Reads go through a feature-owned hook over the generated client
  ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)); the deep link works for
  a signed-out visitor, since the catalog is public, and keeps the sign-in
  redirect intact
  ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).
- A deep link into a beer opens it in Catalog with the Catalog root beneath
  it, so dismissal returns there as required by
  [task 02](02-design-the-interaction-model-and-navigation.md). The sheet has an
  explicit close as well as native dismissal, and Android Back dismisses it
  first ([ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)).
- Tokens and primitives only; accessible in platform terms, built for
  [task 11](11-mobile-accessibility-conventions.md) to check; every string in
  `en` and `fi`.

**Settled at the 2026-11-07 refinement** (product owner):

- **The screen shows similar beers** — meant by what is decided below.
- **The brewery is a link** that opens the Catalog tab filtered to that
  brewery ([task 09](09-catalog-search-and-list.md)); there is no brewery
  screen.
- **No sharing** this iteration.

**Decided at refinement, 2026-11-12** (product owner):

- **"Similar" means the same style.** The API's `similarTo` is the same
  brewery and a shared word of the name, and finds a beer's namesakes, not its
  kin, so it is not used. The screen shows up to five other beers of the beer's
  style, from any brewery, with the beer itself left out and the section hidden
  when there are none. The style link below is the way to the rest.
- **Tapping a similar beer replaces the sheet's content** with that beer; there
  is no stack inside the sheet, so one dismissal returns to the Catalog whatever
  the number of hops.
- **The brewery, the style and the country are each a link** that opens the
  Catalog showing only that brewery, style or country, replacing the search,
  other filters and sort that were there and closing the sheet
  ([task 09](09-catalog-search-and-list.md)). The web's counts beside the style
  and country links are not carried over.
- **The place for iteration 12's cellar action is a component with nothing in
  it:** no note, no disabled control, nothing for a user to see or for
  `en` and `fi` to say.
- **The status** is shown as *waiting for review*, on a contributor's own
  pending beer only; an approved beer shows none, and the API carries no
  description to show or to collapse.

**Confirmed at refinement, 2026-11-12** (product owner, as the sweep proposed
them):

- **What the screen shows:** the beer as a card — style colour, name and
  strength, as the list does — then its style, its brewery, and the brewery's
  city and country, the country named in the app's language by the platform's
  region names as [task 23](23-design-the-catalogs-search-and-filters.md)
  names it, then similar beers.
- **One not-found state** answers a `404` or a malformed id: a beer removed
  since the link was made, withheld, another contributor's pending one, or
  never there. It says *This beer is not in the catalog* with an action that
  closes the sheet to the list, and does not say which of those it was.
- **The link's form is `kalia://beers/{id}`,** the web's path without the
  locale. Nothing in the app makes one this iteration. It does not collide with
  `kalia://auth/callback`, the one path `redirectAuthCallback` rewrites; a test
  shows both.
- **A similar-beers read that fails or finds none** hides its section and
  leaves the beer's own page as it was; it is not an error state of the page.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component test shows the loading, error and not-found states, and shows
      that a `404` writes no error line
- [ ] A component test shows a contributor's pending beer carrying its status
      and an approved one not
- [ ] A component test shows a long Finnish brewery and beer name at the
      largest font scale reading in full
- [ ] A component test shows up to five similar beers of the same style, the
      beer itself left out, the section hidden when there are none or the read
      fails, and a tap replacing the sheet's content
- [ ] A component test shows the brewery, style and country links each applying
      one filter to the Catalog and closing the sheet
- [ ] A Maestro flow opens a seeded beer from the list and returns on Android,
      and was confirmed to fail without the screen
- [ ] A test shows the deep link opening the beer, signed out, and dismissal
      returning to the Catalog root
- [ ] The product owner used the screen on the route task 01 chose and signed
      it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Beer details").
