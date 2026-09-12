# Task 03: Front page feed

- **Status:** refined
- **Iteration:** [7](../iteration-7.md)
- **Covers:** DW-4, DW-3

## Why

Kalia's front page is a title, a tagline and a button to the catalog. It says
nothing about what the app is for and gives a returning user no reason to open
it.

With [task 02](02-feed-api.md) there is finally something to put there: what
people are actually doing with their cellars. This task is what turns the feed
from a table into the thing a visitor sees first, and it is where a public
cellar gets found by someone who was not sent a link.

## Scope

Replacing the front page's static content with the feed: recent events,
newest-first, each reading as a sentence about a person and a beer, linking to
that person's public cellar. Paging further back as the visitor scrolls. Both
locales, and the loading, error and empty states — including the empty state
that a brand-new installation shows, which under
[task 09](09-feed-and-private-cellars.md)'s decision is the normal state rather
than an edge case. Also the two strings on the profile page's visibility
control, reworded here because this is the page that makes the old wording
untrue (Constraints).

## Non-goals

- Liking or commenting on an event — [backlog](../backlog.md).
- Filtering or personalising the feed.
- Updating the page while it is open — [task 07](07-live-front-page.md) makes
  this page live; this task gets the rendered version right first, including
  paging *backwards*, which task 07 then extends with arrivals at the head.
- A relative-time formatter usable outside `features/cellar` —
  [task 08](08-shared-relative-time.md), if question 2 below wants one.
- Removing the catalog entry point. Browsing beers stays reachable from the
  front page.

## Constraints

- Server components by default; a client component only where interaction needs
  one ([frontend/README.md](../../../frontend/README.md) conventions).
  **Corrected during refinement:** the infinite scroll decided below does need
  the client, so this task builds the server-rendered first page *and* the
  client component that pages back from it, reading through a Server Action
  ([ADR-0040](../../adr/0040-client-reads-via-server-actions.md)) behind a
  feature-owned hook ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)).
  [Task 07](07-live-front-page.md) then extends that same hook and component
  with arrivals at the head rather than replacing them — the server-rendered
  first page stays the first paint in both tasks.
- **The feed is global shared state and the Playwright suite mutates it.**
  Other specs add bottles while this one runs, so an assertion about a feed's
  length, or about an event's *position* in it, flakes in CI
  ([iteration 6 task 11](../iteration-6/11-e2e-suite-account-contention.md) is
  the precedent) — assert that your own event is present, from an account that
  is yours.
- The feature package follows whatever
  [iteration 5 task 06](../iteration-5/06-feature-public-surfaces.md) settles
  for public surfaces, and the boundaries
  [task 05](../iteration-5/05-enforce-frontend-module-boundaries.md) enforces.
- Loading, error and empty states follow
  [ADR-0022](../../adr/0022-loading-error-empty-states.md) — a `loading.tsx`
  with a shape-matched skeleton, `EmptyState` for a feed with nothing in it.
- Every string is translated in both `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)). **A feed line is a
  sentence with a person and a beer in it, so it is the first copy in Kalia
  where Finnish word order and case endings will not survive naive
  interpolation** — this is the trap ADR-0011 already names for plurals, one
  level harder.
- Design tokens only ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)),
  WCAG 2.1 AA at the three existing layers.

**Decided 2026-09-12 by the product owner.** What a line *contains* is settled
in [task 04](04-feed-line-composition.md) and the privacy rule in
[task 09](09-feed-and-private-cellars.md); neither is restated
([ADR-0020](../../adr/0020-documentation-roles.md)). This section is the single
home for what the page looks like.

- **The feed is the page** (question 3). A compact masthead and then the feed,
  full height — not today's centred hero with a feed bolted beneath it. The
  catalog entry point stays reachable, carried in the masthead. Iteration
  [7.5](../iteration-7.5.md)'s design sprint is where the result gets its
  visual treatment; this task is responsible for it being right, not for it
  being finished-looking.
- **The username is the link** (question 1). A line reads
  *"**MiguelSombrero** added 6 bottles of a 2019 AleSmith IPA to their
  cellar"*, with the username linking to `/cellars/{username}`
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md) addresses a cellar by
  exactly that segment). **This is what keeps the Finnish sentence
  translatable:** a name in subject position is nominative in both languages,
  so the anchor text never inflects, and the rest of the line is one
  translatable string with plain interpolations — no `<Trans>` component
  placeholder mid-sentence and no linked words taking a case ending. Under
  [task 09](09-feed-and-private-cellars.md) every line's cellar is public, so
  there is no unlinked variant to word.
- **Infinite scroll** (question 5). The page pages back through the 30-day
  window as the visitor scrolls, over [task 06](06-feed-increments.md)'s
  cursor — which is why task 06 is ordered before this one. No "see more" link
  and no second feed route. This is the growth in scope the refinement
  conversation added to this task; it needs a scroll sentinel, a loading state
  at the foot of the list, and the accessibility care a list that will *also*
  grow at the head deserves.
- **The empty feed gets an `EmptyState` that explains and invites** (question
  4). [ADR-0022](../../adr/0022-loading-error-empty-states.md)'s component,
  with copy saying what appears here and that it comes from cellars people have
  chosen to make public. For a signed-in visitor whose own cellar is private it
  points at the visibility control. This is the first impression of every new
  Kalia and the page's only growth lever, not an edge case.
- **Time is shown relative, one unit, with an absolute date past a week**
  (question 2) — "just now", "4 minutes ago", "2 hours ago", "yesterday",
  "3 days ago", then a localised date — alongside a `<time datetime>` carrying
  the exact instant. [Task 08](08-shared-relative-time.md) builds the
  formatter and is the home for its rules; it goes ahead because of this
  answer.
- **No avatars and no images** (question 6). Nothing in Kalia has images, there
  is no avatar source and no image storage, and adding one here is a larger
  change than it looks. **Recorded by the agent during refinement rather than
  asked.**
- **The profile page's visibility control is reworded here**, to say both that
  a public cellar is readable by anyone with the link *and* that your additions
  appear on Kalia's front page
  ([task 09](09-feed-and-private-cellars.md) decided the new meaning). It is a
  two-string change in `features/profile` rather than this task's own feature,
  shipped in this PR because this is the page that makes the old sentence
  untrue.

## Open questions

**None.**

## Acceptance criteria

- [ ] The front page renders recent events newest-first for a signed-out
      visitor — component tests (`*.test.tsx`) for populated, empty and error
      states
- [ ] Every rendered line's username links to `/cellars/{username}` — component
      test; there is no unlinked variant, because a line only exists for a
      public cellar ([task 09](09-feed-and-private-cellars.md))
- [ ] Scrolling to the foot of the list loads the next page over the cursor and
      appends it, and reaching the end of the window stops rather than looping
      — component test driving the sentinel
- [ ] The empty state renders for a signed-out visitor and for a signed-in
      visitor whose own cellar is private, and differs between them — component
      test per case
- [ ] The visibility control's new copy is present in both locales and states
      both meanings — component test on `features/profile`, since the string
      moved for a reason that is easy to lose
- [ ] Feed lines read correctly in both `en` and `fi`, including a name and a
      beer in the same sentence — component test per locale
- [ ] Playwright covers sign in → make the cellar public → add a bottle → see
      it appear on the front page → follow the username link to the public
      cellar, from an account that is the spec's own
      ([iteration 6 task 11](../iteration-6/11-e2e-suite-account-contention.md))
- [ ] Every rendered state passes `axe` with no violations, in both locales —
      `jest-axe` in component tests and `@axe-core/playwright` on the pages the
      E2E visits
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

**None.**
