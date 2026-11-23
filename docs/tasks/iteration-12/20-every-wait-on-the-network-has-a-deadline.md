# Task 20: Every wait on the network has a deadline

- **Status:** done
- **Iteration:** [12](../iteration-12.md)
- **Covers:** none

## Why

Two waits in the shared HTTP path have no deadline, against the transport's own
promise to "bound the wait":

- **The body.** `createFetchTransport` in
  `packages/api/src/core/fetch-transport.ts` races only the `fetch(...)` promise
  against its 10 s timer. `readBody` then awaits `response.text()` with no
  limit, so a backend or proxy that sends headers and stalls mid-body hangs the
  caller, on the web and on the phone alike (COULD-144).
- **The web's token refresh.** `refreshAccessToken` calls
  `fetchViaInternalKeycloak`, a plain `fetch`, and `currentAccessToken()` awaits
  it *before* the transport's `send()`, so the timer does not cover it. A
  Keycloak that accepts the connection and never answers holds every backend
  call of a render whose token has expired. The phone bounds the same call
  (`mobile/src/lib/auth/keycloakClient.ts`); that fix, SHOULD-97, reached the
  phone only (SHOULD-121).

This iteration makes the phone's cellar the main screen, and
[task 15](15-the-app-knows-when-it-is-offline.md) and
[task 16](16-a-write-attempted-offline-says-so.md) tell the user a request
failed. A request that never fails is not offline, it is frozen, and neither
task can say anything about it.

## Scope

- The transport's deadline covers the whole response, headers and body, on both
  clients, and a body that stalls fails as the same typed error a stalled
  request does.
- The web's token refresh is bounded and, on timeout, reports `unavailable`
  like any other failure to reach Keycloak.
- Any other `fetch` in `web/`, `mobile/` or `packages/` that waits with no
  deadline is listed, and bounded or justified in a line.

## Non-goals

- Changing the 10 s default or making it configurable per call.
- Retrying a request that timed out.
- The phone's own refresh, which is already bounded.

## Constraints

- **A timeout is an `ApiError`** of an existing kind
  ([ADR-0023](../../adr/0023-typed-api-failures.md)), not a new type each caller
  must learn. A caller-initiated abort stays cancellation, not failure.
- **The timer is not an `AbortSignal`.** The transport's comment explains why:
  Next.js opts a request out of per-render memoization as soon as a signal is
  present, which would double the beer page's requests. Check
  `node_modules/next/dist/docs/` before changing it.
- **A refresh that cannot be answered must not end the session.** `unavailable`
  and `rejected` are different outcomes by design
  ([ADR-0029](../../adr/0029-silent-token-refresh.md)): ending a session over a
  Keycloak restart is a self-inflicted sign-out. The failure is counted and
  logged the way the others are
  ([ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)),
  with a `reason` from the closed set.
- A test of a deadline moves a fake clock; it does not wait on the real one
  ([iteration 11.5 task 12](../iteration-11.5/12-a-test-waits-on-a-signal-never-on-the-clock.md)).

**Decided at refinement, 2026-11-22** (product owner):

- **The deadline covers the whole response,** from sending to the last byte of
  the body, in one budget; it is not reset per chunk.
- **A refresh that times out is counted with a reason of its own, `timeout`,**
  added to the closed set; one that cannot reach Keycloak stays `network`.
- **The web's other calls to Keycloak** (its admin and back-channel paths) are
  among the waits Scope's third bullet lists, each bounded or justified there.
- **What the user is told of a write the deadline cuts off** is
  [task 16](16-a-write-attempted-offline-says-so.md)'s: not confirmed. This task
  makes the deadline hold.

## Open questions

**None.**

## Acceptance criteria

- [x] A `fetch-transport` test whose response body never completes rejects
      with the transport's timeout `ApiError` once the deadline passes, under
      fake timers. It failed before the change
- [x] A test of `refreshAccessToken` whose Keycloak never answers returns
      `unavailable`, counts the failure with reason `timeout`, and leaves the session's token and
      refresh token as they were. It failed before the change
- [x] A test shows a render with an expired token and a hung Keycloak sending
      its backend call after the deadline, with no token, not waiting on it
- [x] The pull request lists every `fetch` in the repository found with no
      deadline and what was done about each
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-121 and COULD-144.
