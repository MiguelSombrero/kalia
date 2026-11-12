# Task 09: A user searches and filters the catalog on their phone

- **Status:** refined
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-3, DW-4

## Why

The Catalog tab shows the first twenty beers of `GET /api/v1/beers` and stops.
The API already searches by text, style, brewery, country and strength, sorts,
and pages (`CatalogController`); the web uses all of it, and the app none. This
is the iteration's proof that the design language works on a real feature, and
the first screen to be built entirely from the primitives of
[task 08](08-mobile-ui-primitives.md).

## Scope

The Catalog tab as a list that loads further pages as the user reaches the end
of it, a search that runs as they type, and the filters the API offers, with the
list's loading, error, empty and no-match states. The search field, the filter
sheet and the display of the filters in force are
[task 23](23-design-the-catalogs-search-and-filters.md)'s, built over local
state; this task wires them to the API, keeps what they hold, and applies a
filter that a link asks for. The screen follows the navigation of
[task 02](02-design-the-interaction-model-and-navigation.md) and the platforms'
own conventions — pull to refresh, the keyboard's search key — and not the
web's.

## Non-goals

- A beer's own page — [task 10](10-beer-details.md).
- Adding a beer to the catalog, and the cellar — [iteration 12](../iteration-12.md).
- Working offline.
- The search field, the filter sheet's controls and how filters in force look —
  [task 23](23-design-the-catalogs-search-and-filters.md).
- Remembering a search across app launches.
- Similar beers, which a beer's page shows ([task 10](10-beer-details.md)).
- The status field itself, which [task 24](24-a-contributor-sees-the-status-of-their-own-beers.md)
  adds to the API.

## Constraints

- Reads go through a feature-owned hook over the generated client
  ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)), with every request
  parameter bounded
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)); the app calls
  Spring directly through the edge, whose per-address limit it shares
  ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md),
  [ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)),
  so typing must not send a request per keystroke. A filter sheet applies its
  choices together ([task 23](23-design-the-catalogs-search-and-filters.md)), so
  it sends one request.
- A signed-in contributor's own pending beers appear in the list
  ([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)),
  so the cache must not outlive the viewer — [task 16](16-signing-in-or-out-clears-what-the-last-viewer-saw.md)
  lands first — and the API says which is pending only once
  [task 24](24-a-contributor-sees-the-status-of-their-own-beers.md) lands.
- A style, status or sort value the server adds later is shown, not dropped
  ([task 18](18-a-client-falls-back-on-an-enum-value-it-does-not-know.md)).
- Tokens and primitives only; accessible in platform terms, built so that
  [task 11](11-mobile-accessibility-conventions.md) can check it: roles and
  names on every control, tap targets, and no fixed height around text.
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).

**Settled at the 2026-11-07 refinement** (product owner):

- **The phone offers every filter the API has** — style, brewery, country and
  a strength range — and every sort the web offers; their controls are
  [task 23](23-design-the-catalogs-search-and-filters.md)'s.
- **A search runs after a 300 ms pause in typing, from two characters;** a
  shorter query shows the unfiltered list.
- **The query and the filters survive** opening a beer and coming back.
- **A contributor's own pending beer is marked in the list** with its status.

**Decided at refinement, 2026-11-12** (product owner):

- **The filters' controls are a design task of their own,**
  [task 23](23-design-the-catalogs-search-and-filters.md), which runs before
  this one: how the filters in force are shown, and how a style, a brewery and
  a country are picked, are chosen from built alternatives there and not here.
  The sheet applies its choices together, with a strength of two number fields.
- **The pending marker needs the status in the response,** which the API does
  not carry: [task 24](24-a-contributor-sees-the-status-of-their-own-beers.md)
  adds it first. Only a contributor's own beer is ever pending in a read, so
  the one status a row can carry is *waiting for review*, in `en` and `fi`.
- **The query and filters are kept while the app is open** — through opening a
  beer, switching tabs and returning — **and a cold start begins unfiltered.**
  Nothing is stored on the device.
- **A link into the Catalog replaces what is there:** a beer's brewery, style or
  country link ([task 10](10-beer-details.md)) clears the query, the other
  filters and the sort, applies that one filter and closes the beer's sheet.

**Confirmed at refinement, 2026-11-12** (product owner, as the sweep proposed
them):

- **A page that fails after the first** keeps the pages already loaded and shows
  a retry at the foot of the list in place of the next page; a retry that
  succeeds continues from there.
- **A list that is exhausted** simply stops, with no "end of list" footer.
- **A search or filter that no beer matches** says so in words and offers to
  clear the filters; it is an empty state of the list
  ([ADR-0022](../../adr/0022-loading-error-empty-states.md)), distinct from the
  catalog being empty. The wording is written with the strings and approved at
  sign-off.
- **A pull to refresh reloads the first page** of the same query and filters.
  The keyboard's search key runs the search at once and dismisses the keyboard.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component test shows that typing sends one request after the pause and
      not one per keystroke, and that a newer query replaces an older answer
      arriving late
- [ ] A component test shows the next page loading at the end of the list, a
      failed page keeping the loaded ones and offering a retry, and the end of
      the list stopping
- [ ] A component test shows each filter narrowing the request, clearing
      restoring it, and the no-match state shown with its clear action
- [ ] A component test shows the query and filters surviving a beer opened and
      closed, and starting empty on a fresh mount of the app
- [ ] A component test shows a contributor's own pending beer marked *waiting
      for review* and an approved one not
- [ ] A Maestro flow searches for a seeded beer and filters by style on
      Android, and was confirmed to fail against the one-page list
- [ ] The product owner used the screen on the route task 01 chose, on both
      platforms' conventions, and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Catalog search and
list"). Checked against written accessibility conventions by
[task 11](11-mobile-accessibility-conventions.md).
