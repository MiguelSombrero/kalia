# Task 14: Edit and remove a bottle from the cellar

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)

## Why

Once bottles exist in the cellar ([task 11](11-cellar-page.md),
[task 13](13-add-bottle-to-cellar.md)), an owner needs to fix a mistake — a
wrong date — or record that a bottle is gone, without deleting and
re-adding it by hand. This is the cellar page's remaining mutation surface.

## Scope

Editing a bottle's dates and removing a bottle, both from the cellar page,
without a full page reload.

## Non-goals

- Adding a new bottle — [task 13](13-add-bottle-to-cellar.md).
- Editing beyond the fields task 01 defines — no ratings, no tasting notes.
- Bulk edit or removal across multiple bottles at once.

## Constraints

- Mutations go through TanStack Query
  ([ADR-0008](../../adr/0008-tanstack-query.md)) and the cellar feature's
  own `api.ts` wrapper over the generated client
  ([ADR-0012](../../adr/0012-orval-api-client.md)); failures surface as a
  tagged `ApiError` ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); no hardcoded copy.
- Design tokens only — semantic layer, never raw primitives
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)).
- WCAG 2.1 AA, enforced at the three existing layers rather than a new gate
  — a destructive action (remove) needs a non-color-only confirmation
  affordance.

## Open questions

1. **Inline edit vs. dialog** for editing a bottle's dates.
2. **Delete confirmation** — dialog, undo toast, or none?
3. **Does editing reuse** the add form/dialog
   [task 13](13-add-bottle-to-cellar.md) builds?

An answer of "your call" to any of these is a fine answer and turns into a
constraint above.

## Acceptance criteria

- [ ] Editing a bottle's dates persists and is reflected on the cellar page
      without a full reload — Playwright continues sign in → add → edit →
      see it updated
- [ ] Removing a bottle removes it from the cellar page without a full
      reload — same Playwright spec, continuing → remove
- [ ] The edit/remove affordances pass `axe` with no violations, in both
      locales
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Split from [task 03](03-cellar-frontend.md) — see that file's Notes for why.
