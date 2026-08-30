# Task 04: Public cellar page

- **Status:** refined
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

A page rendering a public cellar — its beers and the bottles beneath them — at
`/cellars/{username}`, reachable by link and from the owner's profile, for
signed-in and signed-out visitors alike. Both locales, and the
loading/error/empty states the rest of the app already has, including the case
where the cellar is not public.

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
  [iteration 5 task 11](../iteration-5/11-cellar-page.md) built rather than
  duplicating it.
- Loading, error and empty states follow
  [ADR-0022](../../adr/0022-loading-error-empty-states.md).
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)); no hardcoded copy.
- Design tokens only ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)),
  WCAG 2.1 AA at the three existing layers.
- **[ADR-0050](../../adr/0050-public-cellar-addressing.md) decides this page's
  URL and what it may reveal.** The locale-less `/cellars/{username}` is the
  shareable address — `proxy.ts` already redirects it by `Accept-Language`, so
  the recipient reads it in their own language rather than the sharer's; the
  locale-prefixed pages stay reachable and carry `hreflang` alternates and
  `rel="canonical"`.
- **A cellar that is not public renders the app's ordinary 404** and says
  nothing more — not that it is private, not that it once was, not that the
  username exists. A page that explains the cellar is private undoes the 404
  chosen to leak nothing, which is why the two decisions are one.
- **`noindex, nofollow` on this page.** "Anyone with the link" is what the
  visibility control promised
  ([task 03](03-profile-page.md)); indexing would quietly widen it.
- The `<h1>` names whose cellar it is — "{username}'s cellar" — so the page
  title, the browser tab and any share preview all carry it. The owner
  additionally sees a banner saying this is how others see their cellar, with
  a link back to their own cellar page; that banner is the only
  caller-dependent thing on the page.
- Each beer links to its catalog page, which is already a public route. No
  add-to-cellar action, no follow, no comment — the page invites nothing, and
  the social loop is [iteration 7](../iteration-7.md)'s.
- An **empty public cellar** renders the ordinary empty state
  ([ADR-0022](../../adr/0022-loading-error-empty-states.md)). It is
  distinguishable from a private one, and that is intended: its owner chose to
  publish it.

## Open questions

**None.**

## Acceptance criteria

- [ ] A signed-out visitor opening a public cellar's link sees its beers and
      bottles — component test
- [ ] A cellar that is not public renders the agreed state and exposes nothing
      about its contents — component test asserting the response's beers never
      reach the DOM
- [ ] **Playwright covers the whole round trip in one spec**, which this task
      owns: sign in as A → make the cellar public → sign out → open the URL
      with no session and see the beers → sign back in → make it private → the
      same URL no longer shows them. A real sign-out rather than a cleared
      cookie, since a spec that only drops the session can pass against a page
      still serving the owner's own cached data. A fixture of two fixed cellars
      would miss the transitions entirely
- [ ] Nothing the API withholds appears on the page — component test pinning
      the rendered fields against the public response shape
- [ ] The locale-less URL reaches the page in the reader's own language, and
      the locale-prefixed pages carry `hreflang` and `rel="canonical"` —
      Playwright for the redirect, component test for the tags
- [ ] The page is served `noindex, nofollow` — component test on the rendered
      metadata, so a later metadata refactor cannot drop it silently
- [ ] The owner's banner appears for the owner and for nobody else, and its
      absence changes nothing else on the page — component test for both
- [ ] Every rendered state passes `axe` with no violations, in both locales
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

**This task owns iteration 6's end-to-end journey spec.**
[Task 03](03-profile-page.md) covers the visibility control itself and stops
there. Both files originally carried a criterion describing the same round
trip, which meant either two overlapping specs or an argument in review about
which one ticks it — the journey lands with the last task it depends on,
because none of it is exercisable until this page exists.

Refined 2026-08-30 with iteration 6 as a batch
([ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md)). Questions
2 and 4 were not answered separately: both follow from
[ADR-0050](../../adr/0050-public-cellar-addressing.md)'s 404 rule.
