# Task 20: No signed token or query string reaches a log

- **Status:** refined
- **Iteration:** [9](../iteration-9.md)
- **Covers:** none

## Why

[ADR-0013](../../adr/0013-logging-conventions.md) keeps query strings out of
logs, and three places break that rule:

- The edge's `log_format` logs `$request` (`edge/nginx.conf`), and Keycloak's
  access log logs the request line. Every sign-out's
  `logout?id_token_hint=<JWT>` therefore writes a signed ID token, which
  carries the user's email and username, to two stdout logs. Search terms and
  the callback's `code` and `state` go there too.
- `frontend/lib/api/mutator.ts` puts the full URL into error messages, which
  `recordFailure` and `onRequestError` then log. The success path is stripped
  and tested, but the failure path is not.

Mobile adds a client whose sign-in and sign-out go through the same edge and
the same Keycloak, so fixing this now keeps the leak from doubling.

## Scope

No log line from the edge, Keycloak or the frontend carries a query string,
on success or on failure.

## Constraints

- [ADR-0013](../../adr/0013-logging-conventions.md) and
  [ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md):
  what is logged, and its JSON shape.
- [ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md):
  the edge's role and configuration.

**Decided at refinement, 2026-10-30** (product owner):

- **Keycloak keeps its access log, with the query string stripped from its
  pattern.** Turning it off was rejected: server-to-server calls to
  Keycloak, such as the BFF's token requests, never pass through the edge,
  so the edge's log cannot stand in for it.

## Open questions

**None.**

## Acceptance criteria

- [ ] A frontend unit test proves each failure path of the mutator logs the
      path without its query string, and it failed before the fix
- [ ] After a sign-in, a catalog search and a sign-out against the running
      stack, `docker compose logs edge keycloak` contains no `id_token_hint`,
      `code=` or search term, checked by `grep` and described in the PR
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-21.
