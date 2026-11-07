# ADR-0013: Structured logging conventions

- **Status:** accepted
- **Date:** 2026-07-24
- **Amended:** 2026-07-25 by [ADR-0015](0015-configuration-strategy.md) —
  per-environment log levels are delivered by a `LOG_LEVEL` environment
  variable, not by Spring profiles
- **Amended:** 2026-07-27 by [ADR-0020](0020-documentation-roles.md) — this
  ADR is now the only full statement of the convention; `backend/README.md`
  keeps a summary and a link, not the restatement the Consequences below
  originally described
- **Amended:** 2026-10-25 by [ADR-0088](0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md) —
  "structured" now also means JSON on stdout, and the one centralised request
  log this ADR deferred exists, at `INFO`, because requests now carry a trace id
- **Amended:** 2026-11-07 — every tier logs a route template, never a raw path,
  and an app's transport logs a status as a failure only where the call that
  reads it has not declared it an answer

## Context

Kalia has no logging convention yet — no class calls SLF4J, Logback ships
transitively via the Spring Boot starters, and the only existing signal is
`CatalogExceptionHandler`'s doc comment noting that unhandled exceptions
"fall through to Spring Boot's default handling... logged server-side."
Iteration 3 exists to establish conventions like this before Auth (session
cookies, secrets) and Cellar (first mutating endpoints) land, so later work
— including this same iteration's exception-handling and configuration
tasks — has a logging baseline to build on instead of retrofitting one.
ArchUnit already bans `java.util.logging` and standard-stream access
(ADR-0007), leaving SLF4J as the only realistic logging API. "Structured"
here means a formal, written convention — not a structured (JSON)
wire format; plain text via Logback's default encoder stays simplest until
real log aggregation is worth adopting (`docs/architecture.md` §9 already
defers full metrics/tracing).

## Decision

- **SLF4J via Lombok's `@Slf4j`** on any class that logs — a logger field
  is boilerplate, not domain semantics, matching the project's existing
  Lombok philosophy (`@Getter`/`@NoArgsConstructor` are approved for the
  same reason; `@Data`/`@Builder` are not, since those touch domain
  behavior).
- **Parameterized logging only** (`log.warn("Beer {} not found", id)`) —
  never string concatenation or `String.format` inside the log call, so
  argument formatting is skipped entirely when the level is disabled.
- **Level semantics:**
  - `ERROR` — something broke that shouldn't have: unhandled exceptions
    falling through to the default handler, integration failures. Always
    carries the stack trace.
  - `WARN` — an anticipated-but-noteworthy problem the app already
    recovered from.
  - `INFO` — significant application lifecycle events (startup, module
    wiring), and the one request line a single filter writes per request
    ([ADR-0088](0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).
    This ADR first withheld per-request `INFO` because Kalia had no
    correlation id to stitch lines back into one request; the trace id now
    carried through both tiers is that id.
  - `DEBUG` — diagnostic detail, off by default.
- **Log level follows what the exception represents, not whether it was
  caught.** An exception type designed as an API response (per the
  existing error-handling convention: `BeerNotFoundException`,
  `InvalidSearchParameterException`) is an anticipated, already-handled
  condition → `WARN` at most, not `ERROR` — logging every 404/400
  translation at `ERROR` would flood logs with non-incidents and
  desensitize `ERROR` as a signal. An exception representing a genuine
  unexpected failure → `ERROR`. Log at the point where the exception is
  finally decided (handled, translated, or left to propagate), not at
  every layer that catches and rethrows it, or one real failure produces
  multiple `ERROR` lines.
- **Unhandled exceptions stay exactly as Spring's defaults already
  behave** — logged server-side at `ERROR` with the full stack trace, the
  client receives a message-less 500 problem
  (`server.error.include-message=never`). This ADR formalizes that
  behavior as deliberate, not an accident of defaults, so it isn't "fixed"
  later by leaking exception detail back into responses.
- **No secrets/PII in log lines** — never log full request/response
  bodies, query strings, auth tokens, or passwords; log an identifier (e.g. a beer's
  `id`) rather than a full domain object. Mostly forward-looking today (no
  auth/PII yet), heading off the Auth iteration from casually violating
  it.
- **A request is logged by its route template, never its path.** A path such as
  `/api/v1/cellars/{username}` carries a user's name, and the request line sits
  beside the client's address in the backend's request log, the web's backend-call
  log, the app's device log and the edge's access log: a name beside an address
  is personal data, and the misspelled names and private cellars that answer
  `404` are logged the same as real ones. So each tier names the pattern that
  served the call: the backend its best-matching handler pattern, the web's and
  the app's transports the operation's path template (`@kalia/api`'s
  `routeTemplateOf()`, from the committed spec), and the edge a `map` in
  `edge/nginx.conf`. A request no pattern owns (one Spring Security rejects
  before a handler is chosen, or any path outside the API) is logged as
  `unmatched`, never as itself.
- **A status is a failure only where the feature that reads it calls one.** The
  app's transport logs every response of status 400 or above, except a status
  the call declared with `answers` (`{ answers: [404] }` on the beer read, where
  `404` means "no such beer"): an anticipated answer written as an error is the
  flood of non-incidents the level rule above forbids. An undeclared 4xx and
  every 5xx stay logged, so an unanticipated failure cannot go silent. A `401`
  that the token refresh resolves is never seen by the log, since the transport
  retries inside; one still returned after the retry is logged, and a `429` is
  logged because the app should never reach the limit.
- **No manual controller entry/exit logging.** Hand-rolled
  "entering/exiting method" pairs are noisy, go stale as methods change,
  and apply inconsistently across controllers. If request-level
  visibility is ever wanted, it belongs in a single centralized mechanism
  (a filter/interceptor), not scattered per-method statements. That was
  deferred because without correlation IDs even a centralized version
  couldn't stitch lines back into one request;
  [ADR-0088](0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)
  added the id and the one filter, and the ban on scattered per-method
  logging stands.
- **Per-environment level policy**: `dev` — `fi.kalia` at `DEBUG`; `test` —
  `fi.kalia` at `WARN`, keeping test output quiet; `prod` — `fi.kalia` at
  `INFO`. This ADR originally expected task 3 to deliver that by splitting
  `application.properties` into profiles; [ADR-0015](0015-configuration-strategy.md)
  rejected profiles, so the policy is delivered by a `LOG_LEVEL`
  environment variable instead — `INFO` as the safe default in
  `application.properties`, `DEBUG` set in `docker-compose.yml`, `WARN` set
  in the failsafe configuration. The levels themselves are unchanged.

## Consequences

- No code changes beyond the one `logging.level.fi.kalia=INFO` baseline —
  no class in the codebase logs anything yet. The first real logging call
  lands naturally in task 2 (shared exception-handling strategy), driven
  by actual need rather than retrofitted here.
- Task 3 (configuration strategy) inherited the per-environment levels
  above as a known requirement; it delivered them via `LOG_LEVEL` rather
  than profiles ([ADR-0015](0015-configuration-strategy.md)).
- A line the app stops writing is one nobody can read later (an installed
  build's errors are read from the device's own logs,
  [ADR-0098](0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)),
  so a status is declared per call, in the feature that knows what it means,
  and never as a blanket rule for a status code.
- A request rejected before a handler is chosen is logged without its route,
  so the backend's line for a `401` no longer says which endpoint was asked
  for; the trace id still ties it to the web's line, which does.
- `backend/README.md`'s logging bullet summarizes the rules
  for day-to-day reference and links here; this ADR is the full statement and
  the record of why. It originally carried a full restatement instead — see
  the `Amended` field above.
