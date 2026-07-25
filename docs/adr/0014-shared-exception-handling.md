# ADR-0014: Shared, module-neutral exception-handling strategy

- **Status:** accepted
- **Date:** 2026-07-25

## Context

`catalog`'s `CatalogExceptionHandler` only handles its own business
exceptions (`BeerNotFoundException`, `InvalidSearchParameterException`).
Nothing handles field-level Bean Validation detail, malformed JSON, or
405 — and whatever does needs a home that doesn't force every future
module (`identity`, `cellar`, ...) to duplicate the same generic logic,
without breaking ADR-0007's ArchUnit rule that `@RestControllerAdvice`
must live in a module's own `web` package.

Three options were weighed: (1) one shared root-level advice, widening
the ArchUnit rule to allow it; (2) a shared non-annotated base class
extended by a thin per-module `@RestControllerAdvice` subclass, avoiding
any ArchUnit change but requiring a new subclass per module forever; (3)
no shared code, duplicating generic handling in every module.

## Decision

- **One shared advice**: `GlobalExceptionHandler`
  (`@RestControllerAdvice`) in a new root-level package `fi.kalia.web`
  (parallel to `fi.kalia.catalog`), handling only generic,
  module-neutral Spring MVC exceptions. Matches common Spring Boot
  practice (one global advice for framework-level concerns, per-domain
  advice for business ones) and avoids both the forever-growing
  subclass tax of option 2 and the duplication option 3 exists to
  prevent.
- **Explicit precedence over Spring Boot's own default advice**: Spring
  Boot auto-registers `ProblemDetailsExceptionHandler`
  (`spring.mvc.problemdetails.enabled=true`) as a `@ControllerAdvice`
  targeting these same four exception types, with no `@Order` of its own
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
  module's own advice also handles — Spring throws an ambiguous-mapping
  error at runtime if two advice beans register for the same exception
  type, so this is a hard constraint, not style. Business exceptions
  ("designed as API responses") always stay in the owning module's own
  advice.
- **No catch-all**: `GlobalExceptionHandler` has no fallback handler for
  arbitrary exceptions — that would repeat the anti-pattern the existing
  error-handling convention already warns against. Anything else still
  falls through to Spring's default handling (ADR-0013), unchanged.
- **Exception types handled**: `HandlerMethodValidationException`
  (Spring's native `@RequestParam`/`@PathVariable` Bean Validation path
  — this codebase has deliberately opted out of the older
  `@Validated`/AOP path that throws `ConstraintViolationException`, per
  `CatalogController.java`'s existing comment, so that type is
  deliberately not handled here — nothing in the app can trigger it),
  `MethodArgumentNotValidException` (`@Valid @RequestBody`, not yet
  exercised by any real endpoint but ready for `cellar`/`cart`),
  `HttpMessageNotReadableException` (malformed JSON),
  `HttpRequestMethodNotSupportedException` (405).
- **Response shapes**: field-level validation failures get `400` with
  `detail: "Validation failed"` and an `errors: [{field, message}, ...]`
  extension property (`FieldErrorDto`); malformed JSON gets `400` with
  `detail: "Malformed request body"` and no `errors` (nothing parsed);
  405 gets `detail` naming the rejected and supported methods. All log
  at `WARN` per ADR-0013 — anticipated, already-handled conditions, not
  failures.
- The raw parser exception message for malformed JSON is never echoed
  into the response or logged, since it can embed the offending
  payload (ADR-0013's no-secrets/PII rule).

## Consequences

- Every future module inherits field-level validation, malformed-JSON,
  and 405 handling for free — no per-module duplication.
- `fi.kalia.web` is now, alongside `fi.kalia.*.web`, one of exactly two
  sanctioned locations for `@RestControllerAdvice`/`@RestController`;
  any third location fails `ArchitectureTest`.
- This is ADR-0013's first real logging call — `GlobalExceptionHandler`
  uses `@Slf4j` + parameterized `WARN` logging exactly as that ADR
  specifies.
