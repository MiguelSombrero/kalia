# Task 16: Signing in or out clears what the last viewer saw

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** none

## Why

The app's catalog first page is cached under `["catalog", "beers", "first-page"]`
(`mobile/src/features/catalog/hooks/useBeers.ts`), a key that names no viewer,
though the backend adds the caller's own pending beers to that page
([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)).
`signIn` and `signOut` in `mobile/src/lib/auth/tokenStore.ts` never touch the
query client. User A signs out, B signs in within the 60 s `staleTime`, and B's
Catalog tab shows A's pending suggestion; a user who just signed in does not see
their own. Only `useMyProfile` guards against this today.

[Task 09](09-catalog-search-and-list.md) multiplies the problem: search and
filters cache many queries, each viewer-dependent, and a screen that caches by
query will cache by whoever asked.

## Scope

Whatever the app has cached for one viewer is gone, or unreachable, when another
signs in or the first signs out — on every path that ends a session, not only the
button.

## Non-goals

- Persisting the cache across launches; that is [iteration 12](../iteration-12.md)'s
  decision.
- The web, which renders on the server per request.

## Constraints

- Tokens live only in `expo-secure-store`, never in a query cache
  ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md));
  nothing viewer-specific enters the cache keyed by something that outlives the
  viewer.
- Reads go through a feature-owned hook
  ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)).

## Open questions

- **Functional scope.** Clear the whole query client on every sign-in and
  sign-out, or only the queries that depend on the viewer, or key them by
  viewer.
- **Edge cases.** A session that ends without the button — a refresh token the
  server no longer accepts — and whether it takes the same path as a sign-out.
- **Edge cases.** A request in flight when the viewer changes, and whether its
  answer may land in the new viewer's cache.

## Acceptance criteria

- [ ] A test signs A out and B in inside the `staleTime` and shows B's catalog
      holding none of A's pending beer; it failed before the change
- [ ] A test shows a user who has just signed in seeing their own pending beer
      on the first page, not a stale one
- [ ] A test shows a forced sign-out, from a refresh the server refuses, clearing
      the same
- [ ] A test shows a response that arrives after the viewer changed not entering
      the new viewer's cache
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-106. Runs before
[task 09](09-catalog-search-and-list.md) so the search's cache is built on the
fix.
