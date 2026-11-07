# Task 03: The backend's traces, metrics and logs reach the profile

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** DW-2, DW-3

## Why

The backend already produces everything an agent would ask about a request:
Micrometer Tracing puts a trace id in each log line, Spring Boot counts
`http.server.requests`, and ADR-0088 added counters for retried and abandoned
event publications. All of it stays inside the process. Tracing has no
exporter, so the spans that would show where a request spent its time are
discarded; the counters reset on restart; and the log lines are readable only
from one container's stdout.

## Scope

When the profile is on, the backend's spans, its metrics and its log lines
reach the store, each carrying the same trace id, and a request's trace shows
the backend's own span with its route template and status. When the profile is
off, the backend behaves as it does today: nothing is exported, and nothing
fails or retries because no store is listening.

## Non-goals

- SQL in the trace (task 04).
- New counters or new log lines; this sends what exists.

## Constraints

- **No span attribute, metric label or exported log field holds a token, a
  password, a request body or a query string**
  ([ADR-0013](../../adr/0013-logging-conventions.md),
  [iteration 9 task 20](../iteration-9/20-no-token-or-query-string-in-a-log.md)).
  An HTTP instrumentation's default `url.full` or `http.url` carries the query
  string; the guard has to be a test, since nothing else fails.
- Labels stay closed sets or route templates, never a URL, a user or an id
  ([ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).
- The JSON log on stdout stays as it is: the profile is optional, and nothing
  else reads the logs when it is off.
- A missing store must not slow a request: the exporter is off by default and
  batches when on.
- Configuration is an environment variable, not a profile
  ([ADR-0015](../../adr/0015-configuration-strategy.md)).
- Maven runs on JDK 25 ([backend/README.md](../../../backend/README.md)).

## Open questions

- **Integrations.** Task 01's answers on the bridge (Brave or OpenTelemetry), on
  scraping or pushing metrics, and on whether logs go over OTLP or are read
  from stdout; and the versions of what they add.
- **Edge cases.** What the backend does when the profile is on and then
  stopped.
- **Non-functional.** Whether the readiness probe's spans are dropped, as its
  request line is logged at `TRACE`.

## Acceptance criteria

- [ ] With the profile on, one request to `/api/v1/beers` appears in the store
      as a trace whose backend span names the route template and status, and
      its log lines are found there by that trace id — verified against the
      running stack
- [ ] An integration test shows that a request carrying a query string
      produces no exported span attribute, label or log field containing it,
      and was seen to fail with the instrumentation's defaults
- [ ] An integration test shows that with no exporter endpoint configured the
      backend starts and answers as before, and `ObservabilityIT` still passes
- [ ] `http.server.requests` and the event-publication counters are queryable
      in the store after the backend restarts
- [ ] `backend/README.md` and ADR-0088's consequences say what is exported and
      when, and `make verify-fast` is green
