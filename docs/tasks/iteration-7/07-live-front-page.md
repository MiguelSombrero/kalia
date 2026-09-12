# Task 07: The front page updates without a reload

- **Status:** refined
- **Iteration:** [7](../iteration-7.md)
- **Covers:** DW-5

## Why

[Task 03](03-front-page-feed.md) puts the feed on the front page and renders it
once. The [vision](../../../README.md) asks for the other half: a visitor
sitting on the page sees new events arrive without touching the browser. That
is the difference between a landing page that reports what happened and one
that feels like somewhere people are.

It is a separate task from task 03 because it is a separate kind of component.
Task 03's feed is a server component with no JavaScript at all; this one
subscribes, holds state, reconciles what arrives against what is on screen, and
changes the page under someone who may be reading it — which is where the
accessibility work is, and it is not the accessibility work Kalia has done
before. Every other interactive surface in the app changes because a user
clicked something.

## Scope

Making the rendered feed live: polling through the feature-owned hook
[task 03](03-front-page-feed.md) already built, paused while the tab is hidden
and catching up on focus; new events offered at the head of the list behind a
control; duplicates and out-of-order arrivals handled; sane behaviour when a
poll fails and recovers; and a region that changes without ambushing a keyboard
or screen-reader user.

## Non-goals

- The server contract — [task 06](06-feed-increments.md).
- Live updates anywhere else. The cellar and catalog pages stay as they are.
- A notification of any kind outside the page — [backlog](../backlog.md).
- Liking or commenting — [backlog](../backlog.md).

## Constraints

- **The server-rendered list stays the first paint.** The page must not flash
  empty and must not immediately re-fetch what the server already sent; the
  client takes over the list it was given. Getting this wrong looks like a
  working feature and doubles every visitor's cost.
- A client component's read of backend data goes through a Server Action, never
  the feature's `api.ts` and never the generated client directly
  ([ADR-0040](../../adr/0040-client-reads-via-server-actions.md)), and the
  subscription lives in a feature-owned hook rather than a `useQuery` in a
  component ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md),
  [ADR-0008](../../adr/0008-tanstack-query.md)).
- **WCAG 2.1 AA, and two criteria that have not applied to Kalia before:**
  2.2.2 *Pause, Stop, Hide* covers automatically updating information, and
  4.1.3 *Status Messages* covers telling an assistive technology that something
  arrived without moving focus to it. A list that silently reorders under a
  screen reader loses the reader's place, and a list that announces every
  arrival in full is worse. `prefers-reduced-motion` applies to any animation
  used to introduce a line.
- The CSP needs no change and this was confirmed rather than assumed:
  `frontend/lib/config/cspHeader.ts` is `connect-src 'self'`
  ([ADR-0016](../../adr/0016-security-response-headers.md)) and
  [task 05](05-feed-delivery-decision.md) chose polling through a Server
  Action, which is a same-origin POST. Still worth one look in a browser, since
  a CSP failure is invisible to a unit test
  ([iteration 6 task 12](../iteration-6/12-dev-csp-blocks-react-eval.md) is the
  precedent for this class of bug).
- **The front page is statically rendered today** and a live feed makes it
  dynamic. What that means in this Next.js version — which postdates model
  training — is read from `frontend/node_modules/next/dist/docs/`, not
  recalled.
- **The feed is global shared state, and the Playwright suite mutates it.**
  Other specs add bottles while this one runs, so an assertion about *position*
  in the feed, or about the feed's length, is a flake waiting for CI.
  [Iteration 6 task 11](../iteration-6/11-e2e-suite-account-contention.md) is
  the precedent: assert that *your* event appears, from an account that is
  yours.
- Both locales ([ADR-0011](../../adr/0011-i18next-localization.md)); tokens
  only ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)).

**Decided 2026-09-12 by the product owner.** The transport lives in
[task 05](05-feed-delivery-decision.md)'s Constraints and the contract in
[task 06](06-feed-increments.md)'s; neither is restated
([ADR-0020](../../adr/0020-documentation-roles.md)). This section is the single
home for how arrivals behave on screen.

- **New events appear behind a control, never on their own** (question 1).
  A "3 new events" affordance appears at the head of the list; clicking it
  prepends them. **This is what satisfies both new WCAG criteria without a
  judgement call:** 2.2.2 *Pause, Stop, Hide* does not bite because nothing
  updates automatically, and the control is itself the 4.1.3 *Status Message* —
  announced politely, without moving focus, and without reading every arriving
  line in full. Question 2 dissolves with it: nothing is inserted above what
  the visitor is reading, so scroll position is never disturbed and there is
  nothing to compensate for.
- **The visitor's own addition arrives the same way as anyone else's**
  (question 3) — through the next poll, up to 60 seconds later, with no
  special-casing. [Task 02](02-feed-api.md) serves an identical response to
  every caller, so the page has nothing to special-case with.
- **Polling pauses while the tab is hidden and catches up on focus**
  ([task 05](05-feed-delivery-decision.md)), so the catch-up path is the
  ordinary path rather than a failure path — it runs every time someone returns
  to the tab, which is what makes the reconnect test below meaningful rather
  than theoretical.
- **The list is capped** (question 4). A tab left open all day accumulates
  arrivals at the head while infinite scroll accumulates history at the foot;
  the rendered list is bounded at both ends and older entries are dropped from
  the DOM. **Recorded by the agent during refinement rather than asked** — the
  alternative is unbounded memory growth on Kalia's landing page.
- **Liveness is surfaced only when it breaks** (question 5). Nothing in the
  normal case — no dot, no "updated just now", no permanent chrome on a page
  whose job is to look calm. After repeated poll failures, a quiet inline
  notice with a way to retry, so a stalled feed is distinguishable from a quiet
  evening. Kalia has no metrics ([backlog](../backlog.md)), so the page is the
  only place this can ever show.
- **Nothing appears outside the page** (question 6): no count in the tab title.
  It would be incoherent with the decision that a hidden tab stops polling, and
  it is a commitment about what Kalia does with attention that this iteration
  is not making.

## Open questions

**None.**

## Acceptance criteria

- [ ] A new event arriving while the page is open surfaces the "N new events"
      control, and nothing enters the list until it is activated — component
      test, confirmed to fail against an implementation that prepends
      immediately
- [ ] Polling stops while the tab is hidden and catches up on focus — component
      test driving visibility change, confirmed to fail against a hook that
      polls regardless
- [ ] An event the page already holds arriving a second time does not appear
      twice — component test, confirmed to fail against an implementation that
      appends unconditionally
- [ ] A failed poll followed by a successful one leaves no hole and no
      duplicate in the list — component test covering the recovery path
- [ ] Repeated poll failures surface the stalled-feed notice, and a successful
      poll clears it — component test, since a dead feed otherwise looks
      exactly like a quiet evening
- [ ] The rendered list stays bounded with arrivals at the head and paging at
      the foot — component test asserting the cap holds in both directions
- [ ] The server-rendered first page is adopted rather than re-fetched — test
      asserting no request is made for what was already delivered
- [ ] The live region passes `axe` with no violations in both locales, and the
      behaviour chosen in question 1 is verified against WCAG 2.2.2 and 4.1.3
      rather than assumed — `jest-axe` in component tests plus a stated manual
      check of what a screen reader announces
- [ ] Playwright covers two browser contexts: one sits on the front page while
      the other signs in and adds a bottle, and the first sees it appear
      without navigating — confirmed to fail against
      [task 03](03-front-page-feed.md)'s static page
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

**None.**
