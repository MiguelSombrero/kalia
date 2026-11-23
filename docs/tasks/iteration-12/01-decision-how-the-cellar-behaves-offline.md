# Task 01: Decide how the cellar behaves offline

- **Status:** done
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
- why `GET /api/v1/cellar` stays whole, bounded by task 19's cap, measured on
  a large cellar;
- the signal that reopens the decision.

The ADR lists each test its choice implies, which tasks 14–17 carry in their
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

**Decided at refinement, 2026-11-22** (product owner):

- **A persisted read cache, with writes refused rather than queued.** Offline
  writes with a sync, and a read cache now with a sync later, are the rejected
  alternatives the ADR records.
- **The cache lives in `AsyncStorage`, unencrypted,** relying on the phone's own
  storage protection: it holds no token, belongs to one viewer, and is wiped on
  sign-out ([task 14](14-the-last-loaded-cellar-is-kept-on-the-phone.md)).
- **It is shown however old it is, with its age always visible**
  ([task 13](13-design-the-cellar-offline-and-a-write-that-fails.md),
  [task 15](15-the-app-knows-when-it-is-offline.md)).
- **`GET /api/v1/cellar` stays whole, bounded by the write cap** that
  [task 19](19-a-cellar-has-a-size-limit-the-server-enforces.md) adds next: 2,000
  bottles in a cellar. The ADR records why the read is not paged; the measurement covers
  a cellar at the cap.
- **The revisit trigger:** a user reports a write they could not make offline
  and then lost or forgot, or the product owner asks. Kalia has one user today,
  so a number would be invented.
- **An offline cold start already reaches the cellar signed in:** the token
  store loads the stored tokens with no network, and a refresh that fails on the
  network does not sign the user out (`mobile/src/lib/auth/tokenStore.ts`). The
  ADR states it and task 14 tests it.
- **A write that was sent and whose answer never arrives is "not confirmed",
  never "not saved"** ([task 16](16-a-write-attempted-offline-says-so.md)).
- These answers came before the ADR, so tasks 13–17 were refined against them
  in the same pull request; the ADR records them and their reasoning.

## Open questions

**None.**

## Acceptance criteria

- [x] An ADR records the choice, the cache's storage, viewer binding, lifetime
      and discard rules, the revisit trigger and the rejected alternatives, and
      passes `node scripts/check-adrs.mjs`
- [x] The ADR records the size of `GET /api/v1/cellar` for a cellar of a
      hundred beers and a thousand bottles and for one at the 2,000-bottle cap,
      measured with a throwaway that is not committed
- [x] The ADR lists each test the decision implies, and each is among tasks
      14–17's acceptance criteria; one that is not is raised with the product
      owner before the ADR merges
- [x] The architecture note on the uncapped read and the backlog's sixth
      decision each point to the ADR, and `node scripts/check-links.mjs` is
      green
- [x] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Decision: offline
behaviour").
