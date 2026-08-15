# ADR-0023: API failures are a tagged `ApiError`, and a non-2xx status is not one

- **Status:** accepted
- **Date:** 2026-07-27
- **Amended:** 2026-08-11 by [ADR-0037](0037-functional-modules.md) — corrected
  the "Alternatives considered" reasoning against subclassing `Error`

## Context

Everything that can go wrong with a backend call — a dead connection, a slow
one, a 500, a body that isn't JSON — arrived at the caller as a bare `Error`.
Distinguishing them meant matching on the message string, which is both
fragile and untranslatable.

[ADR-0012](0012-orval-api-client.md) recorded this as a known gap on the
server side ("non-200 responses aren't documented via `@ApiResponse`, so the
generated response types are optimistic… Revisit if/when a consumer needs
typed error responses"). The consumer arrived with the frontend error-state
work: rendering a useful message requires knowing *which* failure occurred,
and a retry button only makes sense for some of them.

Two local constraints shape the answer. The frontend bans function
declarations and expressions in favour of arrow functions
(`frontend/README.md`, ESLint-enforced), and a class constructor is a function
expression. Meanwhile the Next.js error boundary and stack traces both require
a real `Error` — so whatever this is, it has to remain one.

Written after the fact per [ADR-0020](0020-documentation-roles.md); the
reasoning previously lived only in a ten-line `frontend/README.md` bullet.

## Decision

**Every failure inside `kaliaFetch` is raised as an `ApiError` carrying a
`kind` tag, and an HTTP error status is deliberately not one of them.**

- **Four kinds**, defined with the constructor and guard in
  `lib/api/api-error.ts`: `network`, `timeout`, `http`, `parse`. Callers branch on
  `isApiError(e) && e.kind === …` rather than reading a message. `status` is
  present for `http` and `parse`, absent for `network` and `timeout`.
- **Built by decoration, not subclassing.** `apiError()` returns
  `Object.assign(new Error(message, { cause }), { name: "ApiError", kind,
  status })`. This satisfies both constraints at once: no class constructor,
  and the result is a genuine `Error` the framework can handle.
- **`isApiError` checks the name *and* the presence of `kind`.** The name
  alone would admit any `Error` that happened to borrow it, and the guard
  promises callers something to branch on.
- **A non-2xx status is not raised by `kaliaFetch`.** The caller decides what
  a status means — a 404 from `getBeer` is "no such beer", a legitimate
  domain answer, not a transport failure. Only the caller knows which is
  which, so the fetch layer does not pre-judge it.

## Alternatives considered

**Subclass `Error`.** The idiomatic answer in TypeScript, and it gives
`instanceof ApiError` for free. Rejected because this frontend writes no
classes in hand-written code, a convention recorded in
[ADR-0037](0037-functional-modules.md) — not, as first written here, a side
effect of the arrow-function rule above. A class constructor is a function
expression, so that rule catches a class *with* a constructor, but a bodyless
class passed it untouched; empirically, the rule never reached the class
declaration itself (evidence in ADR-0037). The rejection stands regardless:
`apiError()` decorates a plain `Error` rather than constructing a subclass of
one, which keeps the result usable by the Next.js error boundary and stack
traces without a second construct alongside it.

**A discriminated union of plain objects**, returned rather than thrown.
Arguably cleaner, and it makes failure impossible to ignore at the type
level. Rejected because the value must survive being thrown through the
Next.js error boundary, which expects an `Error`; a plain object loses the
stack trace and is rendered uselessly by the boundary.

**Throw on every non-2xx status**, the conventional behaviour for a fetch
wrapper and what most HTTP clients do. Rejected because it forces every
caller to catch in order to handle an expected outcome: a missing beer is a
normal result of `getBeer`, and making it an exception means writing
`try`/`catch` around the happy path.

**Keep bare `Error`s and match on messages.** The status quo. Rejected as
untranslatable and fragile — message text is UI copy, and matching against it
couples error handling to wording that changes.

## Consequences

- Good, because a caller can render a specific, translated message and decide
  whether a retry makes sense, without parsing anything.
- Good, because the fetch layer stops deciding what a 404 means, so the same
  wrapper serves callers that treat it as an error and callers that treat it
  as data.
- Bad, because `ApiError` is a structural type, not a class, so
  `instanceof ApiError` does not exist and `isApiError` is the only correct
  check. A future contributor reaching for `instanceof` gets no compile error
  — the shape is a plain `Error` at runtime.
- Bad, because the four kinds are the ones that mattered when this was
  written. A fifth (an aborted request, say) means touching the union, the
  guard's contract, and every exhaustive branch on it.
- Neutral, because this closes ADR-0012's open gap on the client side only.
  The backend still does not document non-200 responses via `@ApiResponse`,
  so the generated types remain optimistic; this ADR types what the client
  observes at runtime, not what the spec promises.
- **Revisit trigger:** if the backend later documents its error responses in
  the OpenAPI spec, the generated client would carry typed errors of its own,
  and the overlap between those and `ApiError`'s `http` kind should be
  resolved rather than left as two parallel vocabularies.
