# Task 09: A user finds a beer to add from the Add action or from the cellar

- **Status:** refined
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
offered sign-in from where they are, and after signing in they are back in the
form where they left it, without pressing Add again. The scan-not-yet-available
copy and its strings are removed, and the documents that describe the Add sheet
are updated with it.

## Non-goals

- The beer's own page and its action — [task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md).
- Sending a suggestion of a beer the catalog does not hold —
  [task 26](26-a-user-suggests-a-beer-the-catalog-lacks-while-adding-bottles-of-it.md); this task shows the way into it.
- A cache of results for use offline; the catalog needs the server.

## Constraints

- The catalog's search is the catalog feature's: this feature does not import
  it, so the two meet through a `src/lib/` store or a shared component, the
  shape `showCatalogWith` already has
  ([mobile conventions](../../../mobile/CONVENTIONS.md)). Which one is chosen
  while building, and the pull request says why.
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

**Decided at refinement, 2026-11-22** (product owner):

- **The flow is [task 07](07-design-the-add-action-and-finding-the-beer-to-add.md)'s
  Add form** with the beer field empty, from the Add action, the cellar's header
  and the empty cellar's action alike; on a beer's page the Add action opens it
  with that beer filled in, which [task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md)
  builds.
- **A signed-out visitor who signs in from Add comes back to the form where they
  left it,** with the beer if one was picked, and does not press Add again. The
  web's "Finish an add begun before signing in" stays in the
  [backlog](../backlog.md) for the web.
- **A contributor's own pending beer is in the results,** marked as waiting for
  review, and takes bottles.
- **Picking a beer already held adds more bottles of it,** and its result says
  what is held.
- **A search with no match offers to go on and suggest the beer,** as task 07
  chose; this task shows the way into it and [task 26](26-a-user-suggests-a-beer-the-catalog-lacks-while-adding-bottles-of-it.md) sends it.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component test shows the Add action, the cellar's header action and the
      empty state's action each opening the flow, and the search sending one
      request after the pause
- [ ] A component test shows a pick leading to the form, the add sent once, the
      cellar read again and the flow ending as task 07 chose
- [ ] A component test shows the no-match state offering to go on to a
      suggestion, and a signed-out press of Add offering sign-in and coming back
      to the form where it was after signing in
- [ ] A component test shows a contributor's own pending beer in the results
      marked as waiting for review, and a beer already held showing what is held
      and taking more bottles
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
