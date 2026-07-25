# ADR-0013: Structured logging conventions

- **Status:** accepted
- **Date:** 2026-07-24

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
    wiring), not routine per-request logging — Kalia has no
    correlation-ID/request-tracing infra yet, so per-request `INFO`
    logging would be noise nobody can stitch back into one request.
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
  bodies, auth tokens, or passwords; log an identifier (e.g. a beer's
  `id`) rather than a full domain object. Mostly forward-looking today (no
  auth/PII yet), heading off the Auth iteration from casually violating
  it.
- **No manual controller entry/exit logging.** Hand-rolled
  "entering/exiting method" pairs are noisy, go stale as methods change,
  and apply inconsistently across controllers. If request-level
  visibility is ever wanted, it belongs in a single centralized mechanism
  (a filter/interceptor), not scattered per-method statements — and
  that's deferred alongside the rest of real observability infra
  (`docs/architecture.md` §9), since without correlation IDs even a
  centralized version can't stitch lines back into one request.
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
- Convention documented in `backend/README.md`'s "Logging conventions"
  section for day-to-day reference; this ADR is the record of why.
