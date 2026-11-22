# Task 19: A cellar has a size limit the server enforces

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** none

## Why

Nothing bounds a cellar. `GET /api/v1/cellar` answers every entry, uncapped —
[`docs/architecture.md`](../../architecture.md) "Trade-offs made explicit"
accepts that "until iteration 12" because the offline cache needs the whole
cellar. The write side has no cap either: `Entry.addBottles` keeps no total, and
`AddBottleRequestDto`'s `MAX_QUANTITY = 24` limits one request, not an account.
One account can therefore make every cellar read, and every add (which loads the
whole entry aggregate), arbitrarily expensive.

This iteration is where it stops being a server-side cost only. The phone keeps
the last-loaded cellar whole ([task 14](14-the-last-loaded-cellar-is-kept-on-the-phone.md)),
so an unbounded cellar is also unbounded storage and a slower first paint on the
device. And once the apps write to the cellar, a limit added later is a new
refusal that installed apps do not know how to show
([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
The limit is cheapest to add before the first client that writes ships.

## Scope

- The server refuses an add that would take a cellar past a documented limit,
  with a documented answer of its own, on both the add that creates an entry
  and the add that only raises an existing entry's bottles.
- The limits' shape and numbers are settled at refinement; what is decided is
  that the writes are capped and the read stays whole, bounded by the cap.
- The web's add-bottle form shows the refusal in `en` and `fi`. The phone's
  form ([task 08](08-a-user-adds-bottles-of-a-beer-from-its-page.md)) reads the
  same documented answer.
- `docs/architecture.md`'s "uncapped" trade-off is amended to say what bounds
  the read.

## Non-goals

- Paging `GET /api/v1/cellar`. Decided against: the offline cache needs the
  whole cellar, and a page would only move the cost into the client.
- A limit per client address, which the edge already applies
  ([ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)).
- Anything about the public cellar's own paging, which exists.

## Constraints

- **The API is additive only while an app is installed** (ADR-0093). The refusal
  is a new documented response, and a client falls back on a status it does not
  know
  ([iteration 11 task 18](../iteration-11/18-a-client-falls-back-on-an-enum-value-it-does-not-know.md)).
- **An anticipated refusal gets its documented answer,** not a `500`
  ([iteration 11 task 20](../iteration-11/20-an-anticipated-failure-gets-the-documented-answer.md)).
- **Two concurrent adds by one user must not both pass the limit.** The
  contribution cap serialises them with an advisory lock before the count is
  read
  ([ADR-0102](../../adr/0102-a-suggestion-is-a-pending-beer-with-its-new-brewery-and-an-admin-reviews-it-inside-catalog-which-publishes-one-event-per-decision.md));
  a test forces the interleaving
  ([iteration 11 task 14](../iteration-11/14-concurrency-tests-force-the-interleaving-they-check.md)).
- **A cellar already over a new limit still reads, edits and removes.** The
  limit refuses growth only.
- The cellar read is joined with its beers in the backend
  ([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)).
- **Decided when the finding was lifted (2026-11-22):** cap the writes; do not
  page the read; do not accept it as is.

## Open questions

- **Functional scope and data model.** What is counted — beers in the cellar,
  bottles in all, or both — and the numbers. Does an add that only raises an
  existing entry count against the bottle limit alone?
- **Interaction and UX.** What a user reads when the limit refuses them, in
  `en` and `fi`, and whether it says how far over they would have gone.
- **Edge cases.** What happens to a cellar already over a limit; and what the
  quantity field does when only some of the requested bottles would fit.
- **Module boundaries.** An amendment to ADR-0083, or the limit documented in
  `docs/architecture.md` alone?

## Acceptance criteria

- [ ] A backend integration test shows an add that would exceed each limit
      refused with its documented status and an add up to the limit accepted. It
      failed before the change
- [ ] A backend test forces two adds interleaving at one bottle below the limit
      and shows the total never passing it
- [ ] A test shows a cellar already over the limit still read, edited and
      removed from
- [ ] The committed OpenAPI spec lists the new response, and the breaking-diff
      check passes
- [ ] A web component test shows the add-bottle form's message for the refusal,
      in `en` and `fi`
- [ ] `docs/architecture.md` no longer calls the read uncapped
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-123
(`[needs decision]`, settled when lifted).
