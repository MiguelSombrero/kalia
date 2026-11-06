# Task 10: A user opens a beer and reads its details on their phone

- **Status:** needs-refinement
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

A beer's details screen, reached from a row of the list and from a
`kalia://` link, reading `GET /api/v1/beers/{id}`: what the beer is, who brews
it, its style on the style colour and its strength in the beer slot
([ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md)), with the
loading, error and not-found states, and — for a contributor looking at their
own suggestion — its status. It leaves the place where iteration 12's cellar
action goes empty but evident in the layout.

## Non-goals

- Adding to the cellar, and any other action — [iteration 12](../iteration-12.md).
- A brewery's own screen; the brewery is named, not linked, unless the product
  owner asks.
- Admin actions on a beer, which stay on the web.

## Constraints

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
- Tokens and primitives only; accessible in platform terms, built for
  [task 11](11-mobile-accessibility-conventions.md) to check; every string in
  `en` and `fi`.

## Open questions

- **Functional scope.** What the screen shows beyond the list row — description,
  brewery country, the style's group — against what the web's page shows, and
  whether similar beers appear.
- **Interaction and UX.** How the screen is dismissed on each platform; whether
  a long description collapses; what sharing a beer does, if anything.
- **Edge cases.** Opening a link to a beer that was removed after the link was
  made; a pending beer of the signed-in contributor, and what it says about
  its status.
- **Integrations.** Whether `kalia://beers/{id}` is the link's form, and that it
  does not collide with the sign-in callback.

## Acceptance criteria

- [ ] A component test shows the loading, error and not-found states, and shows
      that a `404` writes no error line
- [ ] A component test shows a contributor's pending beer carrying its status
      and an approved one not
- [ ] A component test shows a long Finnish brewery and beer name at the
      largest font scale reading in full
- [ ] A Maestro flow opens a seeded beer from the list and returns on Android,
      and was confirmed to fail without the screen
- [ ] A test shows the deep link opening the beer, signed out
- [ ] The product owner used the screen on the route task 01 chose and signed
      it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Beer details").
