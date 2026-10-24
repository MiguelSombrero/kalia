# Task 16: A failure on the server can be seen and counted

- **Status:** refined
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

Kalia logs, but nothing can be counted or followed across tiers. The backlog
names the gap ("Observability: structured logs, metrics, tracing") and one
failure it hides: **a failing token refresh is silent.**
`frontend/lib/auth/refreshAccessToken.ts` returns `unavailable` and the caller
sends no token, so a Keycloak outage looks exactly like ordinary anonymous
browsing — nothing logs, nothing counts it
([ADR-0029](../../adr/0029-silent-token-refresh.md)). It was deliberately not
fixed with one log line, because without metrics an outage would stay
invisible anyway.

[Iteration 10](../iteration-10.md) adds crash reporting on the phone, within
the no-cost constraint. A crash that cannot be matched to what the server saw
for the same request is half a report.

## Scope

The backend and the frontend server write structured logs that carry one
request id end to end. A small set of counters — refresh failures, 5xx by
route, event-publication failures — can be read from each. A failing refresh
logs and counts. What a developer runs locally to look at these is documented.

## Non-goals

- A hosted monitoring service or alerting — there is no deployment, and the
  plan adds no cost.
- Mobile crash reporting — iteration 10.

## Constraints

- [ADR-0013](../../adr/0013-logging-conventions.md): SLF4J via `@Slf4j`,
  parameterised, levels by meaning.
- `frontend/lib/logger.ts` is the only place that may call `console.*`
  (ESLint `no-console`) — it is the seam this task routes through.
- `ACTUATOR_ENDPOINTS` defaults to `health`; everything but `health` needs a
  token (`backend/README.md` Configuration).
- No new cost; any new dependency or container is a version question for the
  product owner.

**Decided at refinement, 2026-10-24** (product owner):

- **Built-in tooling, no viewer:** Spring Boot's structured JSON logging, Micrometer with a Prometheus-format endpoint behind a token, and a JSON logger in the frontend through `lib/logger.ts`. Nothing is added to the stack to view them. OpenTelemetry with a local viewer and logs-only were rejected.
- **W3C `traceparent` propagation** from the BFF to the backend, with Micrometer Tracing putting its ids in backend logs, so a later tracing backend needs no change. A bespoke request-id header was rejected.
- **Dependency versions:** the backend's come from the Spring Boot BOM; the implementer proposes the frontend metrics library and version from authoritative output, and the product owner confirms in the PR.
- **Recorded in a new ADR**, with ADR-0013 amended where logging changes.

## Open questions

**None.**

## Acceptance criteria

- [ ] A backend request and the frontend request that caused it log the same
      request id — an integration test asserts the header is propagated and
      logged
- [ ] A refresh that fails increments a counter and logs at `WARN` — a vitest
      test, closing the backlog item
- [ ] The chosen counters are readable from the backend's metrics endpoint
      behind a token — an integration test
- [ ] How to view logs and counters locally is in the READMEs, and `make
      verify` is green

## Notes

Provenance: [backlog](../backlog.md) "Observability: structured logs, metrics,
tracing" and "A failing token refresh is silent".
