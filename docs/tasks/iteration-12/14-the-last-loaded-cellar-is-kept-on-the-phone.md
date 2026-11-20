# Task 14: The last-loaded cellar is kept on the phone

- **Status:** needs-refinement
- **Iteration:** [12](../iteration-12.md)
- **Covers:** DW-2

## Why

The query client lives in memory, so a cellar read once is gone at the next
launch and the Cellar tab with no signal is an error. A cellar is used where
there is none, so the cellar the app last loaded is kept and shown.

## Scope

The cellar read is persisted as [task 01](01-decision-how-the-cellar-behaves-offline.md)
decided and restored at launch, so that with the phone in airplane mode the
last-loaded cellar and its entries render. A cellar on the screen is not
replaced by an error when a refresh fails; the error appears only where there is
nothing to show. The cache is discarded when the viewer changes, when the user
signs out, and when the build that wrote it is not the build that reads it.

## Non-goals

- Telling the user they are offline or how old the data is —
  [task 15](15-the-app-knows-when-it-is-offline.md).
- Keeping anything but the cellar: the catalog, the feed and a beer's page are
  not cached.
- Writes made offline — refused by [task 16](16-a-write-attempted-offline-says-so.md).

## Constraints

- **The previous viewer's cellar must never show for the next.** The existing
  guarantee is that the query client resets on a change of viewer, so a hook
  needs no guard of its own
  ([mobile conventions](../../../mobile/CONVENTIONS.md)); a cache on disk
  survives that reset, and a cache restored before the app knows who is signed
  in is the case that fails silently. The cache belongs to one viewer, is
  checked against the current one before it is shown, and is wiped on sign-out.
- Tokens never enter the cache
  ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).
- The decision of task 01 binds the storage, the lifetime and the discard rules;
  its list of implied tests is carried into the criteria below at refinement.
- The generated shape can change across builds
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md));
  a cache from another build is abandoned, never read as the new shape.
- **A persistence package is a new dependency** if the decision picks one:
  asked about, with its version, before it is used
  ([`CLAUDE.md`](../../../CLAUDE.md)).
- A cache that fails to read or write leaves the app working with an empty one
  and logs it ([ADR-0098](../../adr/0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)).

## Open questions

- **A cold start with no signal.** The token store keeps the user signed in
  when a refresh fails for a reason other than a refusal; this task shows that
  the app then reaches the cellar signed in and not the sign-in invitation, and
  whether that needs a change to the token store.
- **When the cache is written** — after each successful read, or on the app
  going to the background — and how much of a hit that is for a large cellar.
- **What a sign-out does to the cache of a user who signs back in** as the same
  person: wiped, as the guarantee is simplest, or kept.

## Acceptance criteria

- [ ] A component test shows a cellar restored from the cache rendering with
      every request failing, entries included, and an error shown only where
      there is no cache
- [ ] A test shows the cache discarded on sign-out and on a change of viewer, and
      one viewer's cache never rendered for another, including when it is
      restored before the token store has answered
- [ ] A test shows a cache written by another build abandoned rather than
      read, and an unreadable cache leaving the cellar empty and logged
- [ ] A test shows no token or credential in what is written
- [ ] The cellar renders on Android with the emulator in airplane mode after
      a cold start, and was confirmed to fail with the cache off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 12's plan](../iteration-12.md) ("Persisted cache and
offline state"). The "renders in airplane mode" check on an iPhone is
[task 18](18-the-cellars-flows-run-end-to-end-on-both-platforms.md)'s.
