# Task 03: Profile page and the visibility control

- **Status:** refined
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

A profile page for the signed-in user at `/[locale]/profile`, showing who they
are in Kalia and whether their cellar is public, with the control to change it
and a link to the public view of their own cellar. Plus the header entry point
that reaches it, replacing today's "Hello, {name}" greeting.

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
- **The control is a toggle that applies immediately**, with no confirmation
  dialog either way. The state sentence beneath it always states what is true
  now, and a failure surfaces as a toast *and* rolls the displayed state back.
- **The copy is "Who can see your cellar?" with "Only me" and "Anyone with the
  link"** — the second is literally true because a public cellar is never
  indexed and there is no discovery
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md),
  [task 02](02-public-cellar-api.md) Non-goals). Wording that promises less
  than the system does, or more, is the failure here. Finnish is written
  alongside it, not translated from it
  ([ADR-0011](../../adr/0011-i18next-localization.md)).
- **The public-cellar link appears only while the cellar is public.** A
  private cellar answers 404 for its owner too
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)), so offering the
  link while private would link to a not-found page.
- The link points at the locale-less `/cellars/{username}`, which is the URL
  the page offers for copying
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)).
- **The header renders an account icon and the username as one link** to
  `/[locale]/profile`, replacing "Hello, {name}"; one accessible name covers
  the pair, and the username stays visible so the signed-in account is
  readable at a glance. `SiteNav` keeps its three items.
- The page shows the username, the control and that link, and **no cellar
  summary** — a second place cellar totals are rendered drifts from the cellar
  page the first time either changes.

## Open questions

**None.**

## Acceptance criteria

- [ ] A signed-in user sees their profile and their current cellar visibility,
      and can change it — component tests (`*.test.tsx`) for both states
- [ ] A failed visibility change surfaces an error and leaves the displayed
      state matching the server — component test with a failing mutation,
      confirmed to fail against an optimistic update that does not roll back
- [ ] A signed-out visitor is invited to sign in rather than shown an error or
      an empty profile — component test
- [ ] The public-cellar link is absent while the cellar is private and present
      once it is public — component test for both states
- [ ] The header's profile link carries an accessible name naming both the
      destination and the user, and reaches `/[locale]/profile` — component
      test plus `jest-axe`
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

Refined 2026-08-30 with iteration 6 as a batch
([ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md)). The
product owner asked for wording and interaction to be settled deliberately;
both are Constraints above rather than a reviewer's call.
