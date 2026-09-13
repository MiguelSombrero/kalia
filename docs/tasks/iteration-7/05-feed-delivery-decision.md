# Task 05: Decide how the feed reaches a browser that is already open

- **Status:** done
- **Iteration:** [7](../iteration-7.md)
- **Covers:** DW-6

## Why

The [vision](../../../README.md) for this page has a second half that nothing
in this iteration currently builds: the feed updates as things happen, with no
reload. Tasks [01](01-feed-module.md)–[03](03-front-page-feed.md) describe a
page that is rendered once and is stale the moment it is delivered — task 03's
Constraints say so outright, that a feed which only renders does not need the
client.

This is not a detail of the front-page task. It decides whether the backend
grows a kind of endpoint it has never had, whether the BFF grows a kind of
route it has never had, whether the landing page can still be rendered
statically, and how many open connections a stranger can make Kalia hold. Four
facts make it ADR-shaped rather than a preference:

- **The browser never calls Spring** ([ADR-0003](../../adr/0003-bff-pattern.md)),
  so a stream is held open twice — browser to Next, Next to Spring — and every
  visitor costs a connection in two processes. `frontend/app/api/` today holds
  Auth.js's two routes and nothing else, and a client component's read of
  backend data goes through a Server Action rather than a route handler
  ([ADR-0040](../../adr/0040-client-reads-via-server-actions.md)). A streaming
  transport is the first thing in the app that fits neither shape.
- **A connection registry lives in one JVM's memory.** Spring Modulith's
  application events are in-process, so a second backend instance never learns
  of the first instance's `BottleAdded` and its connected visitors never see
  it. Nothing deploys more than one instance today and nothing is deployed at
  all ([backlog](../backlog.md) — deployment target + IaC), so this is a
  limitation to *accept in writing*, not one to discover later. The ways out
  are PostgreSQL `LISTEN/NOTIFY` or a pub/sub broker;
  [architecture.md §8](../../architecture.md) currently states that the Valkey
  in this stack is the frontend's session store and not backend
  infrastructure, so reaching for it here changes a documented statement rather
  than merely adding a dependency.
- **The connection is anonymous and unbounded.** The feed is public, so every
  visitor to the landing page holds a connection for as long as the tab is
  open, and there is no rate limiting anywhere in the stack
  ([backlog](../backlog.md) — public API exposure). Polling has the same
  exposure but a request that ends is cheaper to shed than a connection that
  does not.
- **Delivery is at-least-once whatever the transport.** The event publication
  registry redelivers ([architecture.md §3](../../architecture.md)) and a
  reconnecting client re-asks for a window it may partly hold. Duplicates reach
  the page under every option, so the page must be able to recognise an event
  it already has — which is a requirement on the event's identity, not on the
  transport, and it should be decided once here rather than three times later.

## Scope

One decision, recorded: how a change on the server reaches a page that is
already open; what latency that is allowed to have; what a client that was
disconnected is owed; whether the answer can be swapped later without changing
the API contract; and the single-instance limitation, accepted or solved
explicitly.

## Non-goals

- Building it. The server side is [task 06](06-feed-increments.md) and the
  browser side is [task 07](07-live-front-page.md).
- Push notifications to a closed app. That needs a per-user feed and device
  registration and is [backlog](../backlog.md) work; it is worth knowing it is
  coming while choosing, not worth building.
- Observability of the transport. Nothing in Kalia has metrics
  ([backlog](../backlog.md)), and a silently dead stream is an argument the ADR
  should record rather than a monitoring stack this task installs.

## Constraints

- [ADR-0003](../../adr/0003-bff-pattern.md) is not being reopened: no
  connection from the browser to Spring, whatever the transport.
- The CSP's `connect-src 'self'`
  ([ADR-0016](../../adr/0016-security-response-headers.md),
  `frontend/lib/config/cspHeader.ts`) already permits a same-origin
  `EventSource`, `WebSocket` or `fetch`, so a BFF-proxied stream needs no CSP
  change and a direct one would need both a CSP change and an exception to
  ADR-0003. Verify this rather than taking this bullet's word for it — a CSP
  mistake fails in a browser and not in a test.
- **This Next.js version postdates model training.** Streaming route handlers,
  runtime selection, and what makes a route dynamic are all things to read in
  `frontend/node_modules/next/dist/docs/` before the ADR asserts anything about
  them; guessing here fails silently rather than erroring.
- Whatever is chosen has to work behind the E2E stack Playwright already starts
  (`docker compose`, `frontend/playwright.config.ts`), because
  [task 07](07-live-front-page.md) has to prove the behaviour end-to-end.

**Decided 2026-09-12 by the product owner. This section is the single home for
the delivery answers; tasks [02](02-feed-api.md), [03](03-front-page-feed.md),
[06](06-feed-increments.md) and [07](07-live-front-page.md) point here rather
than restating them ([ADR-0020](../../adr/0020-documentation-roles.md)).** The
ADR this task writes records them and the rejected transports.

- **Latency target: at most 60 seconds** from an event being recorded to a
  focused page showing it (question 1). Stated as a number so a reader can tell
  whether the built thing meets it. The decisive argument is
  [task 09](09-feed-and-private-cellars.md)'s: only public cellars appear, and
  `cellar_public` defaults to `false`, so this page realistically changes hours
  apart — sub-second push buys a latency nobody is present to perceive.
- **The transport is polling**, from a client component on an interval, through
  a Server Action ([ADR-0040](../../adr/0040-client-reads-via-server-actions.md)),
  over [task 06](06-feed-increments.md)'s "since" contract (questions 3 and 4:
  the simplest thing that demonstrates the feature, not a production shape set
  now). **No server-sent events, no WebSocket, no new kind of route handler,
  no CSP change** — confirmed, not assumed: `frontend/lib/config/cspHeader.ts`
  is `connect-src 'self'` and a Server Action is a same-origin POST, so the two
  route handlers [architecture.md §5](../../architecture.md) inventories stay
  two. The single-instance limitation disappears with the connection registry
  rather than being accepted: no instance holds subscriber state, so a second
  backend instance needs nothing, and
  [architecture.md §8](../../architecture.md)'s statement that this stack's
  Valkey is the frontend's session store and not backend infrastructure stands
  unchanged.
- **The seam is kept** (question 5). The page subscribes through one
  feature-owned hook ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)),
  so swapping polling for a stream later is a frontend-internal change and not
  an API contract change. This costs little now and is unavailable later.
- **Polling pauses while the tab is hidden and catches up on focus** (question
  2). An event does not have to reach a backgrounded tab, a sleeping phone or a
  laptop that was shut. Kalia is "the page keeps itself current while you read
  it", not "Kalia delivers news" — the second needs a per-user feed and device
  registration and is [backlog](../backlog.md) work. The catch-up path has to
  exist for reconnection anyway, so pausing adds no code that was not already
  required.
- **Retention: every row is kept; only a recent window is served** (question 6,
  and [task 02](02-feed-api.md)'s question 2). The API serves events newer than
  a stated window — **30 days** — and a cursor older than that is answered
  *start over* rather than with a partial result, because that is the only
  answer that lets a client know it has a hole. No deletion job, and every
  query is bounded.
- **De-duplication is by the event's own identity**, carried in
  [task 06](06-feed-increments.md)'s cursor ordering: delivery is at-least-once
  whatever the transport, so the page must recognise an event it already holds.
  That identity is a property of the event, decided once in
  [task 01](01-feed-module.md) and [task 06](06-feed-increments.md), not three
  times.
- **Likes and comments** (question 3) are [backlog](../backlog.md) work and did
  not earn bidirectionality here. A transport chosen for one direction is not
  wrong for two; when they arrive they are a mutation over the existing Server
  Action path, and the hook seam above is what makes a later WebSocket a
  contained change.

## Open questions

**None.**

## Acceptance criteria

- [x] An ADR records the chosen transport, the rejected ones, and what each
      would have cost in the four structural terms above — BFF hop, instance
      affinity, open-connection exposure, duplicate delivery — passing
      `node scripts/check-adrs.mjs`
- [x] The ADR states the latency the answer is allowed to have, as a number,
      and how a reader would tell whether the built thing meets it
- [x] The ADR states whether more than one backend instance is supported, as
      an accepted limitation or a solved problem, rather than leaving it
      unasked
- [x] The ADR states what identifies a feed event for de-duplication, since
      every option delivers duplicates
- [x] `docs/architecture.md` §2, §4 and §5 describe the transport where they
      describe the shapes it changes — the route-handler inventory in §5 in
      particular, which currently says there are exactly two
- [x] The ADR does not contradict the Constraints above, which the refinement
      PR already wrote into tasks [02](02-feed-api.md),
      [03](03-front-page-feed.md), [06](06-feed-increments.md) and
      [07](07-live-front-page.md) — read against each of them, and any
      divergence resolved in this PR
- [x] The ADR names the test each of tasks 06 and 07 must write to prove
      delivery and reconnection, without writing either here

## Notes

This task produces no production code and therefore **no new automated test**,
a deliberate exception to
[ADR-0026](../../adr/0026-task-file-format.md)'s rule that every task carries
one — the same exception, for the same reason, taken by
[iteration 6 task 07](../iteration-6/07-cellar-domain-events.md) and
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md). The tests
belong to tasks 06 and 07, which is why the last criterion names them rather
than writing any.

**Written as a recommendation before the decision; the product owner took it
on 2026-09-12, so the Constraints above are now the decision and this
paragraph is kept as the reasoning that led there.** Polling from a client component on an
interval, through a Server Action
([ADR-0040](../../adr/0040-client-reads-via-server-actions.md)), over the
"since" contract [task 06](06-feed-increments.md) builds, is the only option
that needs no new transport, no new route-handler kind, no CSP change, no
instance affinity and no new dependency — and it leaves the seam for a stream
later if question 1's answer turns out to be seconds rather than tens of
seconds. It costs one request per open tab per interval and a delay of up to
that interval. Server-sent events are the right answer if the latency target is
low or if this page is meant to feel like news arriving; WebSockets only earn
their bidirectionality once likes and comments exist.
