# ADR-0010: react-hook-form + Zod for forms and validation

- **Status:** accepted
- **Date:** 2026-07-21

## Context

The frontend-standards iteration fixes the form stack before the first
stateful forms arrive (cellar add/edit in the cellar iteration; checkout if
the own-store variant is ever chosen). Architecture §5 already named Zod
for boundary validation "where forms appear"; this ADR makes the full stack
and its boundary precise.

## Decision

- **react-hook-form 7.82.0 + Zod 4.4.3** (bridged by `@hookform/resolvers`
  5.4.0) is the standard for **stateful, validated forms** — data entry and
  mutations. The Zod schema is the single source of truth for a form's
  shape and rules; react-hook-form owns registration, submission state and
  error display; the resolver connects them. No hand-rolled validation
  logic in components.
- **URL-driven GET search/filter forms stay native** (PO-confirmed): the
  catalog `SearchFilters` is a plain GET form — filters land in the URL,
  it works without JavaScript, and there is nothing to validate. Migrating
  it to react-hook-form would force it client-side for zero benefit. The
  test: if submitting should *navigate* (state into the URL), the form is
  native; if submitting should *mutate or validate*, it uses this stack.
- Zod schemas live with their feature (`features/<feature>/`), colocated
  with the form that owns them; shared schemas are promoted only when a
  second feature uses them (same rule as shared components).

## Consequences

- Install-only for now: no stateful form exists, so the first form (and
  its tests — validation rules are exactly the "valuable tests" our
  conventions call for) arrives with the cellar iteration.
- Form error UX (inline messages, aria-invalid/aria-describedby wiring)
  gets standardized when the accessibility task (iteration 2, task 7) and
  the first real form meet.
- Zod's role may widen later (e.g. parsing generated-client responses);
  that is deliberately not decided here — task 6 (OpenAPI clients) owns
  the API-typing story.
