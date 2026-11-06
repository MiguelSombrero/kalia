# Task 01: Decide the local observability stack and how an agent reads it

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** DW-6

## Why

[ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)
gave both tiers JSON logs, a shared W3C trace id and Prometheus-format
counters, and nothing to store or view them in. That answered iteration 10's
question — what failed, how often, which request — for a developer willing to
`jq` through `docker compose logs`. It does not answer it for an agent:
following one request means grepping each container's stdout for a trace id,
the counters reset with the process, and nothing records the time a request
spent, or the SQL it ran. Agents write all of Kalia's code, so what they can
query is what they can diagnose.

ADR-0088 rejected "OpenTelemetry with a local viewer" because it added
containers and version choices to a stack started on a laptop, and kept the
`traceparent` header and the Micrometer bridge so the option stayed open.
Reopening it is a new decision, not a quiet reversal.

## Scope

An ADR records, and amends ADR-0088 to point at:

- which telemetry store and viewer run, and how they are switched on;
- how each tier sends traces, metrics and logs to them;
- how an agent reads them, and what bounds the size of what it reads;
- what CI runs of it, if anything.

## Non-goals

- Monitoring a deployment: a hosted service, alerting, retention and the scrape
  credential stay behind ADR-0088's revisit trigger and the
  [backlog](../backlog.md)'s deployment item.
- Mobile crash reporting
  ([ADR-0098](../../adr/0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)).
- Backups.

## Constraints

- Kalia adds no cost and nothing from the host machine leaves it
  ([`CLAUDE.md`](../../../CLAUDE.md)): no hosted telemetry service, and no MCP
  server that relays a query off the machine.
- An accepted ADR is amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)): ADR-0088's
  rejected alternative and its "no viewer" scope.
- A new dependency's version is asked for, not researched, in one batched
  question per task ([`CLAUDE.md`](../../../CLAUDE.md)); the ADR names the
  technology, the manifest its version.
- No log field or span attribute holds a token, a password, a request body or a
  query string ([ADR-0013](../../adr/0013-logging-conventions.md),
  [iteration 9 task 20](../iteration-9/20-no-token-or-query-string-in-a-log.md)).
  An OpenTelemetry HTTP instrumentation records the full URL by default, which
  breaks this silently.
- At most two sessions run heavy work at once ([`CLAUDE.md`](../../../CLAUDE.md));
  the profile's containers add to what "the Docker stack" weighs.

## Open questions

- **Integrations.** One all-in-one container (`grafana/otel-lgtm`: an
  OpenTelemetry collector, Prometheus, Loki, Tempo and Grafana, published for
  development and testing) or separate services (a collector with Jaeger,
  Prometheus and Loki). The first is one image and one version; the second
  lets each part be pinned and swapped.
- **Functional scope.** How it is switched on: a Compose profile in
  `docker-compose.override.yml`, a separate `docker-compose.observability.yml`,
  or a `make` target that wraps either.
- **Integrations.** How the backend's metrics reach the store: Prometheus
  scraping `/actuator/prometheus` — which needs a bearer token today, the
  question [iteration 11 task 19](../iteration-11/19-decision-how-far-the-admin-role-reaches.md)
  settles — or Micrometer pushing them over OTLP.
- **Integrations.** Whether Micrometer Tracing moves from the Brave bridge to the
  OpenTelemetry bridge; ADR-0088 recorded the choice as unmeasured and the swap
  as a dependency change.
- **Integrations.** How logs reach the store: each tier exporting them over
  OTLP, or a collector reading every container's stdout, which also catches the
  services Kalia does not write (task 06).
- **Non-functional.** Sampling (every request locally?), and how much memory and
  disk the profile may take on a laptop.
- **Integrations.** How an agent reads it: an MCP server (task 07), a command
  that prints text (task 08), or both, and what bounds an answer's size in each.
- **Constraints.** Whether CI's end-to-end job runs the profile and uploads what
  it stored (task 09); the repository is public, so its Actions minutes cost
  nothing.
- **Module boundaries.** Whether this is one ADR amending ADR-0088, or ADR-0088
  is superseded.

## Acceptance criteria

- [ ] An ADR records the store, the switch, each tier's path to it, how an
      agent reads it and what CI runs, passes `node scripts/check-adrs.mjs`,
      and ADR-0088 carries an amendment pointing at it
- [ ] `docs/architecture.md`'s observability bullet and trade-off name the
      decision, and `make check` is green
- [ ] A throwaway spike ran the chosen store beside the stack and received one
      backend trace, and the ADR cites its memory and startup cost — nothing
      from it is committed
- [ ] Each test the decision implies — no query string in a span, the stack
      unchanged without the profile, an agent's answer bounded in size — is
      named in the acceptance criteria of tasks 02–09 before they are refined
- [ ] Every new dependency the ADR implies is listed with the version the
      product owner chose, for the tasks that add them
- [ ] `make verify-fast` is green

## Notes

Provenance: the product owner's request on 2026-11-06, after a review of what
production-grade infrastructure Kalia lacks, to give agents a stack they can
query before anything is deployed.
