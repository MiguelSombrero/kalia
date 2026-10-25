# ADR-0088: Both tiers log JSON and share a W3C trace id, and failures are counted with built-in tooling and no viewer

- **Status:** accepted
- **Date:** 2026-10-25

## Context

[ADR-0013](0013-logging-conventions.md) made "structured" a written
convention, not a wire format, and deferred request-level logging until
something could stitch a request's lines back together. Nothing could: the
backend and the frontend server each logged plain text with no shared
identifier, and nothing was counted. The gap has a name in the backlog — **a
failing token refresh is silent** ([ADR-0029](0029-silent-token-refresh.md)):
a Keycloak outage looks exactly like anonymous browsing, and a single log line
was not worth adding while nothing could count or follow it.

[Iteration 10](../tasks/iteration-10.md) adds crash reporting on the phone,
where a crash that cannot be matched to what the server saw for the same
request is half a report. The plan adds no cost, there is no deployment to
host a monitoring service, and the iteration's own acceptance is that a
developer can see a failure locally.

## Decision

Both tiers write one JSON object per log line, the BFF forwards a W3C
`traceparent` header so a backend log line and the frontend line for the same
browser request carry the same trace id, and failures are counted by Micrometer
in the backend and `@prometheus-io/client` in the frontend, each readable from a
token-protected Prometheus-format endpoint — with nothing added to the stack to
view any of it.

- **Logs:** the backend uses Spring Boot's structured logging in the ECS
  format on stdout in every environment; the frontend's `lib/logger.ts` writes
  the equivalent on the server and leaves the browser console alone. A log
  field never holds a token, a password, a request body or a query string
  ([ADR-0013](0013-logging-conventions.md)).
- **Request id:** it is the W3C trace id. `proxy.ts` starts or keeps one per
  browser request, every backend call made while serving it forwards that
  header unchanged, and Micrometer Tracing puts the id in the backend's log
  context. Tracing is context only: no exporter, so nothing leaves the process
  and a tracing backend can be added later without touching either tier.
- **One request log per tier:** the backend logs each request once at `INFO`
  (method, path, status, duration; the readiness probe at `TRACE`) from a
  single filter, and the frontend logs each backend call the same way. The
  convention in ADR-0013 against per-method entry/exit logging stands.
- **Counters:** refresh failures by outcome and reason, backend calls that
  failed or answered 5xx, requests Next.js failed by route template (the
  frontend), `http.server.requests` by outcome and route template (the
  backend, from Spring Boot), and event publications retried and given up on.
  Labels are closed sets or route templates, never a URL, a user or an id.
- **Exposure:** the backend's `prometheus` endpoint follows the existing
  `ACTUATOR_ENDPOINTS` rule (off unless listed, and a bearer token like every
  actuator endpoint but `health`). The frontend's `/api/metrics` does not exist
  unless `METRICS_TOKEN` is set, and then needs that token. Compose enables
  both for local development only.

This does not add a hosted monitoring service, alerting, a log shipper or a
dashboard, and does not cover mobile crash reporting.

## Alternatives considered

- **OpenTelemetry with a local viewer** (a collector plus Grafana, Tempo or
  Jaeger in `docker-compose.yml`). Rejected: it adds containers and version
  choices to a stack that exists to be started on a laptop, and the questions
  the iteration asks — what failed, how often, which request — are answered
  without a viewer. The `traceparent` header and the Micrometer bridge are the
  parts that would be kept, so this stays reachable.
- **Logs only, no metrics.** Rejected: the silent refresh failure is a
  *rate* question (is it one user's expired session or every user's Keycloak
  outage), which a line in a log answers only by someone reading all of them.
- **A bespoke request-id header** (`X-Request-Id`). Rejected: it carries the
  same information as `traceparent` but speaks to no tracing library, so
  adopting a tracing backend later would replace it everywhere.
- **The OpenTelemetry bridge for Micrometer Tracing instead of Brave.**
  Not chosen: both produce the same ids and propagate the same header, and
  nothing here depends on which. Brave was picked without a measured reason;
  swapping the bridge is a dependency change, not a redesign.
- **`prom-client` instead of `@prometheus-io/client`.** Rejected: npm marks
  `prom-client` deprecated ("replaced by `@prometheus-io/client`"), the same
  repository's successor, and its API is the one used here.
- **Hand-written counters and exposition format in the frontend instead of
  a client library.** Rejected: the text format is small, but escaping, label
  ordering and `# TYPE` lines are exactly what a library gets right once.
- **Tomcat's access log for the backend request line.** Rejected: it runs
  outside the observation scope, so it cannot carry the trace id.
- **A log level switch between JSON and plain text for local reading.**
  Rejected: two formats means the one nobody runs locally rots. `jq` reads the
  JSON, and `backend/README.md` and `frontend/README.md` show how.

## Consequences

- Good, because a failing refresh, a backend 5xx and a retried event are
  counted and a request can be followed from the browser's request through the
  BFF to the backend by one id.
- Good, because the decision adds no container and no cost, and every piece
  that would be needed for a real tracing or metrics backend is already in
  place.
- Bad, because local logs are JSON: a developer reads them through `jq` or a
  pretty-printer rather than directly.
- Bad, because the counters are per process and reset on restart, with no
  aggregation across instances; a deployment that wants history has to bring a
  scraper.
- Bad, because the backend's token-protected endpoint cannot be scraped by a
  stock Prometheus without a Keycloak client for it; a local developer copies a
  token from Swagger UI instead. That is a deployment question this decision
  leaves open on purpose.
- Neutral, because `@prometheus-io/client` is at 0.16, so a minor release may
  change its API; it is the Prometheus project's own successor to the
  deprecated `prom-client`, and the use here is a registry and three counters.
- Neutral, because every request now writes an `INFO` line, which ADR-0013 had
  withheld until a request could be reassembled; the backend's per-environment
  `LOG_LEVEL` still controls it.
- **Revisit trigger:** a deployment target exists, or a hosted monitoring
  service is wanted — at which point the exporter, the scrape credential and
  the retention are decided together.

## Evidence

Measured on Spring Boot 4.1.1 and Next.js 16.4.1.

- Spring Boot's ECS output names the trace and span ids `traceId` and `spanId`
  (not ECS's dotted `trace.id`), and a request that arrives with a valid
  `traceparent` is logged under that trace id
  (`backend/src/test/java/fi/kalia/web/ObservabilityIT.java`).
- A request whose handler throws is still logged with status 500: the
  container turns an escaped exception into a 500 only after the request filter
  has unwound, so a filter reading `response.getStatus()` alone logs 200.
- Next.js compiles `instrumentation.ts`, server rendering and route handlers
  as separate bundles, so the registry is held on `globalThis` rather than at
  module level. Against the running compose stack with the backend stopped, a
  failed backend call (counted in the server-rendering bundle) and the
  `onRequestError` count of the page that failed (counted in the
  instrumentation bundle) both appeared at `/api/metrics`, which is served by a
  third.
- A browser request to a page logged `Backend call completed` lines in the
  frontend container and `RequestLogFilter` lines in the backend container
  under one trace id.
