# ADR-0114: An opt-in profile stores traces, logs and metrics in one local Grafana container that an agent reads through a bounded interface

- **Status:** accepted
- **Date:** 2026-11-15
- **Amended:** 2026-11-17 — iteration 11.5 task 06: how the other services
  arrive (see Decision, Logs and Metrics)
- **Amended:** 2026-11-18 — iteration 11.5 task 06: the Postgres and Valkey
  exporters are the community images, because CI cannot pull from `dhi.io`
  (see Decision, Alternatives considered and Consequences)
- **Amended:** 2026-11-19 — iteration 11.5 task 09: how a failing test names
  its request and what a red run keeps (see Decision, CI)
- **Amended:** 2026-11-20 — maintenance: the images' usage reports and update
  checks are switched off, and Grafana's plugin fetch at each start is recorded
  (see Consequences)

## Context

[ADR-0088](0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)
gave both tiers JSON logs, a shared W3C trace id and Prometheus-format
counters, and nothing to store or view them in. That answered iteration 10's
question — what failed, how often, which request — for a developer willing to
`jq` through `docker compose logs`. It does not answer it for an agent:
following one request means grepping each container's stdout for a trace id,
the counters reset with the process, and nothing records the time a request
spent or the SQL it ran. Agents write all of Kalia's code, so what they can
query is what they can diagnose.

ADR-0088 rejected "OpenTelemetry with a local viewer" because it added
containers and version choices to a stack started on a laptop, and kept the
`traceparent` header and the Micrometer bridge so the option stayed open. The
question the iteration asks is the one it left open: a store and viewer that
exist only when asked for, that every tier can send to, and that an agent can
read in a size it can use. Three constraints bound the answer: Kalia adds no
cost and nothing from the host machine leaves it, so no hosted service and no
interface that relays a query off the machine; no log field or span attribute
may hold a token, a password, a request body or a query string
([ADR-0013](0013-logging-conventions.md)), which an OpenTelemetry HTTP
instrumentation breaks silently by recording the full URL; and the deployable
stack must gain nothing ([ADR-0089](0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)).

## Decision

**An opt-in Compose profile runs one `grafana/otel-lgtm` container beside the
local stack to receive, store and show traces, logs and metrics, and an agent
reads it through Grafana's own MCP server and a bounded `make` command.**
Everything below bounds that sentence; the tasks of
[iteration 11.5](../tasks/iteration-11.5.md) build it and point here for what
was decided.

- **Store and viewer:** the one `grafana/otel-lgtm` container holds the
  OpenTelemetry collector, Prometheus, Loki, Tempo and Grafana. One image is
  one version to pin and one image to scan
  ([ADR-0024](0024-dependency-vulnerability-scanning.md)).
- **Switch:** the container is a Compose profile in `docker-compose.override.yml`,
  so `docker-compose.base.yml`, the deployable definition, gains nothing and
  the default stack starts exactly the containers it does today. `make
  observability-up` starts the profile and recreates the backend and the web
  with the exporter endpoint set; `make observability-down` reverses that
  without stopping the rest of the stack. Both are listed in `make help`.
  Configuration stays an environment variable
  ([ADR-0015](0015-configuration-strategy.md)): with no endpoint a tier
  exports nothing.
- **Traces:** Micrometer Tracing moves from the Brave bridge to the
  OpenTelemetry bridge and exports over OTLP, and the datasource's statements
  join the request's trace through `datasource-micrometer`, without their bound
  values. The web exports over OTLP through `@vercel/otel`, which the pinned
  Next.js's own guide recommends. A request is one trace across both tiers
  because ADR-0088's `traceparent` is already forwarded.
- **Metrics:** scraped, never pushed. The backend's `/actuator/prometheus` is
  reached on the compose network without a credential (ADR-0088's 2026-11-07
  amendment), the web's `/api/metrics` with a dev-only `METRICS_TOKEN`, and the
  web keeps `@prometheus-io/client`. Postgres and Valkey are scraped through
  exporters that run only with the profile, Keycloak through its built-in
  metrics endpoint, and the edge is counted from its own access log by status
  and service, so it gains no exporter.

  > **Amended 2026-11-17 (task 06).** Keycloak's counters are a build-time
  > option, so the local stack's `docker-compose.override.yml` builds the image
  > with them (`KC_METRICS_ENABLED`) and the deployable image is built without.
  > The Postgres exporter reads as a role of its own, `kalia_monitor`, which
  > only the profile creates ([ADR-0100](0100-postgres-has-three-roles-one-that-owns-the-schema-for-flyway-one-that-reads-and-writes-rows-and-one-for-keycloak.md)).
- **Logs:** one shipper container, Grafana Alloy, reads every service's stdout
  through the Docker socket, discovering only the containers of this
  Compose project so that one worktree's profile never ships another's logs.
  No tier gains a log exporter, each tier's JSON stdout is unchanged, and Keycloak, the edge, Postgres and Valkey, which have
  no exporter of their own, arrive by the same path. The shipper redacts
  Keycloak's username and email fields before a line reaches the store.

  > **Amended 2026-11-17 (task 06).** The shipper also redacts the value in a
  > Postgres unique violation's `DETAIL: Key (email)=(…)`, and labels the edge's
  > lines by `status` and `upstream`, which the edge writes as JSON with the
  > request's trace id. A statement a person typed into `psql` still carries its
  > literals into the store, as `STATEMENT:` lines do; both tiers bind theirs.
- **Sampling and size:** every request is sampled locally, since the store
  serves one developer's stack. The container's memory limit is 2 GiB, set
  from the spike's measured working set of 1.0–1.2 GiB with headroom for three
  days of data (below), and retention is three days,
  set by an argument to each of Prometheus, Loki and Tempo, which the image
  exposes and its configuration files do not.
- **Viewer:** Grafana's anonymous access with the Viewer role on a
  localhost-only port, and no sign-in. Nothing it holds is reachable beyond the
  machine, and a Viewer cannot write a dashboard.
- **Reading:** both an MCP server and a `make` command, because they answer
  different questions. The MCP server is Grafana's own, reaching Tempo, Loki
  and Prometheus through Grafana's data sources with a Viewer service account,
  run as a pinned container image and configured in a committed `.mcp.json`;
  an agent in a session runs ad-hoc queries through it. The command prints one
  request's trace as a tree with its SQL and its log lines, bounded at 150
  lines, for the question every diagnosis starts with. An answer's size is
  bounded first by the server's own limits and by enabling only its read and
  query tools; where those do not, the wrapper truncates the answer and says
  so.
- **CI:** the Playwright end-to-end job runs with the profile on every run, so
  a red run has a trace to read, and uploads the store as an artifact only
  when the job is red.

  > **Amended 2026-11-19 (task 09).** A request is named by the trace the
  > server put it in, not by one the test sent: the local stack's web server
  > answers a page, an RSC fetch or a Server Action with `x-kalia-trace-id`
  > (`proxy.ts`, set only where `KALIA_DEV_STACK` is `true`), and a Playwright
  > fixture lists those ids for a failing test, in the report and in its failure
  > output. Sending each request a `traceparent` of its own was tried first:
  > Playwright's request interception switches the browser's HTTP cache off, and
  > a spec that read a page before its stylesheet had arrived then failed 39 of
  > the 245 tests on a strict-mode violation. The store's directories (not Grafana's
  > 600 MB of plugins) are packed by `scripts/e2e-telemetry.mjs`, which reads the
  > live store and the copied files for a credential and writes nothing when it
  > finds one; the artifact is kept seven days and loads back with the same
  > script, which raises the stores' retention from three days for the store it
  > restores, so that a run read on its sixth day is not deleted by compaction.
- **The tests this decision implies**, each an acceptance criterion of a task
  of the iteration rather than a promise here:
  - *no query string, token or bound value in a span, label or log field* —
    [task 03](../tasks/iteration-11.5/03-the-backends-telemetry-reaches-the-profile.md)
    (backend spans), [task 04](../tasks/iteration-11.5/04-a-trace-shows-the-sql-a-request-ran.md)
    (SQL), [task 05](../tasks/iteration-11.5/05-the-web-servers-telemetry-reaches-the-profile.md)
    (web spans), [task 06](../tasks/iteration-11.5/06-the-other-services-logs-and-metrics-reach-the-profile.md)
    (the shipper's redaction) and [task 09](../tasks/iteration-11.5/09-a-failing-e2e-test-names-its-trace.md)
    (the uploaded store), each seen to fail with the instrumentation's defaults;
  - *the stack is unchanged without the profile* —
    [task 02](../tasks/iteration-11.5/02-the-observability-profile-starts-beside-the-stack.md)
    (the default stack's rendered service list and the base file), and task 06
    for the exporters;
  - *an agent's answer is bounded in size* —
    [task 07](../tasks/iteration-11.5/07-an-agent-queries-the-telemetry-through-an-mcp-server.md)
    (a query larger than the bound returns a truncated answer that says so) and
    [task 08](../tasks/iteration-11.5/08-one-command-prints-a-requests-trace-and-logs.md)
    (the 150-line bound).
- **New dependencies**, each pinned in its own manifest and not here
  ([ADR-0020](0020-documentation-roles.md)): the `grafana/otel-lgtm` image;
  Grafana Alloy; Grafana's MCP server as an image; the OpenTelemetry bridge for
  Micrometer Tracing and its OTLP exporter, whose versions Spring Boot manages;
  `datasource-micrometer`; `@vercel/otel`; and the Postgres and Valkey
  exporters, taken from Docker's hardened-image catalog (`dhi.io`) rather than
  from a community publisher (amended below: the community images after all). Their versions are recorded in
  [task 01](../tasks/iteration-11.5/01-decision-the-local-observability-stack.md#versions-chosen).

  > **Amended 2026-11-18 (task 06).** The two exporters are
  > `prometheuscommunity/postgres-exporter` and `oliver006/redis_exporter`, at
  > the versions task 01 named for them, and not the `dhi.io` images. The
  > revisit trigger below fired in effect: the scan job's runner is refused
  > `dhi.io`'s anonymous token (`401`, in the scan's own log and in a plain
  > `docker pull` from the runner) though a laptop is not, so Trivy could not
  > scan them (ADR-0024). The product owner chose the community images over a
  > registry login held as a repository secret or a waiver of their scan.

This amends ADR-0088: it adds the store, the viewer and the exporters that ADR
scoped out and replaces nothing else. Brave gives way to the OpenTelemetry
bridge, which ADR-0088 named as a dependency change and not a redesign. It
does not monitor a deployment: a hosted service, alerting, retention beyond
three days and the scrape credential stay behind ADR-0088's revisit trigger.
Mobile crash reporting stays as
[ADR-0098](0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)
left it.

## Alternatives considered

- **Separate Prometheus, Loki, Tempo, Grafana and collector containers.**
  Rejected: five images and five versions to pin, scan and keep compatible, for
  a store that serves one developer's stack. `otel-lgtm` ships them already
  wired to each other. The cost is that one container fails or restarts as a
  unit and its configuration is the image's, which the spike below worked
  around with arguments and one mounted file.
- **A traces-only viewer (Jaeger or Zipkin), or a single all-in-one backend
  such as SigNoz.** Rejected: the first stores neither the logs nor the
  counters the iteration needs, so a second and third store would follow; the
  second brings a column store of its own to run on a laptop, where `otel-lgtm`
  needs none.
- **The profile in `docker-compose.yml` or the base file.** Rejected: the base
  file is the deployable definition and must gain nothing (ADR-0089), and
  `docker-compose.yml` would start the container for a developer who did not
  ask. `docker-compose.override.yml` is where what only development has already
  lives.
- **A log exporter in each tier instead of a shipper.** Rejected: it changes
  both tiers' logging, leaves Keycloak, the edge, Postgres and Valkey without
  logs in the store, and gives the same line two paths. A shipper that reads
  stdout adds none to any tier and covers all of them, at the cost of one more
  container and the Docker socket mounted into it, read-only.
- **Metrics pushed over OTLP.** Rejected: the counters already exist in
  Prometheus format and keep working with the profile off; a push would replace
  working endpoints with an exporter in each tier.
- **Tail or probabilistic sampling.** Rejected: the store holds one developer's
  stack for three days, and a request an agent needs to find is the one that
  would have been dropped.
- **Grafana with a sign-in, or the image's default anonymous Admin.** Rejected:
  a sign-in adds a credential nobody needs on a localhost-only port, and the
  image's default role lets an anonymous visitor edit data sources.
- **The MCP server or the command alone.** Rejected: an agent that has only the
  command cannot ask a question nobody anticipated, and one that has only the
  server must compose the same trace-and-logs query every time and cannot bound
  its output beyond what the server offers.
- **A third-party MCP server, or one that relays a query to a hosted service.**
  Rejected: nothing from the host machine leaves it, and a relay is exactly
  that.
- **The Postgres and Valkey exporters from their upstream publishers' images**
  (`prometheuscommunity/postgres-exporter`, `oliver006/redis_exporter`). Not
  chosen: the product owner preferred images from a publisher whose provenance
  Docker stands behind to a community maintainer's, for a container that holds
  a database credential. The hardened images are the same projects'
  exporters, and were pulled without a login at the time of writing.
  *(Amended 2026-11-18: chosen after all. CI could not pull the hardened
  images, so the community ones replaced them; see Decision.)*
- **Running the profile in CI only on a red run, or never.** Rejected: a red
  run cannot be re-run with the profile on, and a trace of the failure is the
  point; every run carries the profile and the store is uploaded only when red.

## Consequences

- Good, because one request is followed across the web server, the backend and
  its SQL by one trace id, and an agent reads the answer from a query instead of
  grepping each container's stdout.
- Good, because the counters survive the restart of the process that counted
  them, which ADR-0088 listed as a cost.
- Good, because the deployable definition and a default `docker compose up`
  gain nothing, and nothing leaves the machine: no hosted service, and an MCP
  server reachable only on localhost.
- Bad, because the profile costs memory and startup time on a laptop that
  already runs the stack (measured below), and adds to what "the Docker stack"
  weighs under the two-heavy-sessions rule.
- Bad, because the shipper reads every container's stdout through the Docker
  socket, a privilege the stack's other services do not hold; a read-only mount of the socket does not stop the shipper calling its write
  API, so the limit is that it runs only with the profile, in a dev-only
  container, with a pinned image that is scanned.
- Bad, because the web's `/api/metrics` needs a dev-only token in
  `docker-compose.dev.env` that the scraper carries.
- Bad, because `otel-lgtm` bundles its components' versions: Prometheus, Loki,
  Tempo and Grafana move together, and an upgrade of one is an upgrade of all.
- Bad, because the Postgres and Valkey exporters come from a registry
  (`dhi.io`) no other image in the stack uses, and a change to its anonymous
  access would need a login in CI. *(Amended 2026-11-18: it did, and the
  exporters moved to Docker Hub's community images, which every other pulled
  image already comes from.)*
- Bad, because the two exporters now come from community maintainers, whose
  provenance Docker does not vouch for, and each holds a database or session
  credential. The profile is local and opt-in, and the images are pinned and
  scanned like the rest (ADR-0024).
- Neutral, because the images report usage to their maker unless told not to
  (Alloy, Grafana, Loki, Tempo and Pyroscope did), which the profile now turns
  off in `docker-compose.override.yml` and a test keeps off; what still dials
  out is Grafana's plugin installer, which contacts grafana.com at every start
  (the Evidence's "once" is the download; the check recurs) to fetch plugins,
  not to report anything. Stopping that too would leave a fresh volume without
  the Drilldown apps.
- Neutral, because retention is three days and a restart keeps the store only
  as long as its volume does; the store is a diagnostic aid, not a record.
- **Revisit trigger:** a deployment target exists or a hosted monitoring
  service is wanted, as in ADR-0088; the profile's memory cost crowds out the
  stack on the owner's machine; or `dhi.io` begins to require a login to pull (it did for CI, 2026-11-18: the
  hardened exporters can return if the scan can pull them without a secret).

## Evidence

Measured on 2026-11-15 on a 16 GB Apple-silicon Docker Desktop host, with
`grafana/otel-lgtm` v0.41.0 (Grafana v13.3.0, Prometheus v3.16.0, Loki v3.7.9,
Tempo v3.1.1, collector v0.165.0) beside this repository's full stack on Spring
Boot 4.1.1. A throwaway branch swapped the backend's Brave bridge for
`micrometer-tracing-bridge-otel`, `spring-boot-micrometer-tracing-opentelemetry`
and the OTLP exporter, set
`MANAGEMENT_OPENTELEMETRY_TRACING_EXPORT_OTLP_ENDPOINT` and a sampling
probability of 1.0, and added the container to the override file. Nothing from
it is committed.

- **The backend's trace arrived.** A request to `/api/v1/beers?search=…`
  carrying a `traceparent` came back from Tempo under that trace id as 21 spans:
  a server span `http get /api/v1/beers` with the route template and status,
  Spring Security's authorization and filter-chain spans, and the Modulith's
  per-module invocation spans. The query string appeared nowhere in the trace: the
  server span's `http.url` attribute is the path alone. The count says the
  instrumentation is chatty, and that the size bound (task 08's 150 lines, with
  repeated siblings folded) is needed, not decorative.
- **Metrics scrape.** The image's `prometheus.yaml` has no scrape job, so a
  scrape of the backend's `/actuator/prometheus` needs that file replaced by a
  mounted one; with it, the target was `up` and `http_server_requests_seconds_count`
  was queryable.
- **Cost.** The container reported 1.0 GiB at rest and 1.2 GiB after 600
  requests and a log shipper replaying its backlog; the rest of the stack
  summed to about 1.5 GiB, so the profile adds between two thirds and three
  quarters again to what the stack holds. It was ready 6 seconds after it started, with the image already
  pulled. The image is 3.6 GB on disk and Alloy's 0.9 GB; 600 MB of the
  container's `/data` is Grafana plugins the image downloads on its first start,
  which a volume on `/data` keeps and which needs outbound network once. The
  image declares no volume, so what it stores is lost with the container unless
  `/data` is mounted. Alloy used 85 MiB.
- **Retention arguments.** `PROMETHEUS_EXTRA_ARGS=--storage.tsdb.retention.time=3d`,
  `LOKI_EXTRA_ARGS=-compactor.retention-enabled=true
  -compactor.working-directory=/data/loki/compactor
  -compactor.delete-request-store=filesystem -store.retention=72h` and
  `TEMPO_EXTRA_ARGS=-backend-worker.compaction.block-retention=72h
  -backend-scheduler.provider.work.compaction.block-retention=72h` are
  accepted and the container started. Loki's first attempt, with
  `-limits.retention-period`, made it exit before it was ready, naming nothing:
  the component's output is shown only with `ENABLE_LOGS_LOKI=true`. That
  three days of data are then deleted was not observed.
- **Grafana access.** `GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer` listed the four data
  sources to an anonymous visitor and refused (403) a dashboard write; the
  image's default is the Admin role.
- **The shipper works on Docker Desktop.** Alloy v1.22.0 with `loki.source.docker`
  on the mounted socket delivered the backend's request line to Loki, found by
  its trace id under `service="backend"`. Unscoped, it discovered every
  container on the host, other worktrees' stacks included, and replayed their
  backlog, which Loki rejected as too old; the scope above follows from that.
- **Grafana's MCP server** v2.3.0 offers `-disable-write`, a cap on log lines
  (`-max-loki-log-limit`) and guardrails for Loki and Prometheus query ranges
  and points, and no size limit on a Tempo trace. That is the part of an
  answer the wrapper has to bound itself.
- **Hardened exporters** *(no longer used; see the 2026-11-18 amendment)*. `dhi.io/postgres-exporter` and `dhi.io/redis-exporter`
  pulled with an empty Docker configuration, for `linux/amd64` and
  `linux/arm64`, at the versions in the task's table.
