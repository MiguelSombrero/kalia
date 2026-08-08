# Task 03: Profile page and the visibility control

- **Status:** needs-refinement
- **Iteration:** [6](../iteration-6.md)

## Why

[Task 01](01-profile-and-visibility.md) gives a user a profile and a visibility
setting, but nothing in the app lets them see either. Until it does, every
cellar is private and there is no way to change that — the iteration's goal is
unreachable.

The control itself carries more weight than its size suggests: it is the only
place a user decides that strangers may read something of theirs, and the only
place they can find out that they already did.

## Scope

A profile page for the signed-in user showing who they are in Kalia and whether
their cellar is public, with the control to change it and a way to reach the
public view of their own cellar.

## Non-goals

- Viewing anyone else's profile or cellar —
  [task 04](04-public-cellar-page.md).
- Editing anything Keycloak owns (password, email).
- Account deletion, data export, or anything else GDPR-shaped. Real, and in the
  [backlog](../backlog.md).

## Constraints

- Server components by default; a client component only where interaction needs
  one ([frontend/README.md](../../../frontend/README.md) conventions).
- Mutations go through TanStack Query
  ([ADR-0008](../../adr/0008-tanstack-query.md)) and the feature's own `api.ts`
  wrapper over the generated client
  ([ADR-0012](../../adr/0012-orval-api-client.md)); failures surface as a
  tagged `ApiError` ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- The feature package follows whatever
  [iteration 5 task 06](../iteration-5/06-feature-public-surfaces.md) settles
  for public surfaces, and the boundaries
  [task 05](../iteration-5/05-enforce-frontend-module-boundaries.md) enforces.
- Loading, error and empty states follow
  [ADR-0022](../../adr/0022-loading-error-empty-states.md).
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); no hardcoded copy.
- Design tokens only — semantic layer, never raw primitives
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)).
- WCAG 2.1 AA, enforced at the three existing layers.
- **A failed visibility change must not leave the UI showing the new state.**
  An optimistic toggle that silently reverts on the server is the one bug here
  that tells a user their cellar is private when it is not.

## Open questions

The product owner wants a say in the wording and the interaction here, because
this control is about someone's privacy.

1. **What is the control?** A toggle that applies immediately, or a form with
   a save button? Immediate is fewer clicks; a save button makes a deliberate
   act deliberate.
2. **Does making a cellar public need a confirmation step?** It is the moment
   private data becomes readable by strangers. Confirming is friction on a
   reversible action; not confirming makes it a single mis-click.
3. **What exactly does the copy say?** "Public cellar" understates it if the
   page is also indexable. This wording is what a user's understanding of the
   feature is built on, so it wants writing rather than defaulting.
4. **How does a user see their public cellar as others see it** — a link on the
   profile, a preview mode, or nothing? Related to
   [task 02](02-public-cellar-api.md) question 4.
5. **Where does the profile live in the navigation**, and what is its URL for
   the owner — `/profile`, or the same public URL as everyone else's?
6. **What does the page show besides the toggle?** A user's own cellar summary
   is the obvious candidate, and duplicating the cellar page is the obvious
   risk.

An answer of "your call" to any of these is a fine answer and turns into a
constraint above.

## Acceptance criteria

- [ ] A signed-in user sees their profile and their current cellar visibility,
      and can change it — component tests (`*.test.tsx`) for both states
- [ ] A failed visibility change surfaces an error and leaves the displayed
      state matching the server — component test with a failing mutation,
      confirmed to fail against an optimistic update that does not roll back
- [ ] A signed-out visitor is invited to sign in rather than shown an error or
      an empty profile — component test
- [ ] Playwright covers the control itself and stops there: sign in → toggle
      to public → **reload** → it is still public → toggle back. The reload is
      the part worth the browser, because a toggle that updates only local
      state passes every component test. The journey through a stranger's view
      belongs to [task 04](04-public-cellar-page.md)
- [ ] Every rendered state passes `axe` with no violations, in both locales —
      `jest-axe` in component tests and `@axe-core/playwright` on the pages
      the E2E visits
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

The iteration's end-to-end journey spec belongs to
[task 04](04-public-cellar-page.md), not here — this task's browser coverage
stops at the visibility control.
