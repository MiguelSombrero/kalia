# ADR-0037: The frontend is functional — no classes, discriminated unions over polymorphism, factory functions for DI

- **Status:** accepted
- **Date:** 2026-08-11

## Context

The frontend has never had a hand-written class. Until now that was a side
effect, not a decision: `no-restricted-syntax` bans `FunctionDeclaration` and
`FunctionExpression` in favour of arrow functions (`frontend/README.md`), and
a class constructor or method body is, in ESTree terms, itself a
`FunctionExpression`. [ADR-0023](0023-typed-api-failures.md) leaned on that
side effect explicitly, rejecting a class-based `ApiError` because "a class
declaration is exactly the construct the frontend's ESLint configuration
bans." That claim does not hold: the rule reaches a class's methods and
constructor, not the class declaration itself — a class with no constructor
and no methods passes it untouched (see Evidence). The convention was real,
but the reason given for it was not, which is exactly the drift CLAUDE.md's
first goal exists to catch.

The same review that found this also found the convention had outgrown its
home. [ADR-0020](0020-documentation-roles.md) sets the test directly: "when a
rule outgrows the README's one-line bar and has no ADR, that is the signal to
write the ADR." Three related choices sit in that gap, none previously
recorded anywhere beyond a comment or a pattern the codebase happened to
follow: no classes, discriminated unions and type guards standing in for the
polymorphism a class hierarchy would otherwise provide, factory functions
rather than constructors for dependency injection, and `type` over
`interface`.

## Decision

**The frontend is written in a functional style: no hand-written classes,
discriminated unions with type-guard predicates in place of class
hierarchies, factory functions for dependency injection, and `type` over
`interface`.**

- **No classes.** `no-restricted-syntax` in `frontend/eslint.config.mjs` now
  bans `ClassDeclaration` directly, closing the gap Evidence describes —
  the ban on classes is enforced on its own terms, not as an incidental
  reach of the function-style rules.
- **Discriminated unions and type-guard predicates replace polymorphism.** A
  family of related shapes gets a `kind`-tagged union and an `isX`
  predicate narrowing on it, not a base class with subclasses. Worked
  example: `ApiError` (`lib/api/api-error.ts`, ADR-0023) — `ApiErrorKind`
  is the tag, `isApiError` the guard, and callers branch with
  `isApiError(e) && e.kind === …` rather than `instanceof`.
- **Factory functions, not constructors, for dependency injection.** A
  module that needs an external dependency (a client, a connection) exports
  a function taking that dependency as a parameter and returning the
  module's public surface built from it, rather than a class whose
  constructor stores the dependency on `this`. Worked example:
  `lib/auth/valkeyAdapter.ts`'s `createValkeyAdapter(client)` returns the
  Auth.js adapter plus its session-scoped helpers, all closing over
  `client` instead of importing the module-level Valkey singleton
  directly; the module still wires one production instance from the real
  client for every other file to import, same as before.
- **`type` over `interface`.** Enforced by
  `@typescript-eslint/consistent-type-definitions` (`frontend/eslint.config.mjs`).
  Worked example: `features/catalog/types.ts`'s `BeerSearchParams`, the
  codebase's only hand-written `interface` before this decision.

This is a style decision, not a ban on OOP-shaped *values* — `ApiError`
still satisfies `instanceof Error`, because [ADR-0023](0023-typed-api-failures.md)'s
underlying constraint (the Next.js error boundary and stack traces need a
real `Error`) is about the runtime type, not about how the code that builds
one is written.

## Alternatives considered

**Leave the convention as an ESLint side effect and document nothing.** The
status quo. Rejected: it leaves the reasoning readable only by tracing
`no-restricted-syntax`'s selectors against ESTree semantics, which is how
ADR-0023 stated it wrong in the first place, and it does not cover the
discriminated-union, factory-DI or `type`-over-`interface` conventions at
all, which existed only as unwritten patterns other code happened to follow.

**One ADR per convention**, following
[ADR-0032](0032-when-a-decision-earns-an-adr.md)'s general preference for
narrow, separable decisions. Rejected here specifically: the four rules are
one decision — "the frontend is written functionally" — not four independent
ones that could be reversed separately. Discriminated unions and factory
functions are both direct substitutes for what a class would otherwise be
used for, and splitting them from the no-classes rule they exist to satisfy
would scatter one rationale across documents that would always need to be
read together.

**Allow classes for dependency-injection containers specifically**, since
that is the pattern most other TypeScript codebases reach for. Rejected: the
factory-function form (`createX(dep)`) gives the same capability — a typed
seam a test can inject a fake into — without a second construct alongside
arrow functions and discriminated unions, and `lib/auth/valkeyAdapter.ts`
already demonstrated it working before this ADR made it a rule.

## Consequences

- Good, because the reasoning behind the frontend's most distinctive
  property — no classes anywhere in hand-written code — is now correct and
  in one place, rather than reachable only by reverse-engineering an ESLint
  selector.
- Good, because `no-restricted-syntax`'s `ClassDeclaration` selector now
  enforces the rule directly: a future bodyless class (a legitimate way to
  ban the rule, since bodyless classes triggered no error before it existed)
  is caught at lint time instead of merging silently.
- Good, because dependency injection has one documented shape
  (`createX(dependency)`) instead of each module improvising its own —
  `lib/auth/valkeyAdapter.ts`'s refactor is the template a future module
  with an external dependency can copy directly.
- Bad, because a factory-function module now carries two exports where a
  class would have carried one: the factory (`createValkeyAdapter`) for
  tests, and a pre-wired production instance (`valkeyAdapter`,
  `getSessionAccount`, …) for every other call site. A reader unfamiliar
  with the pattern has to notice both exist and that the second is built
  from the first, rather than seeing one class importable everywhere.
- Neutral, because this formalizes existing practice rather than changing
  running code — `ApiError`'s shape, and every other module's structure,
  is unchanged; only `valkeyAdapter.ts` (the worked example) and
  `BeerSearchParams` were touched to demonstrate the rules empirically.
- **Revisit trigger:** if a future dependency genuinely needs per-instance
  mutable state with several interacting methods (the case classes exist
  for), re-examine whether a closure-returning factory is still the more
  readable shape or whether that is the exception this ADR should carve out.

## Evidence

Ran `npx eslint` (ESLint 9, `eslint-config-next` → `typescript-eslint@8.64.0`)
against two probe files, before and after adding the `ClassDeclaration`
selector to `no-restricted-syntax`:

**Before** (only `FunctionDeclaration`/`FunctionExpression` selectors):

```ts
// probe-with-constructor.ts
export class WithConstructor {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}
```
→ `3:14 error Prefer arrow functions over function expressions` — the
constructor is caught, the class declaration is not.

```ts
// probe-bodyless.ts
export class Bodyless {
  value = 1;
}
```
→ no error. A class with no constructor and no methods passes entirely
unflagged, confirming ADR-0023's claim was wrong: the rule the frontend
actually had did not ban class declarations.

**After** adding `{ selector: "ClassDeclaration", message: "…" }`: both
probe files are flagged, `probe-bodyless.ts` newly so —
`1:8 error No classes: discriminated unions, type guards and factory
functions instead (ADR-0037)` on both.

Confirmed `@typescript-eslint/consistent-type-definitions` needs no new
dependency: added alone (`["error", "type"]`, no other config change) to
`frontend/eslint.config.mjs` and run against a probe `interface`
declaration — `1:18 error Use a \`type\` instead of an \`interface\``,
using the `@typescript-eslint` plugin namespace `eslint-config-next`'s
`typescript-eslint@8.64.0` already registers in the flat config.
