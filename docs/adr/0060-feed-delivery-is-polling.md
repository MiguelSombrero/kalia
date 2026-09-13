# ADR-0060: The front-page feed reaches an already-open browser by polling, not a stream

- **Status:** accepted
- **Date:** 2026-09-13

## Context

[Iteration 7](../tasks/iteration-7.md) builds a front page that shows recent feed
events, but tasks 01–03 describe a page that is rendered once and goes stale
the moment it is delivered. The product vision's second half — the page
updates as things happen, with no reload — is not a detail of the front-page
task: it decides whether the backend grows a kind of endpoint it has never
had, whether the frontend grows a kind of route it has never had, and how
many open connections a stranger can make Kalia hold. Four structural facts
make this ADR-shaped rather than a preference:

- **The browser never calls Spring directly**
  ([ADR-0003](0003-bff-pattern.md)). Any transport that holds a connection
  open holds it twice — browser to Next.js, Next.js to Spring — so every
  visitor costs a connection in two processes, not one.
- **A connection registry would live in one JVM's memory.** Spring
  Modulith's application events are in-process, so a second backend instance
  would never learn of the first instance's `BottleAdded`, and its connected
  visitors would never see it. Nothing is deployed today and nothing runs
  more than one instance ([backlog](../tasks/backlog.md) — deployment target
  + IaC), so an instance-affinity limitation, if taken on, has to be accepted
  in writing now rather than discovered later.
- **The connection would be anonymous and unbounded.** `GET /api/v1/feed`
  serves every caller identically, signed in or out
  ([architecture.md §4](../architecture.md#4-api-design)), and nothing in
  the stack rate-limits a caller
  ([backlog](../tasks/backlog.md) — public API exposure). A held connection
  is more expensive to shed than a request that ends on its own.
- **Delivery is at-least-once whatever the transport is chosen.** Spring
  Modulith's event publication registry redelivers
  ([architecture.md §3](../architecture.md#3-backend-modules)), and a
  reconnecting client re-asks for a window it may already partly hold. Every
  option therefore needs the page to recognise an event it already has —
  a property of the event's own identity, decided once rather than per
  transport.

This Next.js version (16.3.3) postdates model training, so the two paths a
route can take were verified against the docs shipped with it rather than
assumed: `node_modules/next/dist/docs/01-app/02-guides/streaming.md`
("Streaming in Route Handlers") shows that a Server-Sent Events endpoint is a
`route.ts` returning a raw `ReadableStream` — genuinely a third kind of route
handler, not a variation on the two `app/api/` handlers that exist today
(Auth.js's own OIDC routes, and the deliberately unauthenticated
backchannel-logout callback — [architecture.md §5](../architecture.md#5-frontend-design)).
`node_modules/next/dist/docs/01-app/02-guides/single-page-applications.md`
independently names "a library such as SWR or TanStack Query" as the
documented tool once a Client Component needs "focus revalidation, polling,
mutations, or request deduplication" — exactly TanStack Query, already this
app's mandatory client-data layer ([ADR-0008](0008-tanstack-query.md)).

## Decision

**The feed reaches an already-open browser by polling: a client component
re-reads the feed on an interval, through a Server Action, over the "since"
cursor contract [task 06](../tasks/iteration-7/06-feed-increments.md)
builds.** No server-sent events, no WebSocket, no new kind of route handler,
no CSP change.

- **Latency target: at most 60 seconds** from an event being recorded to a
  focused page showing it, stated as a number so a reader can tell whether
  the built thing meets it. [Task 09](../tasks/iteration-7/09-feed-and-private-cellars.md)
  is why sub-second push would buy nothing here: only a currently-public
  cellar contributes a line, `cellar_public` defaults to `false`, so this
  page realistically changes hours apart, not seconds.
- **No connection-holding endpoint is built.** The client's read goes through
  a Server Action ([ADR-0040](0040-client-reads-via-server-actions.md)), a
  same-origin POST Next.js already generates the wire format for — not a new
  `app/api/` route. `frontend/lib/config/cspHeader.ts`'s `connect-src 'self'`
  already covers it; nothing in `next.config.ts` changes.
  [Architecture.md §5](../architecture.md#5-frontend-design)'s route-handler
  inventory therefore still lists exactly two.
- **The single-instance limitation disappears rather than being accepted.**
  No instance holds subscriber state under polling, so a second backend
  instance needs nothing extra the day one exists.
  [Architecture.md §8](../architecture.md#8-trade-offs-made-explicit)'s
  statement that this stack's Valkey is the frontend's session store, not
  backend infrastructure, stands unchanged — nothing here reaches for
  PostgreSQL `LISTEN/NOTIFY` or a broker either.
- **Polling pauses while the tab is hidden and catches up on focus.** An
  event does not have to reach a backgrounded tab, a sleeping phone, or a
  laptop that was shut — Kalia is "the page keeps itself current while you
  read it," not a notification system. The catch-up path this requires is
  the same one a reconnect needs anyway, so pausing adds no code that was
  not already necessary.
- **De-duplication is by the event's own identity**, carried in
  [task 06](../tasks/iteration-7/06-feed-increments.md)'s cursor ordering
  (`feed.line.sequence_number`, already reserved as a strictly increasing
  column — [architecture.md §3](../architecture.md#3-backend-modules)) —
  decided once, at the event, rather than re-decided per transport.
- **The seam is kept.** The page subscribes through one feature-owned hook
  ([ADR-0041](0041-tanstack-query-feature-owned-hooks.md)), so a later swap
  from polling to a stream is a frontend-internal change, not an API
  contract change. This costs nothing extra now — the hook already exists
  for the read itself — and is unavailable to add after the fact.
- **Retention is unbounded; the served window is not.** Every row is kept;
  the API serves only events newer than a stated window — 30 days,
  matching [task 06](../tasks/iteration-7/06-feed-increments.md) — and a
  cursor older than that answers *start over* rather than a partial result,
  because that is the only answer that lets a client know it has a hole. No
  deletion job exists or is needed.
- **Likes and comments do not enter this decision.** They are
  [backlog](../tasks/backlog.md) work and did not earn bidirectionality
  here; a transport chosen for one direction is not wrong for one direction,
  and the hook seam above is what would make a later WebSocket a contained
  change if that work ever lands.

This is a decision about *transport only*. It does not build anything:
the server side is [task 06](../tasks/iteration-7/06-feed-increments.md) and
the browser side is [task 07](../tasks/iteration-7/07-live-front-page.md).
Task 06 proves the ordering and cursor half of this decision with an
integration test that commits two events out of timestamp order and confirms
a cursor taken between the commits still delivers both (already in its own
acceptance criteria). Task 07 proves the client half: a test driving a
visibility change confirms polling stops while the tab is hidden and resumes,
catching up on the current cursor, once it is focused again (also already
named in that task's own acceptance criteria).

## Alternatives considered

**Server-Sent Events**, from a Route Handler proxied through Next.js. Sub-
second latency and no polling waste on a quiet feed. Rejected on all four
structural terms: it holds a connection in both processes rather than
sending a request that ends
([ADR-0003](0003-bff-pattern.md)); a connection registry tracking who is
subscribed lives in one JVM's memory, so a second backend instance would
need `LISTEN/NOTIFY` or a broker to exist before it could be deployed at
all; the connection is anonymous, unbounded and held open for as long as a
tab stays on the front page, with no rate limiting anywhere in the stack to
shed it; and it still delivers at-least-once on reconnect, so it buys no
relief from the de-duplication requirement either. It is also a new kind of
`app/api/` route handler — a `ReadableStream` response
(`node_modules/next/dist/docs/01-app/02-guides/streaming.md`) — where today
there are exactly two, of a different shape (Auth.js's own routes). Worth
revisiting if the latency target ever needs to be seconds rather than tens
of seconds, or if the front page is meant to feel like news arriving rather
than a page that stays current while read.

**WebSocket.** Same four costs as Server-Sent Events, for a bidirectional
channel this direction does not need — the feed is read-only until likes or
comments exist, and those are backlog work with no design yet. Its
bidirectionality would only pay for itself once a mutation needs to travel
browser-to-server on the same connection.

**Push notifications to a closed app.** A different problem — reaching a
visitor with no tab open at all — needing a per-user feed and device
registration, not a delivery mechanism for a page already on screen. Kept in
the backlog rather than folded into this decision.

## Consequences

- Good, because no new transport, route-handler kind, CSP directive,
  instance-affinity mechanism or new dependency is needed — the client reuses
  the Server Action / TanStack Query shape [ADR-0040](0040-client-reads-via-server-actions.md)
  and [ADR-0041](0041-tanstack-query-feature-owned-hooks.md) already
  established, and [task 06](../tasks/iteration-7/06-feed-increments.md)'s
  "since" contract is the same one the first page's pagination already needs.
- Good, because the single-instance limitation the Context describes as a
  real risk under a stream never has to be accepted or solved: polling holds
  no subscriber state anywhere.
- Bad, because latency is bounded by the poll interval, not by how fast an
  event can be pushed — a visitor can wait up to the target 60 seconds to see
  something that already happened. Acceptable only because
  [task 09](../tasks/iteration-7/09-feed-and-private-cellars.md)'s decision
  makes this page change on the order of hours, not seconds, in practice.
- Bad, because every open tab costs one request per poll interval even when
  nothing has changed — a cost a stream would not carry on a quiet feed.
  Accepted for the same reason as the latency trade above: this feed is
  realistically quiet.
- **Revisit trigger:** the latency target moves from "tens of seconds" to
  something a visitor would notice missing, or a bidirectional feature
  (likes, comments) lands and makes a persistent connection pay for itself
  in both directions at once. Either fires the seam this decision explicitly
  paid to keep.

## Evidence

Verified against Next.js 16.3.3's bundled docs rather than assumed:

- `node_modules/next/dist/docs/01-app/02-guides/streaming.md`, "Streaming in
  Route Handlers" — a Server-Sent Events endpoint is a `route.ts` returning a
  `new Response(readableStream, ...)`, confirming it is a new kind of route
  handler and not an extension of an existing one.
- `node_modules/next/dist/docs/01-app/02-guides/single-page-applications.md`
  — "When a Client Component needs focus revalidation, polling, mutations,
  or request deduplication, use a library such as SWR or TanStack Query,"
  naming polling through the client-data layer this app already has as the
  documented pattern, not a workaround.
- `frontend/lib/config/cspHeader.ts` — `connect-src 'self'` already covers a
  same-origin Server Action POST; no header changes on this branch.
