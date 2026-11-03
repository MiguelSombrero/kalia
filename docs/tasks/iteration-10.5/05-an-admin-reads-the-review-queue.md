# Task 05: An admin reads the queue of suggestions waiting for review

- **Status:** needs-refinement
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-2

## Why

An admin cannot review what they cannot see. Today the only way to find what
is waiting is a SQL query in `backend/README.md` that counts pending rows per
contributor; nothing lists the suggestions themselves, with the beer, its
brewery, who suggested it and when. This task creates the module
[task 02](02-decision-what-reviewing-a-suggestion-does.md) chose and its first
read, which tasks [06](06-an-admin-approves-or-rejects-a-suggestion.md) and
[07](07-an-admin-edits-a-suggestion-before-approving-it.md) then act on.

Naming the contributor runs into a gap the quality backlog already recorded:
`ProfileApi` hands out a username only through cellar visibility, so the feed
can name a user only while their cellar is public, and an admin's view of a
contributor with a private cellar has no way to name them (COULD-81).

## Scope

The admin API lists the suggestions waiting for review, oldest first and
paginated, each with the suggested beer, its brewery and whether that brewery
is new, the contributor's username, and when it was suggested; and reads one
suggestion by id. Only an admin may call either
([task 04](04-the-admin-role-exists-and-the-api-refuses-everyone-else.md)).
The module exists, is in the architecture's module table and diagram, and
passes the boundary checks.

## Non-goals

- Acting on a suggestion — [tasks 06](06-an-admin-approves-or-rejects-a-suggestion.md)
  and [07](07-an-admin-edits-a-suggestion-before-approving-it.md).
- The page — [task 11](11-design-the-admin-review-page.md).
- Searching or filtering the queue beyond its order, until a queue is long
  enough to need it.

## Constraints

- **This task cannot be refined before [task 02](02-decision-what-reviewing-a-suggestion-does.md)
  is done.**
- A new module follows [architecture §3](../../architecture.md#3-backend-modules):
  layered `domain`/`application`/`web`, its root package empty until a
  consumer arrives, verified by `ModularityTest` and `ArchitectureTest`; the
  module diagram in §2 is drift-checked by `ArchitectureDocumentationTest`.
- DTOs at the API boundary, never a domain entity
  ([iteration 7 task 13](../iteration-7/13-guard-dtos-at-the-api-boundary.md)).
- Every list is paginated in the one envelope and every parameter bounded
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)).
- Every response an operation sends is in the spec, and the committed
  `backend/openapi.json` fails a breaking diff
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md));
  a new path is additive.
- The contributor is kept out of every *public* read response
  ([iteration 8 task 03](../iteration-8/03-add-beer-ui.md)); an admin read is
  the one place it is served.

## Open questions

1. **Naming the contributor (COULD-81, `[needs decision]`):** split a username
   lookup from the cellar-visibility predicate in `ProfileApi`, so any module
   can name a user, or record that only an admin-facing read may name a
   private-cellar user and add a lookup for that alone.
2. **What the list shows beside each suggestion:** the contributor's other
   pending suggestions, how many of their earlier ones were rejected, or the
   catalog's similar names that may make it a duplicate.
3. **Page size and order:** oldest first, as a queue, or newest first.

## Acceptance criteria

- [ ] An integration test lists suggestions with and without a new brewery,
      oldest first and paginated, each naming its contributor — including a
      contributor whose cellar is private
- [ ] An integration test shows the list and the single read refused to a
      non-admin and to an anonymous caller
- [ ] A suggestion already approved or rejected is not in the list — test
- [ ] `ModularityTest`, `ArchitectureTest` and `ArchitectureDocumentationTest`
      pass with the new module, and §3's table and §2's diagram name it
- [ ] The committed spec carries both operations, the generated web client is
      regenerated, and the glossary carries the module's terms
- [ ] `make verify-fast` is green

## Notes

Provenance: the product owner's brief for iteration 10.5 ("own module and API
for ADMIN operations"); [quality backlog](../quality-backlog.md) COULD-81,
`[needs decision]` (open question 1).
