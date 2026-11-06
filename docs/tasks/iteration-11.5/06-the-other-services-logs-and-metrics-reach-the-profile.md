# Task 06: The edge, Keycloak, Postgres and Valkey reach the profile too

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** DW-3

## Why

Four services Kalia does not write sit on every request's path: the edge
throttles a request before any Kalia code sees it, Keycloak issues every token,
Postgres holds every row and Valkey every web session. A `429` from the edge,
a token Keycloak refused or a connection Postgres turned away is invisible in
the backend's and the web's telemetry, or shows there only as its effect, and
`docker-compose.base.yml` notes that Keycloak's own healthcheck can report
ready before its admin API accepts credentials. Tasks
03 and 05 cover the two tiers Kalia writes; an agent that can query those and
not these still reads four more containers' stdout to find out why a request
failed before it reached the backend.

## Scope

With the profile on, the logs of the edge, Keycloak, Postgres and Valkey reach
the store, labelled by service, and each service's own health metrics — what it
offers, or what an exporter reads from it — are kept there. The edge's request
lines carry the trace id of the request they forwarded, when it had one.

## Non-goals

- Dashboards for each service.
- Tracing inside Keycloak or Postgres.
- Mailpit and the one-shot `keycloak-config` and `keycloak-seed` services,
  unless refinement says otherwise.

## Constraints

- **The edge's access log already holds a path and a client address**; it
  carries no query string or token into the store
  ([ADR-0013](../../adr/0013-logging-conventions.md),
  [ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)).
- Keycloak's logs name usernames and email addresses on failed sign-ins; what
  reaches the store is the question below, not a default.
- An exporter that needs database credentials uses a role of its own or an
  existing one, never the bootstrap superuser
  ([ADR-0100](../../adr/0100-postgres-has-three-roles-one-that-owns-the-schema-for-flyway-one-that-reads-and-writes-rows-and-one-for-keycloak.md)).
- Every exporter image is pinned and scanned
  ([ADR-0024](../../adr/0024-dependency-vulnerability-scanning.md)), and runs
  only with the profile.

## Open questions

- **Functional scope.** Which services are in, and whether each needs metrics
  or only logs.
- **Integrations.** Keycloak's built-in metrics endpoint, `postgres_exporter`,
  `redis_exporter` for Valkey, and nginx's `stub_status` or a log-derived
  count: which, and their versions.
- **Non-functional.** Whether Keycloak's lines that name a user reach the store
  at all.
- **Integrations.** Whether the edge's access log becomes JSON to carry the
  trace id, which changes what a developer reads from `docker compose logs edge`.

## Acceptance criteria

- [ ] With the profile on, a request the edge refuses with `429` is found in
      the store by service and status — verified against the running stack
- [ ] A failed sign-in's Keycloak line and a Postgres connection count are
      queryable in the store, within what refinement decided about user names
- [ ] A test in `scripts/` fails if an exporter's service runs without the
      profile, and was seen to fail with one wired in unconditionally
- [ ] The root README lists what each service sends, and `make verify-fast` is
      green
