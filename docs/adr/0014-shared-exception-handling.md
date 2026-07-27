# ADR-0014: Shared, module-neutral exception-handling strategy

- **Status:** accepted
- **Date:** 2026-07-25

## Context

`catalog`'s `CatalogExceptionHandler` only handles its own business
exceptions (`BeerNotFoundException`, `InvalidSearchParameterException`).
Generic Spring MVC exceptions are **already handled** by Spring Boot's
auto-registered `ProblemDetailsExceptionHandler`
(`spring.mvc.problemdetails.enabled=true`, extending
`ResponseEntityExceptionHandler`, which covers ~22 exception types
including every one considered here) — they return RFC 9457
problem+json without any code from us.

The one real gap is **field-level detail**. Boot reports a rejected
`?minAbv=-1` as `{"detail":"Validation failure","status":400}` — naming
neither the offending field nor the constraint — and a `@Valid @RequestBody`
violation as `{"detail":"Invalid request content."}`. An API consumer cannot
tell *what* to fix.

A task in [iteration 3](../tasks/iteration-3.md) and that iteration's "Done
when" both require field-level detail, so the gap has to be closed somewhere
that doesn't force every future module (`identity`, `cellar`, …) to duplicate
the same logic, and without breaking
[ADR-0007](0007-backend-package-structure.md)'s ArchUnit rule that
`@RestControllerAdvice` must live in a module's own `web` package.

## Decision

**One shared `@RestControllerAdvice` — `GlobalExceptionHandler` in a new
root-level `fi.kalia.web` package, parallel to `fi.kalia.catalog` — handles
exactly the two Bean Validation exceptions where Boot's output lacks
field-level detail, and nothing else.**

- **Handle only what Boot does worse, not everything Boot handles.** Every
  other generic exception — malformed JSON, 405, 415, unknown route, type
  mismatch, … — is deliberately left to Boot's defaults. Overriding those
  would mean re-wording a `detail` string for no functional gain, at the cost
  of a handler to maintain, and risks *losing* behavior Boot gets right (see
  Evidence). An override must earn its place against measured Boot behavior;
  "we have a global handler, so it should handle everything" is not a reason.
- **Exception types handled: exactly two.**
  `HandlerMethodValidationException` (Spring's native
  `@RequestParam`/`@PathVariable` Bean Validation path — this codebase
  has deliberately opted out of the older `@Validated`/AOP path that
  throws `ConstraintViolationException` — see `CatalogController.java` — so
  that type is deliberately not handled here; nothing in the app can trigger
  it) and
  `MethodArgumentNotValidException` (`@Valid @RequestBody`, not yet
  exercised by any real endpoint but ready for `cellar`/`cart`).
- **Response shape**: both get `400` with `detail: "Validation failed"`
  and an `errors: [{field, message}, ...]` extension property
  (`FieldErrorDto`), logged at `WARN` per
  [ADR-0013](0013-logging-conventions.md) — an anticipated, already-handled
  condition, not a failure.
- **Explicit precedence over Spring Boot's own default advice.**
  `@Order(Ordered.HIGHEST_PRECEDENCE)` on the class is required, not optional
  styling: without it Boot's default advice wins every tie and
  `GlobalExceptionHandler`'s handlers silently never run. See Evidence for
  the mechanism.
- **No-overlap rule**: `GlobalExceptionHandler` never handles a type any
  module's own advice also handles. Business exceptions ("designed as API
  responses") always stay in the owning module's own advice. This is a
  convention maintained by discipline — Spring does not enforce it, and an
  accidental overlap fails silently rather than loudly (see Evidence).
- **No catch-all**: `GlobalExceptionHandler` has no fallback handler for
  arbitrary exceptions — that would repeat the anti-pattern the existing
  error-handling convention already warns against. Anything else still
  falls through to Spring's default handling (ADR-0013), unchanged.
- **ArchUnit rule widened**: `controllersAndAdviceLiveInWeb` now accepts
  `fi.kalia.*.web..` (any module's own web package, unchanged) OR
  `fi.kalia.web..` (this one sanctioned shared location) — the two
  patterns are disjoint, so nothing else is loosened.

## Alternatives considered

Three placement options were weighed.

**A shared non-annotated base class extended by a thin per-module
`@RestControllerAdvice` subclass.** Avoids any ArchUnit change, which was its
main attraction. Rejected because it requires a new subclass in every module,
forever — a tax paid by every future module to preserve a rule that can
instead be widened once, precisely and disjointly.

**No shared code, duplicating the logic in every module.** Rejected: this is
the duplication the task exists to prevent, and it guarantees the modules
drift apart in how they report the same class of error.

**One shared root-level advice, widening the ArchUnit rule** — chosen. It
matches common Spring Boot practice (one global advice for framework-level
concerns, per-domain advice for business ones) and avoids both the
forever-growing subclass tax and the duplication.

## Consequences

- Good, because every future module inherits field-level validation errors for
  free — no per-module duplication — and inherits Boot's defaults, unchanged,
  for every other generic exception.
- Good, because `GlobalExceptionHandler` is ADR-0013's first real logging
  call, using `@Slf4j` + parameterized `WARN` logging exactly as that ADR
  specifies, which makes the convention concrete rather than theoretical.
- Bad, because the no-overlap rule has no enforcement. Spring resolves a
  duplicate-type tie silently by precedence, and because
  `GlobalExceptionHandler` runs at `Ordered.HIGHEST_PRECEDENCE`, an
  accidental future overlap with a module's own advice would resolve in its
  favour — masking the mistake rather than surfacing it. Nothing fails; the
  module's handler simply stops running.
- Bad, because `@Order(Ordered.HIGHEST_PRECEDENCE)` reads as decorative and
  removing it breaks the feature with no error at all. It is load-bearing
  configuration that looks like style.
- Neutral, because `fi.kalia.web` is now, alongside `fi.kalia.*.web`, one of
  exactly two sanctioned locations for
  `@RestControllerAdvice`/`@RestController`; any third location fails
  `ArchitectureTest`.
- Neutral, because adding a handler here later means first measuring what Boot
  already returns for that exception, and keeping any headers Boot sets — a
  `ProblemDetail` return type carries none. `GlobalExceptionHandlerIT` pins
  the 405 `Allow` header specifically so a future override cannot drop it
  unnoticed.

## Evidence

**Boot's field-level output was measured against the running app**, not
inferred: `?minAbv=-1` returns `{"detail":"Validation failure","status":400}`
and a `@Valid @RequestBody` violation returns
`{"detail":"Invalid request content."}`.

**Overriding a Boot handler can silently lose behavior.** The 405 case proved
this during implementation: a handler returning a bare `ProblemDetail`
carries no headers, so overriding 405 silently dropped the `Allow` header RFC
9110 requires. This is why the decision handles only the two exceptions where
Boot is measurably worse.

**How the precedence tie resolves.** Spring Boot auto-registers
`ProblemDetailsExceptionHandler` (`spring.mvc.problemdetails.enabled=true`)
as a `@ControllerAdvice` targeting these same exception types, with no
`@Order` of its own (defaults to `Ordered.LOWEST_PRECEDENCE`). Spring's
`ExceptionHandlerExceptionResolver` resolves advice-bean ties by trying beans
in `@Order` sequence and stopping at the first match, so without an explicit
higher-precedence `@Order`, Boot's default wins every time and
`GlobalExceptionHandler`'s handlers never run — no error; requests just fall
back to Spring's generic ProblemDetail text with no field-level detail.

**Duplicate handling across advice classes produces no startup error.** Two
advice beans handling the same exception type resolve silently by `@Order`;
only two equally-specific handlers *within the same advice class* trigger an
ambiguous-mapping error. This branch's own central bug is proof:
`GlobalExceptionHandler` and Spring Boot's `ProblemDetailsExceptionHandler`
both targeted the same exception types with no error, and the tie resolved
silently by precedence until diagnosed.
