# Task 20: An admin removes an approved beer from its page

- **Status:** done
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-2

## Why

`make moderate ACTION=remove` is how an operator takes down a beer that was
approved and should not have been. [Task 08](08-the-sql-moderation-script-is-retired.md)
retires the script and puts removal in the admin API, and refinement on
2026-11-04 decided that an admin removes a beer from the beer's own page
([task 02](02-decision-what-reviewing-a-suggestion-does.md)'s Constraints).
An approved beer is not in the review queue, so
[task 11](11-design-the-admin-review-page.md)'s page never offers it.

## Scope

A beer's details page offers an admin, and nobody else, an action that removes
the beer from the catalog through the admin API
([task 08](08-the-sql-moderation-script-is-retired.md)), guarded by a
confirmation, in both locales. It is offered on any approved beer, imported and
seeded ones included. Afterwards the admin lands on the catalog's search with a
notice that the beer was removed, and the beer is withheld as
[ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)
and [iteration 10 task 15](../iteration-10/15-a-withheld-beer-is-withheld-consistently.md)
state.

## Non-goals

- Editing an approved beer, which stays in [the backlog](../backlog.md)
  ("Editing a catalog beer").
- Notifying the contributor: task 02 decided removal notifies nobody.
- A mobile admin surface.

## Constraints

- Follows [task 08](08-the-sql-moderation-script-is-retired.md) (the API) and
  [task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md)
  (the web's view of the role, and the Playwright suite's admin).
- The role is read in the BFF and the backend stays the authority
  ([ADR-0101](../../adr/0101-an-admin-is-a-realm-role-in-the-access-token-which-the-backend-enforces-on-one-path-prefix-and-the-web-reads-in-its-bff.md));
  the action is absent from the page for a non-admin, not merely disabled, and
  the details page reaches the browser with a boolean and no token.
- Removal takes no reason and answers `200` with the beer as decided; `409`
  means the beer is no longer approved, `404` that it is unknown
  ([task 08](08-the-sql-moderation-script-is-retired.md)). What each means to
  the admin is shown, not swallowed: a `409` leaves them on the page and says
  the beer is no longer approved, since another admin may have removed it.
- A removed beer is withheld everywhere
  ([iteration 10 task 15](../iteration-10/15-a-withheld-beer-is-withheld-consistently.md)):
  a holder keeps their bottles and sees the beer unlinked, which is what the
  confirmation says before the admin commits.
- The Playwright test removes a beer it created itself — a worker suggests it
  and the admin approves it through the admin API — and never an imported one,
  which other specs search for.
- Radix is the UI dependency for dialogs; mutations go through TanStack Query
  ([ADR-0008](../../adr/0008-tanstack-query.md)) and a feature `api.ts`, and a
  failure is a typed `ApiError`
  ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- Design tokens only ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)),
  states per [ADR-0022](../../adr/0022-loading-error-empty-states.md), WCAG 2.2
  AA, every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).

**Decided at refinement, 2026-11-05** (product owner):

- **After removing, the admin lands on the catalog's search with a notice that
  the beer was removed,** since the beer's own page answers `404` for everyone
  from then on. The admin area, which holds a queue the removed beer is not in,
  and staying on the page until a reload turns it into a `404`, were rejected.
  The notice is announced to assistive technology and is not kept in the URL.
- **The wording** of the action, the confirmation and the notice is drafted in
  the implementation PR for the product owner's review, as tasks
  [08](08-the-sql-moderation-script-is-retired.md) and
  [10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md) do.
- **This is an ordinary task, not a design task:** one action and one
  confirmation, built from the existing dialog primitives and design tokens,
  leave no layout to choose between built alternatives. The iteration index's
  "design tasks" prose is corrected to say so.
- **Removal reaches any approved beer, imported ones included**
  ([task 08](08-the-sql-moderation-script-is-retired.md)'s decision).

## Open questions

**None.**

## Acceptance criteria

- [x] A component test shows the remove action to an admin and to nobody else
- [x] A Playwright test signs in as the admin the suite provisions, removes an
      approved beer it created for the purpose after confirming, lands on the
      search with the notice, and the beer is then absent from search and its
      page answers `404` and the not-found page — against the running stack
- [x] A component test shows a refused or failed removal — `403`, `404`, `409`
      and a network failure — shown to the admin rather than swallowed, with the
      admin left on the page, and a successful removal sending them to the
      catalog's search with the notice announced as a status message
- [x] A component test shows the confirmation naming the beer and saying it
      disappears for everyone while those who hold it keep their bottles, and
      that cancelling it changes nothing
- [x] Every rendered state passes `axe` with no violations, in both locales
- [x] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Provenance: refinement of iteration 10.5 on 2026-11-04, which kept removal as
an admin operation on a beer's page when `make moderate` is retired.
