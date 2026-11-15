# Task 02: The observability profile starts beside the stack, and the stack without it is unchanged

- **Status:** refined
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** DW-1

## Why

Every later task in this iteration sends telemetry somewhere or reads it back,
and none of them can be checked until that somewhere exists. It has to exist
without costing anyone who does not want it: a stack that every worktree
starts, and that `make verify` and the end-to-end suites run against, must not
get slower or heavier because an observability store is running beside it.

## Scope

The store and viewer task 01 chose start on request beside the local stack,
with their sources configured and nothing yet sending to them. Without the
request, the stack starts exactly the containers it does today. Each worktree's
copy runs on that worktree's own ports, and what it stores survives the
container being recreated.

## Non-goals

- Anything sending telemetry (tasks 03–06).
- Dashboards beyond what the chosen viewer provisions for its own data sources.
- The deployable definition, which gains nothing.

## Constraints

- **A port is read from the environment, never hard-coded**: each new
  published port is a `PORT_DEFAULTS` entry in `scripts/stack-ports.mjs`, so
  `make stack-env` gives each worktree its own; one missed is a collision only
  a second worktree finds ([`CLAUDE.md`](../../../CLAUDE.md),
  [README](../../../README.md#run-locally)).
- Every binding is localhost-only, like the rest of the local stack.
- `docker-compose.base.yml` is the deployable definition and stays free of
  anything dev-only; `make compose-check` fails otherwise
  ([ADR-0089](../../adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)).
- The image is pinned the way every other Compose image is, and is scanned
  ([ADR-0024](../../adr/0024-dependency-vulnerability-scanning.md)).
- The viewer's own sign-in, if it has one, is a dev-only value in
  `docker-compose.dev.env`, never a `:-` default in a Compose file.
- **Decided at refinement (2026-11-15):**
  - The store, the switch, the shipper and the viewer's anonymous Viewer
    access are [task 01](01-decision-the-local-observability-stack.md)'s
    decisions. The profile holds `otel-lgtm` and the log shipper, and nothing
    sends to them yet.
  - `make observability-up` against a stack that is already up adds the
    profile and recreates only the backend and the web.
    `make observability-down` stops the profile's services and recreates
    those two without the endpoint, and the rest of the stack keeps running.
  - The volume has no size cap beyond the three-day retention.
  - The image's version is the one task 01's batched question settled.
  - The spike's findings ([ADR-0114](../../adr/0114-an-opt-in-profile-stores-traces-logs-and-metrics-in-one-local-grafana-container-an-agent-reads-through-a-bounded-interface.md#evidence)): the image
    declares no volume, so `/data` is a named volume or nothing survives a
    recreate; its first start downloads about 600 MB of Grafana plugins, so
    the profile needs outbound network once and a stopped one needs none; its
    Prometheus has no scrape job until a file of ours is mounted over
    `/otel-lgtm/prometheus.yaml`, which the backend's and the web's scrape
    jobs go in (tasks 03 and 05); the retention and the Viewer role are
    `PROMETHEUS_EXTRA_ARGS`, `LOKI_EXTRA_ARGS`, `TEMPO_EXTRA_ARGS` and
    `GF_AUTH_ANONYMOUS_ORG_ROLE`, as the ADR's Evidence gives them; and the
    memory limit is 2 GiB. The image is 3.6 GB on disk, which task 20's
    low-disk message may count.

## Open questions

**None.**

## Acceptance criteria

- [ ] With the profile on, the viewer answers on its port and lists each data
      source as reachable — verified against the running stack, not a mocked
      config
- [ ] A test in `scripts/` fails if the default stack's rendered service list
      differs from today's, and if `docker-compose.base.yml` names any of the
      profile's services; it was seen to fail with the profile wired in
      unconditionally
- [ ] `scripts/stack-ports.mjs` carries each new port, and two worktrees run
      the profile at once on different ports — verified by running both
- [ ] Recreating the container keeps what it stored
- [ ] `make observability-down` leaves the rest of the stack's containers
      running and the backend and web answering — verified against the
      running stack
- [ ] The root README says how to start, open and stop it, `make help` lists
      both targets, and `make verify-fast` is green

## Notes

The image task 01 names is scanned by Trivy like every other; a finding there
is fixed on this branch.
