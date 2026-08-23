# ADR-0042: Every backend request parameter is bounded, named, and cross-field checks report through `detail`

- **Status:** accepted
- **Date:** 2026-08-23

## Context

`backend/README.md`'s "Every request parameter is bounded" convention carried
multi-line "why" rationale with no ADR behind it — why a bound must be a named
constant rather than a bare annotation value, and why a constraint spanning
two parameters (`minAbv`/`maxAbv`) is checked in the handler and reported
through `detail` rather than as a Bean Validation annotation. Per
[ADR-0020](0020-documentation-roles.md), rationale a README bullet has
outgrown belongs in an ADR, not left unlinked in the README itself. Neither
[ADR-0007](0007-backend-package-structure.md) (package structure) nor
[ADR-0014](0014-shared-exception-handling.md) (which shared advice handles
which Bean Validation exception type) is a close enough topical fit for this
rationale to fold into — resolved by the product owner during iteration 5.5
task 01's refinement.

## Decision

**Every request parameter that reaches a query is bounded by a Bean
Validation constraint, and any bound spanning more than one parameter is
checked by hand and reported through `detail`.**

- Numeric parameters carry both ends of their range (`@DecimalMin`/
  `@DecimalMax`, `@Min`/`@Max`); free text carries `@Size`. No caller can hand
  the database an unbounded or nonsensical value — an unbounded `LIKE` scan,
  a page size that returns the whole table.
- **Bounds are named constants with a comment stating why that particular
  number**, not a bare annotation value. A bound nobody can justify is the one
  the next person changes because it's inconvenient; naming it and writing the
  reason down survives review in a way `@Max(100)` alone does not (see
  `CatalogController.MAX_ABV`/`MAX_FILTER_LENGTH`,
  `AddBottleRequestDto.MIN_QUANTITY`/`MAX_QUANTITY`).
- **A constraint spanning two parameters cannot be a Bean Validation
  annotation on either one** — no standard constraint sees both. It is
  checked in the handler and reported through the module's exception type
  designed for API responses, via `ProblemDetail.detail` rather than the
  field-level `errors` array, since the violation belongs to the pair, not to
  either field alone (`CatalogController.requireOrderedAbvRange`).

## Alternatives considered

**Folding this into [ADR-0007](0007-backend-package-structure.md).** Rejected
— ADR-0007 is about module layering (`domain`/`application`/`web`), not about
what gets validated at the API boundary or why.

**Folding this into [ADR-0014](0014-shared-exception-handling.md).** Rejected
— ADR-0014 decides which shared advice handles which Bean Validation
exception *type*; it says nothing about which parameters need a bound or how
a bound spanning two fields is reported.

**A custom cross-field Bean Validation constraint** (e.g. a class-level
`@OrderedRange` annotation) instead of a handler-level check. Rejected: Bean
Validation reports through the field-level `errors` array by design, which
misattributes a violation that belongs to neither field alone; a custom
constraint would still need to route around that to reach `detail`, for one
constraint pair, at the cost of an extra annotation class and its own test.

## Consequences

- Good, because every future numeric or free-text request parameter has one
  documented pattern to follow, rather than each endpoint re-deriving it.
- Good, because the convention already has two concrete precedents —
  `CatalogController`'s search parameters and `requireOrderedAbvRange`, and
  `AddBottleRequestDto`'s bulk-add `quantity` — rather than being an abstract
  rule with nothing to point at.
- Bad, because a single request now has its parameters validated at two
  different points in the request path — Bean Validation before the handler
  body runs, the cross-field check inside it — so confirming "is this
  parameter bounded" means checking both.
- **Revisit trigger:** a second cross-field constraint pair appears (e.g.
  paging bounds interacting with a filter) — worth checking then whether one
  handler-level pattern still reads clearly across two call sites or earns a
  small shared helper.
