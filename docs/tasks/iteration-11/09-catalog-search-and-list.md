# Task 09: A user searches and filters the catalog on their phone

- **Status:** needs-refinement
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
of it, a search that runs as they type, and the filters the API offers in a
sheet, with the list's loading, error, empty and no-match states. The
screen follows the navigation of [task 02](02-design-the-interaction-model-and-navigation.md)
and the platforms' own conventions — pull to refresh, the keyboard's search
key, the sheet's dismissal — and not the web's.

## Non-goals

- A beer's own page — [task 10](10-beer-details.md).
- Adding a beer to the catalog, and the cellar — [iteration 12](../iteration-12.md).
- Working offline.
- Similar beers, which a beer's page shows ([task 10](10-beer-details.md)).

## Constraints

- Reads go through a feature-owned hook over the generated client
  ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)), with every request
  parameter bounded
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)); the app calls
  Spring directly through the edge, whose per-address limit it shares
  ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md),
  [ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)),
  so typing must not send a request per keystroke.
- A signed-in contributor's own pending beers appear in the list
  ([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)),
  so the cache must not outlive the viewer — [task 16](16-signing-in-or-out-clears-what-the-last-viewer-saw.md)
  lands first.
- A style, status or sort value the server adds later is shown, not dropped
  ([task 18](18-a-client-falls-back-on-an-enum-value-it-does-not-know.md)).
- Tokens and primitives only; accessible in platform terms, built so that
  [task 11](11-mobile-accessibility-conventions.md) can check it: roles and
  names on every control, tap targets, and no fixed height around text.
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).

**Settled at the 2026-11-07 refinement** (product owner); the task is refined
once the design tasks' ADRs land:

- **The phone offers every filter the API has** — style, brewery, country and
  a strength range — and every sort the web offers.
- **A search runs after a 300 ms pause in typing, from two characters;** a
  shorter query shows the unfiltered list.
- **The query and the filters survive** opening a beer and coming back.
- **A contributor's own pending beer is marked in the list** with its status.

## Open questions

- **Interaction and UX.** How active filters are shown on the list, which
  follows task 02's navigation and task 03's identity.
- **Edge cases.** A page that fails after the first loaded; a list that is
  exhausted; a filter that no beer matches, and wording for it.
- **Terminology.** The names of styles and countries in Finnish.

## Acceptance criteria

- [ ] A component test shows that typing sends one request after the pause and
      not one per keystroke, and that a newer query replaces an older answer
      arriving late
- [ ] A component test shows the next page loading at the end of the list, a
      failed page keeping the loaded ones and offering a retry, and the end of
      the list stopping
- [ ] A component test shows each filter narrowing the request, clearing
      restoring it, and the no-match state shown
- [ ] A Maestro flow searches for a seeded beer and filters by style on
      Android, and was confirmed to fail against the one-page list
- [ ] The product owner used the screen on the route task 01 chose, on both
      platforms' conventions, and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Catalog search and
list"). Checked against written accessibility conventions by
[task 11](11-mobile-accessibility-conventions.md).
