# Task 01: Decide the local observability stack and how an agent reads it

- **Status:** done
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
- **Decided at refinement (2026-11-15):**
  this list is the home of the iteration's shared observability decisions;
  tasks 02–10 point here rather than repeat them. The ADR records them with
  their reasons, and the spike confirms them. If it contradicts one, for
  example on memory cost, the affected tasks are re-refined
  ([refine-iteration](../../../.claude/skills/refine-iteration/SKILL.md),
  "When a refined task has gone stale").
  - **Store:** one `grafana/otel-lgtm` container (collector, Prometheus,
    Loki, Tempo, Grafana), chosen over separate services for one image and
    one version to pin and scan.
  - **Switch:** a Compose profile in `docker-compose.override.yml`, so the
    base file gains nothing. `make observability-up` starts it and recreates
    the backend and the web with the exporter endpoint set, and
    `make observability-down` reverses that without stopping the stack. Both
    are listed in `make help`.
  - **Traces:** Micrometer Tracing moves from the Brave bridge to the
    OpenTelemetry bridge and exports over OTLP. The web exports over OTLP
    too (task 05).
  - **Metrics:** scraped, not pushed. The backend's `/actuator/prometheus`
    is reached on the compose network without a credential (ADR-0088's
    2026-11-07 amendment), and the web's `/api/metrics` with a dev-only
    `METRICS_TOKEN`. The web keeps `@prometheus-io/client`.
  - **Logs:** one shipper container, such as Grafana Alloy, reads every
    service's stdout through the Docker socket. No tier gains a log
    exporter, and each tier's JSON stdout is unchanged.
  - **Sampling and size:** every request is sampled locally. The memory
    limit is set from the spike's measurement, and retention is three days.
  - **Viewer:** Grafana's anonymous access, with the Viewer role, on a
    localhost-only port, and no sign-in.
  - **Reading:** both an MCP server (task 07) and a `make` command (task
    08). The server is Grafana's own MCP server, through a Viewer service
    account, configured in a committed `.mcp.json`.
  - **CI:** the Playwright end-to-end job runs with the profile on every
    run, and uploads the store only when the job is red (task 09).
  - **ADR shape:** one new ADR that amends ADR-0088. ADR-0088 is not
    superseded, since its logs, trace id and counters all stand.

## Open questions

**None.**

## Acceptance criteria

- [x] An ADR records the store, the switch, each tier's path to it, how an
      agent reads it and what CI runs, passes `node scripts/check-adrs.mjs`,
      and ADR-0088 carries an amendment pointing at it
- [x] `docs/architecture.md`'s observability bullet and trade-off name the
      decision, and `make check` is green
- [x] A throwaway spike ran the chosen store beside the stack and received one
      backend trace, and the ADR cites its memory and startup cost — nothing
      from it is committed
- [x] The ADR names each test the decision implies — no query string in a
      span, the stack unchanged without the profile, an agent's answer
      bounded in size — and each one is an acceptance criterion of one of
      tasks 02–09, as refined
- [x] Every new dependency the ADR implies — the `otel-lgtm` image, the log
      shipper, the OpenTelemetry bridge, `datasource-micrometer`,
      `@vercel/otel`, Grafana's MCP server and the exporters task 06 adds —
      is listed with the version the product owner chose, in one batched
      question
- [x] `make verify-fast` is green

## Notes

### Versions chosen

The one batched question the iteration's tasks point at, answered by the
product owner on 2026-11-15. The ADR names each technology and not its version
([ADR-0020](../../adr/0020-documentation-roles.md)); the manifest that pins it
is the version's one home once pinned, and this table is where tasks 02–09 read what to
write into it. Versions were taken from each registry's own metadata, the
newest stable release that day.

| Dependency | Version | Pinned in | Task |
|---|---|---|---|
| `grafana/otel-lgtm` (image) | 0.41.0 | `docker-compose.override.yml` | 02 |
| Grafana Alloy, `grafana/alloy` (image) | v1.22.0 | `docker-compose.override.yml` | 02, 06 |
| `micrometer-tracing-bridge-otel`, `spring-boot-micrometer-tracing-opentelemetry` and `opentelemetry-exporter-otlp` | managed by Spring Boot 4.1.1 (Micrometer Tracing 1.7.1, OpenTelemetry 1.62.0); no version of their own | `backend/pom.xml` | 03 |
| `datasource-micrometer-spring-boot` (`net.ttddyy.observation`) | 2.3.0, built against Spring Boot 4.1.1 | `backend/pom.xml` | 04 |
| `@vercel/otel` | 2.3.0, with the `@opentelemetry/*` peers its ranges name, resolved by npm | `web/package.json` | 05 |
| Grafana MCP server, `grafana/mcp-grafana` (image) | 2.3.0 | the wrapper `.mcp.json` runs | 07 |
| `dhi.io/postgres-exporter` (image) | 0.20.1 | `docker-compose.override.yml` | 06 |
| `dhi.io/redis-exporter` (image) | 1.97.0 | `docker-compose.override.yml` | 06 |

Keycloak's metrics are its own built-in endpoint and add no dependency.

The product owner chose the two exporters from Docker's hardened-image catalog
over the community images first proposed (`prometheuscommunity/postgres-exporter`
v0.20.1, `oliver006/redis_exporter` v1.97.0), preferring a publisher Docker
stands behind. Both pulled without a login and are multi-architecture.

### What the spike changed for the tasks

The spike ([ADR-0114](../../adr/0114-an-opt-in-profile-stores-traces-logs-and-metrics-in-one-local-grafana-container-an-agent-reads-through-a-bounded-interface.md#evidence)) contradicted no decision: the
profile's working set, about 1.0–1.2 GiB beside a stack of about 1.5 GiB,
is the cost the decision accepted, and the container's limit is 2 GiB. It did
add facts the tasks need, recorded in the tasks themselves:

- [Task 02](02-the-observability-profile-starts-beside-the-stack.md): the image declares no
  volume, its first start downloads about 600 MB of Grafana plugins, and
  Prometheus has no scrape job until a file is mounted over its configuration.
- [Task 06](06-the-other-services-logs-and-metrics-reach-the-profile.md): the exporters are the
  hardened images, and the shipper must be scoped to its own Compose project.

Provenance: the product owner's request on 2026-11-06, after a review of what
production-grade infrastructure Kalia lacks, to give agents a stack they can
query before anything is deployed.
