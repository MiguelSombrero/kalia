# Task 04: Correct ADR-0023 and record the functional-modules convention

- **Status:** done
- **Iteration:** [5](../iteration-5.md)

## Why

[ADR-0023](../../adr/0023-typed-api-failures.md) rejects subclassing `Error`
because "a class declaration is exactly the construct the frontend's ESLint
configuration bans." That is not what the configuration does:
`no-restricted-syntax` in `eslint.config.mjs` restricts `FunctionDeclaration`
and `FunctionExpression`, neither of which is `ClassDeclaration`. It reaches
class constructors and methods only incidentally, because in ESTree a
`MethodDefinition`'s value is itself a `FunctionExpression`. The frontend's
most distinctive property — no classes anywhere in hand-written code — is
presently a side effect of a rule about function style, not a decision anyone
made. That is exactly the drift CLAUDE.md's first goal exists to catch: docs
and implementation disagreeing about *why* something is true.

The same review that found this also found the rule has outgrown its home.
[ADR-0020](../../adr/0020-documentation-roles.md) states the test directly:
"when a rule outgrows the README's one-line bar and has no ADR, that is the
signal to write the ADR." The arrow-functions bullet
([README.md](../../../frontend/README.md)) has since shaped ADR-0023's
decision — it has outgrown it.

## Scope

Confirm the ESLint claim empirically, then amend ADR-0023's reasoning and
record the broader convention it is one instance of: discriminated unions and
type-guard predicates as the replacement for polymorphism, factory functions
rather than constructors for dependency injection, and `type` over
`interface`. `lib/auth/valkeyAdapter.ts` becomes the new ADR's worked example
for factory-function injection, replacing its module-level `valkeyClient`
import with a parameter so `valkeyAdapter.test.ts` no longer needs
`vi.mock("./valkeyClient")`.

Also add an explicit `ClassDeclaration` selector to `no-restricted-syntax`
(`frontend/eslint.config.mjs`), so the ban on classes is enforced directly
rather than as a side effect of the function-style rule — closing the
bodyless-class gap this task's review found.

## Non-goals

- Reopening whether to allow classes at all — this task corrects and records
  the reasoning behind the existing choice, it does not relitigate it.
- Enforcing import direction between features or modules —
  [task 05](05-enforce-frontend-module-boundaries.md).

## Constraints

- Accepted ADRs are amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md), CLAUDE.md).
- ADR-0023's actual load-bearing constraint — the value must remain a real
  `Error` for the Next.js error boundary and stack traces — does not change;
  only the "Alternatives considered" reasoning about the ESLint rule does.
- Code comments carry only what the repo cannot
  ([ADR-0017](../../adr/0017-code-comment-policy.md)) — the same incorrect
  claim is repeated in a comment in `lib/api/api-error.ts` and must be fixed
  alongside the ADR, not left to drift from it again.
- `no-restricted-syntax` gains an explicit `ClassDeclaration` selector
  (product owner decision, 2026-08-11): the ban on classes becomes enforced
  and complete rather than an incidental side effect of the function-style
  rule, closing the bodyless-class gap the review found.
- `@typescript-eslint/eslint-plugin` needs no new dependency for the
  `type`-over-`interface` rule. It is already available transitively via
  `eslint-config-next` → `typescript-eslint@8.64.0`, and its `@typescript-
  eslint` plugin namespace is already registered in the flat config —
  confirmed by running `@typescript-eslint/consistent-type-definitions`
  against a probe file with only that rule added to `eslint.config.mjs`, no
  other config changes.

## Open questions

**None.**

## Acceptance criteria

- [x] `npx eslint` run against a probe file containing a class *with* a
      constructor confirms it is flagged, and a bodyless class confirms it is
      not — this result is the amendment's evidence, recorded in the ADR
- [x] ADR-0023's "Alternatives considered" section states the real constraint
      (must remain an `Error` for the Next.js error boundary) and drops the
      incorrect ESLint claim; `node scripts/check-adrs.mjs` passes
- [x] A new, accepted ADR records the functional-modules convention
      (discriminated unions/type guards, factory-function DI, `type` over
      `interface`), with `lib/auth/valkeyAdapter.ts` refactored to
      `createValkeyAdapter(client)` as its worked example
- [x] `lib/auth/valkeyAdapter.test.ts` no longer calls
      `vi.mock("./valkeyClient")` and passes by injecting the fake client
      directly
- [x] `features/catalog/types.ts`'s `BeerSearchParams` changes from
      `interface` to `type`, the codebase's only hand-written `interface`
- [x] `no-restricted-syntax` in `frontend/eslint.config.mjs` gains an explicit
      `ClassDeclaration` selector; re-running the bodyless-class probe file
      confirms it is now flagged, reversing the earlier empirical result
- [x] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Surfaced by a frontend-modularity review the product owner requested
(2026-08-07), which also produced [task 05](05-enforce-frontend-module-boundaries.md)
and [task 06](06-feature-public-surfaces.md).
