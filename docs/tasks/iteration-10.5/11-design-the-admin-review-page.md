# Task 11: An admin reviews suggestions on a page of their own

- **Status:** needs-refinement
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-1, DW-2
- **Kind:** design

## Why

Tasks [05](05-an-admin-reads-the-review-queue.md)–[08](08-the-sql-moderation-script-is-retired.md)
give review an API, and [task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md)
a route only an admin reaches. What the admin works in is still undecided, and
it is most of whether review gets done: a queue that takes three clicks per
suggestion, or hides the brewery that came with the beer, or makes reject as
easy to hit as approve, is a queue that grows.

The page is Kalia's first tool rather than a page for readers. The design
language of [`docs/design.md`](../../design.md) was chosen for browsing a
catalog and a cellar, and how far a working surface follows it is part of the
choice.

## Scope

The admin review page: the queue of suggestions, one suggestion with its beer
and any new brewery, and the three outcomes — approve, reject, and edit then
approve — with their confirmation, loading, error, empty and conflict states,
in both locales. The interaction is a choice the product owner makes from built
alternatives, at least on:

- the queue and the suggestion on one page side by side, a list opening a page
  per suggestion, or a list expanding in place;
- whether editing is a mode of the suggestion's view or a form of its own;
- how a destructive outcome is guarded — a confirmation, an undo window, or
  neither — and how an approval with a new brewery shows that both are being
  approved.

## Non-goals

- The route guard and navigation entry — [task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md).
- A mobile admin surface.
- Admin features beyond review.

## Constraints

- **This task cannot be refined before tasks [02](02-decision-what-reviewing-a-suggestion-does.md)
  and [10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md)
  are done.**
- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), run
  under the `design-task` skill: directions are built, the product owner
  chooses, an ADR records the choice, and the same task then builds it. The
  choices in [`docs/design.md`](../../design.md) and the page shell of
  [ADR-0067](../../adr/0067-page-shell-sticky-bar-and-page-component.md) bind
  every direction unless the ADR records a departure.
- The edit form is react-hook-form + Zod
  ([ADR-0010](../../adr/0010-react-hook-form-zod.md)) mirroring, not
  replacing, the backend's rules; mutations go through TanStack Query
  ([ADR-0008](../../adr/0008-tanstack-query.md)) and a feature `api.ts`, and a
  failure is a typed `ApiError`
  ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- Design tokens only ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)),
  states per [ADR-0022](../../adr/0022-loading-error-empty-states.md), WCAG 2.2
  AA, every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).
- A mockup is built outside the repository and never committed; a screenshot
  never leaves the scratchpad ([rule](../../../.claude/rules/no-screenshots.md)).

## Open questions

1. **Widths:** the two agreed for the web, or desktop only for a tool an admin
   uses at a desk.
2. **What the admin sees beside a suggestion:** the catalog's similar names,
   the contributor's history (task 05's open question 2).
3. **Wording** of the outcomes and the confirmation, in both locales — drafted
   in the PR for the product owner's review.

## Acceptance criteria

- [ ] The product owner chose from built alternatives, at minimum the queue's
      layout, how editing is entered, and how a destructive outcome is
      guarded. An ADR records the directions and the choice, and the product
      owner signed off the built page in the browser pane
- [ ] A Playwright test signs in as the development admin, approves one
      suggestion, rejects one, and edits and approves one, each then shown
      decided — against the running stack
- [ ] A component test shows a suggestion with a new brewery presenting both
      as approved together
- [ ] A component test shows a `409` from a concurrent decision, and a
      server-side refusal of an edit, shown to the admin rather than swallowed
- [ ] Every rendered state passes `axe` with no violations, in both locales
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Provenance: the product owner's brief for iteration 10.5 — "the page creation
should be Design task".
