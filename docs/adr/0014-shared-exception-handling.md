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

The one real gap is **field-level detail**. Measured against the running
app, Boot reports a rejected `?minAbv=-1` as
`{"detail":"Validation failure","status":400}` — naming neither the
offending field nor the constraint — and a `@Valid @RequestBody`
violation as `{"detail":"Invalid request content."}`. An API consumer
cannot tell *what* to fix. Iteration 3 task 2 and the iteration's "Done
when" both require field-level detail, so that gap has to be closed
somewhere that doesn't force every future module (`identity`, `cellar`,
...) to duplicate the same logic, without breaking ADR-0007's ArchUnit
rule that `@RestControllerAdvice` must live in a module's own `web`
package.

Three placement options were weighed: (1) one shared root-level advice,
widening the ArchUnit rule to allow it; (2) a shared non-annotated base
class extended by a thin per-module `@RestControllerAdvice` subclass,
avoiding any ArchUnit change but requiring a new subclass per module
forever; (3) no shared code, duplicating the logic in every module.

## Decision

- **One shared advice**: `GlobalExceptionHandler`
  (`@RestControllerAdvice`) in a new root-level package `fi.kalia.web`
  (parallel to `fi.kalia.catalog`). Matches common Spring Boot
  practice (one global advice for framework-level concerns, per-domain
  advice for business ones) and avoids both the forever-growing
  subclass tax of option 2 and the duplication option 3 exists to
  prevent.
- **Handle only what Boot does worse, not everything Boot handles.**
  `GlobalExceptionHandler` overrides Boot for exactly the two Bean
  Validation exceptions, because those are where the field-level gap
  is. Every other generic exception — malformed JSON, 405, 415, unknown
  route, type mismatch, ... — is deliberately left to Boot's defaults.
  Overriding those would mean re-wording a `detail` string for no
  functional gain, at the cost of a handler to maintain, and (as the
  405 case proved during implementation) risks *losing* behavior Boot
  gets right: a handler returning a bare `ProblemDetail` carries no
  headers, so overriding 405 silently dropped the `Allow` header RFC
  9110 requires. An override must earn its place against measured Boot
  behavior; "we have a global handler, so it should handle everything"
  is not a reason.
- **Explicit precedence over Spring Boot's own default advice**: Spring
  Boot auto-registers `ProblemDetailsExceptionHandler`
  (`spring.mvc.problemdetails.enabled=true`) as a `@ControllerAdvice`
  targeting these same exception types, with no `@Order` of its own
  (defaults to `Ordered.LOWEST_PRECEDENCE`). Without an explicit,
  higher-precedence `@Order` on `GlobalExceptionHandler`, Spring's
  `ExceptionHandlerExceptionResolver` resolves advice-bean ties by trying
  beans in `@Order` sequence and stopping at the first match — Boot's
  default would win every time, and `GlobalExceptionHandler`'s handlers
  would silently never run (no error; requests would just fall back to
  Spring's generic ProblemDetail text with no field-level detail).
  `@Order(Ordered.HIGHEST_PRECEDENCE)` on the class is therefore required,
  not optional styling — removing it breaks the feature silently.
- **ArchUnit rule widened**: `controllersAndAdviceLiveInWeb` now accepts
  `fi.kalia.*.web..` (any module's own web package, unchanged) OR
  `fi.kalia.web..` (this one sanctioned shared location) — the two
  patterns are disjoint, so nothing else is loosened.
- **No-overlap rule**: `GlobalExceptionHandler` never handles a type any
  module's own advice also handles. This is a convention to maintain by
  discipline, not something Spring enforces: two advice beans handling
  the same exception type do not produce a startup error — Spring
  resolves the tie silently by `@Order` (first bean in order with a
  matching handler wins; only two equally-specific handlers *within the
  same advice class* trigger an ambiguous-mapping error). This branch's
  own central bug is proof: `GlobalExceptionHandler` and Spring Boot's
  `ProblemDetailsExceptionHandler` both targeted the same exception
  types with no error, and the tie resolved silently by precedence until
  diagnosed. Because `GlobalExceptionHandler` runs at
  `Ordered.HIGHEST_PRECEDENCE`, an accidental future overlap with a
  module's own advice would resolve the same way — `GlobalExceptionHandler`
  would silently win, masking rather than surfacing the mistake. Business
  exceptions ("designed as API responses") always stay in the owning
  module's own advice.
- **No catch-all**: `GlobalExceptionHandler` has no fallback handler for
  arbitrary exceptions — that would repeat the anti-pattern the existing
  error-handling convention already warns against. Anything else still
  falls through to Spring's default handling (ADR-0013), unchanged.
- **Exception types handled**: exactly two.
  `HandlerMethodValidationException` (Spring's native
  `@RequestParam`/`@PathVariable` Bean Validation path — this codebase
  has deliberately opted out of the older `@Validated`/AOP path that
  throws `ConstraintViolationException`, per `CatalogController.java`'s
  existing comment, so that type is deliberately not handled here —
  nothing in the app can trigger it) and
  `MethodArgumentNotValidException` (`@Valid @RequestBody`, not yet
  exercised by any real endpoint but ready for `cellar`/`cart`).
- **Response shape**: both get `400` with `detail: "Validation failed"`
  and an `errors: [{field, message}, ...]` extension property
  (`FieldErrorDto`), logged at `WARN` per ADR-0013 — an anticipated,
  already-handled condition, not a failure.

## Consequences

- Every future module inherits field-level validation errors for free —
  no per-module duplication — and inherits Boot's defaults, unchanged,
  for every other generic exception.
- `fi.kalia.web` is now, alongside `fi.kalia.*.web`, one of exactly two
  sanctioned locations for `@RestControllerAdvice`/`@RestController`;
  any third location fails `ArchitectureTest`.
- This is ADR-0013's first real logging call — `GlobalExceptionHandler`
  uses `@Slf4j` + parameterized `WARN` logging exactly as that ADR
  specifies.
- Adding a handler here later means first measuring what Boot already
  returns for that exception, and keeping any headers Boot sets — a
  `ProblemDetail` return type carries none. `GlobalExceptionHandlerIT`
  pins the 405 `Allow` header specifically so a future override cannot
  drop it unnoticed.
