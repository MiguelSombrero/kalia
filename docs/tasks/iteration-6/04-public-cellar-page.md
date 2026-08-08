# Task 04: Public cellar page

- **Status:** needs-refinement
- **Iteration:** [6](../iteration-6.md)

## Why

With [task 02](02-public-cellar-api.md) a public cellar is readable over HTTP
and with [task 03](03-profile-page.md) someone can make theirs public — but
there is still nowhere to look at one. This task is what makes the iteration's
goal true for a person: you send someone a link, and they see your cellar.

It is also the first page in Kalia that renders another person's data, which
makes it the first page where showing too much is a privacy bug rather than a
layout mistake.

## Scope

A page rendering a public cellar — its beers and the bottles beneath them —
reachable by link and from the owner's profile, for signed-in and signed-out
visitors alike. Both locales, and the loading/error/empty states the rest of
the app already has, including the case where the cellar is not public.

## Non-goals

- Editing anything on someone else's cellar, in any form.
- Browsing or searching public cellars. You arrive by link; discovery is the
  [feed](../iteration-7.md)'s job.
- Following, liking or commenting — [backlog](../backlog.md).

## Constraints

- Server components by default; a client component only where interaction needs
  one ([frontend/README.md](../../../frontend/README.md) conventions).
- The page renders exactly what [task 02](02-public-cellar-api.md)'s public
  response carries and never reaches for the owner's own endpoints. If a field
  is withheld from the API it must not be recoverable from the page.
- The feature package follows whatever
  [iteration 5 task 06](../iteration-5/06-feature-public-surfaces.md) settles
  for public surfaces, and reuses the cellar rendering
  [iteration 5 task 03](../iteration-5/03-cellar-frontend.md) built rather than
  duplicating it.
- Loading, error and empty states follow
  [ADR-0022](../../adr/0022-loading-error-empty-states.md).
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); no hardcoded copy.
- Design tokens only ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)),
  WCAG 2.1 AA at the three existing layers.

## Open questions

1. **How does a visitor tell they are looking at someone else's cellar rather
   than their own?** The two pages will look nearly identical, and the owner
   sees both. Whose name, where, and how prominent?
2. **What does a not-public cellar render** — a 404 page, or something that
   explains the cellar is private? This must match whatever
   [task 02](02-public-cellar-api.md) question 1 settles; a page that says
   "this cellar is private" undoes a 404 chosen to leak nothing.
3. **Is the page indexable?** See [task 02](02-public-cellar-api.md)
   question 3 — the `robots` directive is set here even if the decision is
   made there.
4. **Does an empty public cellar look different from a private one?** If it
   does, the difference tells a stranger the cellar exists.
5. **What can a visitor do from here** — click through to a beer in the
   catalog, and anything else?

## Acceptance criteria

- [ ] A signed-out visitor opening a public cellar's link sees its beers and
      bottles — component test, and Playwright covering the link end to end
      without signing in
- [ ] A cellar that is not public renders the agreed state and exposes nothing
      about its contents — component test asserting the response's beers never
      reach the DOM
- [ ] Playwright covers user A making their cellar public, then a visitor with
      no session opening it, then A making it private and the same URL no
      longer showing it — the full round trip, since a fixture-based test would
      miss the transition
- [ ] Nothing the API withholds appears on the page — component test pinning
      the rendered fields against the public response shape
- [ ] Every rendered state passes `axe` with no violations, in both locales
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

**None.**
