# Task 01: Decide how the cellar behaves offline

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-4

## Why

A cellar is used in a cellar, which is where there is no signal. The backlog
named this the sixth decision a mobile client forces and parked it for this
iteration ([backlog](../backlog.md#decisions-to-make-when-mobile-begins)), and
[architecture.md](../../architecture.md) carries `GET /api/v1/cellar` as
uncapped "for the offline cache", to be revisited now.

Nothing on the phone survives a launch today: the query client lives in memory,
resets on every change of viewer, and the cellar tab is a placeholder. Every
task that follows builds on one of three shapes — a persisted read cache, a
read cache with writes deferred, or offline writes that sync later — and they
differ by an order of magnitude in what has to be built and in what can go
wrong, so the choice is made once, before any of it.

## Scope

An ADR records how the cellar behaves with no signal and why:

- what the device keeps (the whole cellar, joined with its beers as
  [ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)
  returns it), where, for whom, for how long, and when it is thrown away;
- what a write does with no signal;
- whether `GET /api/v1/cellar` stays uncapped, measured on a large cellar;
- the signal that reopens the decision.

The ADR lists each test its choice implies, for tasks 14–17 to carry into their
acceptance criteria.

## Non-goals

- Building any of it — tasks [14](14-the-last-loaded-cellar-is-kept-on-the-phone.md)
  to [17](17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md).
- Offline catalog search or an offline beer page; the catalog needs the server.
- Public cellars and the feed, which are [iteration 13](../iteration-13.md)'s.

## Constraints

- [DW-3](../iteration-12.md#done-when) says a write attempted offline "tells the
  user so rather than failing silently". That already presumes writes are
  refused rather than queued; the decision confirms or reopens the presumption
  instead of discovering it.
- **Kalia adds no cost** ([`CLAUDE.md`](../../../CLAUDE.md)): no hosted sync
  service, and nothing paid in the persistence it picks.
- A change of viewer resets the whole query client, so a hook caching
  viewer-dependent data needs no guard of its own
  ([mobile conventions](../../../mobile/CONVENTIONS.md)). A cache on disk
  outlives that reset, so the guarantee has to be re-made for it; the previous
  viewer's cellar must never show for the next. Tokens stay in
  `expo-secure-store` and never in a cache
  ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).
- The API is additive-only while an app is installed
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)),
  and a cache written by one build is read by the next, so a cached shape needs
  a way to be abandoned.
- A new dependency is asked about, not researched
  ([`CLAUDE.md`](../../../CLAUDE.md)); the decision lists the ones it implies.

## Open questions

- **Which of the three.** A persisted read cache with writes deferred, offline
  writes with sync, or a read cache now and sync later. The sweep recommends
  the first: DW-3 presumes it, and a sync needs conflict rules and idempotent
  writes the API does not have. Is that the choice?
- **The revisit trigger.** What would make offline writes worth building — a
  second user, a report of a bottle lost to a refused write, a number?
- **Where the cache lives and how private it is.** `AsyncStorage` is already in
  the app; a database or a file are the alternatives. A private cellar then
  sits unencrypted on the phone. Is that acceptable, given that the phone's
  own storage protection applies?
- **How old a cache may be shown.** Indefinitely, with its age visible, or only
  for a limit after which the screen asks for a connection?
- **Does the cap on `GET /cellar` stay off.** A cellar has no overall limit
  today, only twenty-four bottles per add. If the read is too large to
  re-fetch on a phone, capping it is a breaking change under ADR-0093; what
  size is "too large"?
- **Whether sign-in itself survives a cold start with no signal.** The token
  store leaves the user signed in when a refresh fails for any reason but a
  refusal; the decision confirms the offline cold start reaches the cellar
  signed in, or records what it does instead.

## Acceptance criteria

- [ ] An ADR records the choice, the cache's storage, viewer binding, lifetime
      and discard rules, the revisit trigger and the rejected alternatives, and
      passes `node scripts/check-adrs.mjs`
- [ ] The ADR records the size of `GET /api/v1/cellar` for a cellar of a
      hundred beers and one of a thousand bottles, measured with a throwaway
      that is not committed
- [ ] The ADR lists each test the decision implies, for tasks 14–17's
      refinement to carry into their acceptance criteria
- [ ] The architecture note on the uncapped read and the backlog's sixth
      decision each point to the ADR, and `node scripts/check-links.mjs` is
      green
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Decision: offline
behaviour").
