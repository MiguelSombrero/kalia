# Task 20: An admin removes an approved beer from its page

- **Status:** needs-refinement
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
the beer from the catalog through the admin API, guarded by a confirmation, in
both locales. Afterwards the beer is withheld as
[ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)
and [iteration 10 task 15](../iteration-10/15-a-withheld-beer-is-withheld-consistently.md)
state, and the admin is told it was removed.

## Non-goals

- Editing an approved beer, which stays in [the backlog](../backlog.md)
  ("Editing a catalog beer").
- Notifying the contributor: task 02 decided removal notifies nobody.
- A mobile admin surface.

## Constraints

- **This task cannot be refined before [task 02](02-decision-what-reviewing-a-suggestion-does.md)
  is done**, and follows [task 08](08-the-sql-moderation-script-is-retired.md)
  (the API) and [task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md)
  (the web's view of the role).
- The role is read in the BFF and the backend stays the authority
  ([task 01](01-decision-who-is-an-admin.md)'s Constraints); the action is
  absent from the page for a non-admin, not merely disabled.
- Radix is the UI dependency for dialogs; mutations go through TanStack Query
  ([ADR-0008](../../adr/0008-tanstack-query.md)) and a feature `api.ts`, and a
  failure is a typed `ApiError`
  ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- Design tokens only ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)),
  states per [ADR-0022](../../adr/0022-loading-error-empty-states.md), WCAG 2.2
  AA, every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).

## Open questions

1. **Where the admin lands** once the beer is removed, since its details page
   then answers `404` for everyone: the catalog's search, the admin area, or
   the same page saying it was removed.
2. **Wording** of the action, the confirmation and the outcome — drafted in the
   PR for the product owner's review.

## Acceptance criteria

- [ ] A component test shows the remove action to an admin and to nobody else
- [ ] A Playwright test signs in as an admin the suite provisions, removes an
      approved beer after confirming, and the beer is then absent from search
      and its page answers not found — against the running stack
- [ ] A component test shows a refused or failed removal shown to the admin
      rather than swallowed
- [ ] Every rendered state passes `axe` with no violations, in both locales
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Provenance: refinement of iteration 10.5 on 2026-11-04, which kept removal as
an admin operation on a beer's page when `make moderate` is retired.
