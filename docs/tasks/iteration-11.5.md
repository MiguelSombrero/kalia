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
| [01](iteration-11.5/01-decision-the-local-observability-stack.md) | Decide the local observability stack and how an agent reads it | done |
| [02](iteration-11.5/02-the-observability-profile-starts-beside-the-stack.md) | The observability profile starts beside the stack, and the stack without it is unchanged | done |
| [03](iteration-11.5/03-the-backends-telemetry-reaches-the-profile.md) | The backend's traces, metrics and logs reach the profile | done |
| [04](iteration-11.5/04-a-trace-shows-the-sql-a-request-ran.md) | A trace shows the SQL a request ran | done |
| [05](iteration-11.5/05-the-web-servers-telemetry-reaches-the-profile.md) | The web server's traces, metrics and logs reach the profile | done |
| [06](iteration-11.5/06-the-other-services-logs-and-metrics-reach-the-profile.md) | The edge, Keycloak, Postgres and Valkey reach the profile too | done |
| [07](iteration-11.5/07-an-agent-queries-the-telemetry-through-an-mcp-server.md) | An agent queries the telemetry through an MCP server | done |
| [08](iteration-11.5/08-one-command-prints-a-requests-trace-and-logs.md) | One command prints a request's trace and log lines as text | done |
| [09](iteration-11.5/09-a-failing-e2e-test-names-its-trace.md) | A failing end-to-end test names its trace, and CI keeps the telemetry | refined |
| [10](iteration-11.5/10-the-process-tells-an-agent-when-to-look.md) | The process tells an agent when to read the telemetry | refined |
| [25](iteration-11.5/25-each-apps-code-conventions-have-a-file-of-their-own.md) | Each app's code conventions have a file of their own, loaded with its subtree | done |
| [11](iteration-11.5/11-the-mobile-apps-code-conventions-are-written-down-and-checked.md) | The mobile app's mechanical code rules fail the lint | done |
| [26](iteration-11.5/26-navigation-targets-translation-keys-and-strictness-are-checked.md) | Navigation targets, translation keys and compiler strictness are checked in both apps | done |
| [27](iteration-11.5/27-the-conventions-that-needed-a-choice-are-written-and-followed.md) | The conventions that needed a choice are written down, and the code follows them | done |
| [28](iteration-11.5/28-both-apps-test-conventions-are-written-down.md) | Both apps' test conventions are written down, and a test file is named after what it tests | done |
| [12](iteration-11.5/12-a-test-waits-on-a-signal-never-on-the-clock.md) | A test waits on a signal, never on the clock | done |
| [13](iteration-11.5/13-the-shared-packages-export-what-both-apps-use-and-only-that.md) | The shared packages export what both apps use, and only that | done |
| [14](iteration-11.5/14-a-font-that-fails-to-load-leaves-the-app-readable.md) | A font that fails or never loads leaves the app readable | done |
| [15](iteration-11.5/15-nothing-is-drawn-beneath-the-add-action.md) | Nothing is drawn beneath the central Add action | refined |
| [16](iteration-11.5/16-the-free-signing-expiry-is-watched-and-written-down.md) | The seven-day signing expiry is watched, and what it does is written down | dropped |
| [17](iteration-11.5/17-keycloaks-pages-ask-only-what-kalia-uses-and-say-what-each-is.md) | Keycloak's pages ask only for what Kalia uses, and each says what it is | done |
| [18](iteration-11.5/18-rejected-suggestions-cannot-fill-the-review-queue-without-end.md) | A contributor whose suggestions are rejected cannot refill the review queue without end | dropped |
| [19](iteration-11.5/19-a-known-transient-ci-failure-is-retried-or-prevented.md) | A known transient CI failure is retried or prevented, not re-run by hand | done |
| [20](iteration-11.5/20-two-worktrees-run-side-by-side-and-a-low-disk-is-named.md) | Two worktrees run side by side in phone mode, and a low disk is named before it fails a build | done |
| [21](iteration-11.5/21-the-codeql-alerts-open-on-dev-are-closed.md) | The CodeQL alerts open on `dev` are closed | done |
| [22](iteration-11.5/22-every-red-run-is-logged-and-an-unfixed-defect-has-an-owner.md) | Every red run is logged, and a defect left unfixed names who fixes it | done |
| [23](iteration-11.5/23-every-pull-request-has-its-gates-and-a-refinement-is-reviewed.md) | Every pull request knows its gates, and a refinement is reviewed for criteria its branch can check | done |
| [24](iteration-11.5/24-the-backlog-and-the-readmes-state-a-decided-fact-once-as-decided.md) | The backlog and the READMEs state a decided fact once, as decided | refined |

Numbered 11.5 because it lands after [iteration 11](iteration-11.md) and
before [iteration 12](iteration-12.md)'s offline cellar, whose sync failures
are the first a log line alone will not explain. These ten tasks are the
observability part of the iteration, drafted at the product owner's request on
2026-11-06. Every task is seeded at
`needs-refinement`, to be refined together in one conversation
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)).

The profile is for local development and CI only. ADR-0088 rejected a local
viewer because it added containers to a stack started on a laptop; an opt-in
profile is what the product owner chose at refinement on 2026-11-15, and task
01's ADR records it as an amendment. What a deployment monitors — a hosted service, alerting, retention — stays
behind ADR-0088's own revisit trigger, a deployment target, and is not here.

The table's order is the order of work:

- **First, the decision** ([01](iteration-11.5/01-decision-the-local-observability-stack.md)):
  which stack, how each tier sends to it, and how an agent reads it. The
  tasks after it were refined against the answers its Constraints hold, and
  its spike confirms them.
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

Tasks [25](iteration-11.5/25-each-apps-code-conventions-have-a-file-of-their-own.md),
[11](iteration-11.5/11-the-mobile-apps-code-conventions-are-written-down-and-checked.md)
and [26](iteration-11.5/26-navigation-targets-translation-keys-and-strictness-are-checked.md)–[28](iteration-11.5/28-both-apps-test-conventions-are-written-down.md)
are outside the observability work and advance no criterion. Task 11 was
added at the product owner's request on 2026-11-14 so the mobile app's code
conventions are set before iteration 12's cellar becomes the second large
feature written without them. At refinement on 2026-11-15 the product owner
split it into four tasks, 11 and 26–28, each with its web counterpart. Task
25 goes first and gives each subtree a `CONVENTIONS.md` of its own for them
to write into.

Tasks 12–24 are outside the observability work too, and advance no
criterion. On 2026-11-14 the product owner asked for the iteration to be
scoped from the [quality backlog](quality-backlog.md) and the
[backlog](backlog.md), favouring what most helps the mobile iterations to come.
Related findings are merged into one task each, and each task's Notes name the
findings it holds. Most of them are `[needs decision]`, so their open questions
go on the same refinement agenda as the rest. Tasks 16 and 18 were dropped
at refinement on 2026-11-15 and keep their rows. They fall into three groups:

- **The app and what it is built on**, ahead of iteration 12's cellar:
  - tests that check what they claim on a slow runner
    ([12](iteration-11.5/12-a-test-waits-on-a-signal-never-on-the-clock.md));
  - shared packages that do not tie the two apps' React versions together
    ([13](iteration-11.5/13-the-shared-packages-export-what-both-apps-use-and-only-that.md));
  - fonts that cannot hold the blocked screens hostage
    ([14](iteration-11.5/14-a-font-that-fails-to-load-leaves-the-app-readable.md));
  - the navigation defect seen on the phone
    ([15](iteration-11.5/15-nothing-is-drawn-beneath-the-add-action.md));
  - what a free-signing expiry does to the data an offline cellar would keep
    ([16](iteration-11.5/16-the-free-signing-expiry-is-watched-and-written-down.md),
    dropped).
- **What every client inherits from the server:**
  - the Keycloak pages a phone signs up through
    ([17](iteration-11.5/17-keycloaks-pages-ask-only-what-kalia-uses-and-say-what-each-is.md));
  - a limit on rejected suggestions, set before a scan makes suggesting one
    tap away and before installed apps make a new refusal costly
    ([18](iteration-11.5/18-rejected-suggestions-cannot-fill-the-review-queue-without-end.md),
    dropped).
- **The pipeline and the process the next iterations run on:**
  - CI failures that need a manual re-run
    ([19](iteration-11.5/19-a-known-transient-ci-failure-is-retried-or-prevented.md));
  - parallel worktrees
    ([20](iteration-11.5/20-two-worktrees-run-side-by-side-and-a-low-disk-is-named.md));
  - open CodeQL alerts
    ([21](iteration-11.5/21-the-codeql-alerts-open-on-dev-are-closed.md));
  - the failure log
    ([22](iteration-11.5/22-every-red-run-is-logged-and-an-unfixed-defect-has-an-owner.md));
  - gates for refinements and task-less pull requests
    ([23](iteration-11.5/23-every-pull-request-has-its-gates-and-a-refinement-is-reviewed.md));
  - the backlog analysis that iterations 12–14 are refined against
    ([24](iteration-11.5/24-the-backlog-and-the-readmes-state-a-decided-fact-once-as-decided.md)).

None of these depends on the observability tasks, so they can run alongside
them.
