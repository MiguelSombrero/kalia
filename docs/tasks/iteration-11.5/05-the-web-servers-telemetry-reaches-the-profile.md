# Task 05: The web server's traces, metrics and logs reach the profile

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** DW-2, DW-3

## Why

The web app's server starts or keeps a `traceparent` in `proxy.ts` and forwards
it unchanged to every backend call it makes
([ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).
That puts one trace id in both tiers' logs, but the web server records no span
of its own: a page that calls the backend three times shows, at best, three
backend spans with no parent, and the time the page spent rendering, waiting on
Valkey or refreshing a token is not visible anywhere. Its counters, behind the
token-gated `/api/metrics`, reset on every restart.

## Scope

With the profile on, the web server records a span per browser request and a
child span per backend call, so a page's backend calls sit under it in one
trace; its counters and its log lines reach the store under the same trace id.
With the profile off, it behaves as today.

## Non-goals

- Browser-side telemetry: the browser console stays alone, as ADR-0088 decided.
- Mobile telemetry ([ADR-0098](../../adr/0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)).

## Constraints

- **This Next.js postdates model training**: `instrumentation.ts`, `proxy.ts`
  and how server code is bundled are checked in `node_modules/next/dist/docs/`
  before relying on memory ([`CLAUDE.md`](../../../CLAUDE.md)). ADR-0088's
  evidence found the instrumentation, rendering and route-handler code in
  separate bundles, which is why the registry is held on `globalThis`.
- No span attribute, metric label or log field holds a token, a session id, a
  cookie or a query string ([ADR-0013](../../adr/0013-logging-conventions.md));
  a locale-prefixed path with a username in it is the question
  [iteration 11 task 17](../iteration-11/17-the-transport-logs-a-failure-only-where-a-feature-calls-it-one.md)
  settles, and its answer applies here.
- The backend call's span must forward its own context, so the backend's span
  is its child, not the request's sibling.
- `/api/metrics` and `METRICS_TOKEN` keep working as ADR-0088 describes.

## Open questions

- **Integrations.** Which SDK — Next.js's own OpenTelemetry support through a
  wrapper package, or the OpenTelemetry Node SDK directly — and its versions.
- **Integrations.** Whether the frontend's counters stay on
  `@prometheus-io/client` and are scraped, or move to OpenTelemetry metrics.
- **Edge cases.** A Server Action's request, and a token refresh made while
  serving a page: spans of that page, or their own.

## Acceptance criteria

- [ ] With the profile on, loading a cellar page in a browser produces one
      trace holding the web server's request span and, under it, a span per
      backend call with the backend's spans beneath each — verified in the
      viewer against the running stack
- [ ] A Vitest test shows that a request whose URL carries a query string or a
      session cookie exports no span attribute or log field containing either,
      and was seen to fail with the SDK's defaults
- [ ] A Vitest test shows the web server starting and serving with no exporter
      endpoint configured
- [ ] The refresh-failure and backend-failure counters are queryable in the
      store after the web container restarts
- [ ] `web/README.md` says what is exported and when, and `make verify-fast` is
      green
