# Iteration 11.5 — An agent can see what the stack did

Goal: a developer or an agent can turn on a local observability profile beside
the stack and follow one request — its trace, its log lines and the counters
around it — through every tier, reading it from a query rather than from
`docker compose logs`.

## Done when

- **DW-1:** An opt-in profile starts a telemetry store and a viewer beside the
  local stack, in any worktree on that worktree's own ports; without it the
  stack starts exactly the containers it does today, and the deployable
  definition gains nothing.
- **DW-2:** One browser request is one trace — the web server's span, the
  backend's span under it and the SQL statements the backend ran — and every
  tier's log lines for it are found by its trace id.
- **DW-3:** The counters [ADR-0088](../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)
  defined, and the health of the stack's other services, are kept over time in
  the profile and survive a restart of the process that counted them.
- **DW-4:** An agent answers "what happened to this request" — its trace, its
  log lines and the counters around it — through a read-only interface whose
  output is sized for its context, without a browser, and no telemetry leaves
  the machine.
- **DW-5:** A failing Playwright test names the trace id of the request behind
  it, and a red end-to-end run in CI leaves its telemetry where an agent can
  load and read it.
- **DW-6:** Which stack runs, how each tier sends to it and how an agent reads
  it is a recorded decision that amends ADR-0088.

## Tasks

| ID | Task | Status |
|---|---|---|
| [01](iteration-11.5/01-decision-the-local-observability-stack.md) | Decide the local observability stack and how an agent reads it | needs-refinement |
| [02](iteration-11.5/02-the-observability-profile-starts-beside-the-stack.md) | The observability profile starts beside the stack, and the stack without it is unchanged | needs-refinement |
| [03](iteration-11.5/03-the-backends-telemetry-reaches-the-profile.md) | The backend's traces, metrics and logs reach the profile | needs-refinement |
| [04](iteration-11.5/04-a-trace-shows-the-sql-a-request-ran.md) | A trace shows the SQL a request ran | needs-refinement |
| [05](iteration-11.5/05-the-web-servers-telemetry-reaches-the-profile.md) | The web server's traces, metrics and logs reach the profile | needs-refinement |
| [06](iteration-11.5/06-the-other-services-logs-and-metrics-reach-the-profile.md) | The edge, Keycloak, Postgres and Valkey reach the profile too | needs-refinement |
| [07](iteration-11.5/07-an-agent-queries-the-telemetry-through-an-mcp-server.md) | An agent queries the telemetry through an MCP server | needs-refinement |
| [08](iteration-11.5/08-one-command-prints-a-requests-trace-and-logs.md) | One command prints a request's trace and log lines as text | needs-refinement |
| [09](iteration-11.5/09-a-failing-e2e-test-names-its-trace.md) | A failing end-to-end test names its trace, and CI keeps the telemetry | needs-refinement |
| [10](iteration-11.5/10-the-process-tells-an-agent-when-to-look.md) | The process tells an agent when to read the telemetry | needs-refinement |
| [11](iteration-11.5/11-the-mobile-apps-code-conventions-are-written-down-and-checked.md) | The mobile app's code conventions are written down and checked | needs-refinement |

Numbered 11.5 because it lands after [iteration 11](iteration-11.md) and
before [iteration 12](iteration-12.md)'s offline cellar, whose sync failures
are the first a log line alone will not explain. These ten tasks are the
observability part of the iteration, drafted at the product owner's request on
2026-11-06; the rest of the iteration is added later. Every task is seeded at
`needs-refinement`, to be refined together in one conversation
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)).

The profile is for local development and CI only. ADR-0088 rejected a local
viewer because it added containers to a stack started on a laptop; an opt-in
profile is the answer task 01 puts to the product owner, not a decision already
made. What a deployment monitors — a hosted service, alerting, retention — stays
behind ADR-0088's own revisit trigger, a deployment target, and is not here.

The table's order is the order of work:

- **First, the decision** ([01](iteration-11.5/01-decision-the-local-observability-stack.md)):
  which stack, how each tier sends to it, and how an agent reads it. Every
  task after it is refined against its ADR.
- **Then the ground:** the profile itself
  ([02](iteration-11.5/02-the-observability-profile-starts-beside-the-stack.md)),
  with nothing yet sending to it.
- **Then each source, the backend first** because it carries the most:
  its traces, metrics and logs
  ([03](iteration-11.5/03-the-backends-telemetry-reaches-the-profile.md)), the
  SQL inside its traces
  ([04](iteration-11.5/04-a-trace-shows-the-sql-a-request-ran.md)), the web
  server's, whose span becomes the backend's parent
  ([05](iteration-11.5/05-the-web-servers-telemetry-reaches-the-profile.md)),
  and the services Kalia does not write
  ([06](iteration-11.5/06-the-other-services-logs-and-metrics-reach-the-profile.md)).
- **Then the reading, once there is something to read:** an MCP server
  ([07](iteration-11.5/07-an-agent-queries-the-telemetry-through-an-mcp-server.md)),
  a command that prints one request as text
  ([08](iteration-11.5/08-one-command-prints-a-requests-trace-and-logs.md)), and
  the end-to-end suite pointing at both
  ([09](iteration-11.5/09-a-failing-e2e-test-names-its-trace.md)).
- **Last, the process** ([10](iteration-11.5/10-the-process-tells-an-agent-when-to-look.md)):
  the documents an agent works from say when to read the telemetry, written
  once what they describe exists.

Task [11](iteration-11.5/11-the-mobile-apps-code-conventions-are-written-down-and-checked.md)
is outside the observability work and advances no criterion. It was added at
the product owner's request on 2026-11-14 so the mobile app's code
conventions are set before iteration 12's cellar becomes the second large
feature written without them. Refinement may split it into several tasks.
