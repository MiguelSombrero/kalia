# Task 07: The front page updates without a reload

- **Status:** needs-refinement
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

Making the rendered feed live: a subscription through whatever
[task 05](05-feed-delivery-decision.md) chose, wrapped in a feature-owned hook;
new events appearing in the list; duplicates and out-of-order arrivals handled;
sane behaviour when the connection drops and comes back; and a region that
changes on its own without ambushing a keyboard or screen-reader user.

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
- The CSP is `connect-src 'self'`
  ([ADR-0016](../../adr/0016-security-response-headers.md)), which covers a
  same-origin subscription and nothing else — confirm it in a browser, since a
  CSP failure is invisible to a unit test
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

## Open questions

1. **Do new events appear on their own, or behind a "3 new events" control the
   visitor clicks?** The second is what most feeds do, and it is the kinder
   answer for a reader mid-sentence and the easier one to make accessible.
   Appearing on their own is more impressive and is what the vision's wording
   suggests. This is the product owner's call and it shapes everything below
   it.
2. **What happens to the visitor's scroll position** when something is inserted
   above what they are reading?
3. **Does the visitor's own addition arrive the same way?** Someone who adds a
   bottle in another tab is the most likely person to be looking at the feed.
4. **Does the page grow forever?** A tab left open all day accumulates every
   event; capping the list is easy and invisible, and not capping it is also a
   decision.
5. **Should the visitor be able to tell the feed is live — or that it has
   stopped being live?** A dead connection currently looks exactly like a quiet
   evening. Nothing in Kalia has metrics ([backlog](../backlog.md)), so the
   page is the only place this could show.
6. **Does anything appear outside the page** — a count in the tab title, say?
   Cheap to build, and a commitment about what Kalia does with attention.

## Acceptance criteria

- [ ] A new event arriving while the page is open is rendered without a reload
      — component test driving the subscription
- [ ] An event the page already holds arriving a second time does not appear
      twice — component test, confirmed to fail against an implementation that
      appends unconditionally
- [ ] A dropped and re-established connection leaves no hole and no duplicate
      in the list — component test covering the reconnect path
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
