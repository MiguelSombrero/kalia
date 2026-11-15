# Task 06: The edge, Keycloak, Postgres and Valkey reach the profile too

- **Status:** refined
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
- Mailpit and the one-shot `keycloak-config` and `keycloak-seed` services.

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
- **Decided at refinement (2026-11-15):**
  - All four services are in, for both logs and metrics. Their logs come
    through the shipper that [task 01](01-decision-the-local-observability-stack.md)
    chose. Mailpit and the one-shot `keycloak-config` and `keycloak-seed`
    services stay out.
  - The metrics come from:
    - Keycloak's built-in metrics endpoint;
    - `postgres_exporter`, on a role of its own granted `pg_monitor`. That
      is a fourth role, so ADR-0100 is amended. The role is created by the
      profile alone, so the deployable stack gains nothing; if that cannot be
      done, the task stops and is re-refined rather than adding the role to
      the base;
    - `redis_exporter` for Valkey;
    - the edge's own access log, counted by status and service in the store,
      so no `stub_status` and no exporter.

    Their versions come from task 01's batched question.
  - Keycloak's lines reach the store with their username and email fields
    redacted by the shipper. A failed sign-in is still found by its event
    type, client and time.
  - The edge's access log becomes JSON, like both tiers' logs, and carries
    the request's trace id when it has one. A browser request has none at
    the edge, because `proxy.ts` starts it later. The path stays the route
    template from iteration 11 task 17's path map, and `docker compose logs
    edge` is read through `jq`, which the root README says.

## Open questions

**None.**

## Acceptance criteria

- [ ] With the profile on, a request the edge refuses with `429` is found in
      the store by service and status — verified against the running stack
- [ ] A failed sign-in's Keycloak line and a Postgres connection count are
      queryable in the store, and the Keycloak line holds neither the username
      nor the email it was given — verified against the running stack
- [ ] A test in `scripts/` runs the shipper's redaction on a recorded
      Keycloak failure line and finds neither field, and was seen to fail
      without the rule
- [ ] A request from the app carrying a `traceparent` is found by its trace
      id in the edge's line and in the backend's
- [ ] A test in `scripts/` fails if an exporter's service runs without the
      profile, and was seen to fail with one wired in unconditionally
- [ ] The root README lists what each service sends, and `make verify-fast` is
      green
