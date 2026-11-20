# Task 09: A user finds a beer to add from the Add action or from the cellar

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-1

## Why

A bottle is added to a catalog beer, so a user not already on that beer's page
has to find it first. The tab bar's Add button, and the cellar itself, are where
they will be, and today the button opens a sheet that points back to the
catalog. [Task 07](07-design-the-add-action-and-finding-the-beer-to-add.md)
chose what the button does and how a beer is found; this builds it.

## Scope

The Add action, the cellar's header and the empty cellar's action each open the
search-and-add flow of task 07: a search of the catalog, its results, a pick,
the bottle form and the add of [task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md),
and what the user sees afterwards. A signed-out visitor who presses Add is
offered sign-in from where they are, and the flow does not need them to press it
again after signing in unless refinement says it does. The scan-not-yet-available
copy and its strings are removed, and the documents that describe the Add sheet
are updated with it.

## Non-goals

- The beer's own page and its action — [task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md).
- Suggesting a beer the catalog does not hold, unless task 07's choice and
  refinement bring it here.
- A cache of results for use offline; the catalog needs the server.

## Constraints

- The catalog's search is the catalog feature's: this feature does not import
  it, so the two meet through a `src/lib/` store or a shared component, the
  shape `showCatalogWith` already has
  ([mobile conventions](../../../mobile/CONVENTIONS.md)). Which one is for
  refinement.
- A search runs after a pause in typing, from two characters, and sends one
  request, not one per keystroke
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md),
  [iteration 11 task 09](../iteration-11/09-catalog-search-and-list.md)).
- The tab bar's Add action keeps its role, label and focus order
  ([iteration 11.5 task 15](../iteration-11.5/15-nothing-is-drawn-beneath-the-add-action.md)),
  and Android Back dismisses the sheet first
  ([ADR-0109](../../adr/0109-mobile-navigation-uses-four-tabs-and-a-central-add-action.md)).
- A signed-out visitor never loses their place across the system-browser
  sign-in ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).
- `mobile/README.md` says what the Add sheet does; it changes in this task
  ([ADR-0020](../../adr/0020-documentation-roles.md)).
- Roles, names and tap targets; every string in `en` and `fi`.

## Open questions

- **Finishing an add begun before signing in.** The web leaves a visitor to
  press Add again after sign-in (the backlog's "finish an add begun before
  signing in"). Does the phone carry the intent through, or repeat the web's
  behaviour?
- **A contributor's own pending beer in the results,** addable as the API
  allows and marked as waiting for review, or left out of the search.
- **A beer already in the cellar,** where picking it opens the form for another
  bottle, shows what is held, or goes to its entry.

## Acceptance criteria

- [ ] A component test shows the Add action, the cellar's header action and the
      empty state's action each opening the flow, and the search sending one
      request after the pause
- [ ] A component test shows a pick leading to the form, the add sent once, the
      cellar read again and the flow ending as task 07 chose
- [ ] A component test shows the no-match state and a signed-out press of Add
      offering sign-in
- [ ] A component test shows the scan-not-yet-available copy gone, and the
      `en` and `fi` strings with it
- [ ] A Maestro flow adds bottles of a beer found by search from the Add
      action and finds them in the cellar on Android, and was confirmed to fail
      against the old sheet
- [ ] The product owner used the flow on both platforms and signed it off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Add a beer from inside
the cellar"); the backlog's "Adding a beer from the cellar" is taken by this
task for the phone, and stays there for the web.
