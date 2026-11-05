# Task 05: An admin reads the queue of suggestions waiting for review

- **Status:** done
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-2

## Why

An admin cannot review what they cannot see. Today the only way to find what
is waiting is a SQL query in `backend/README.md` that counts pending rows per
contributor; nothing lists the suggestions themselves, with the beer, its
brewery, who suggested it and when. This task creates the admin API
[task 02](02-decision-what-reviewing-a-suggestion-does.md) chose — inside
`catalog`, not a module of its own — and its first read, which tasks [06](06-an-admin-approves-or-rejects-a-suggestion.md) and
[07](07-an-admin-edits-a-suggestion-before-approving-it.md) then act on.

Naming the contributor runs into a gap the quality backlog already recorded:
`ProfileApi` hands out a username only through cellar visibility, so the feed
can name a user only while their cellar is public, and an admin's view of a
contributor with a private cellar has no way to name them (COULD-81).

## Scope

The admin API lists the suggestions waiting for review, oldest first and
paginated, each with the suggested beer, its brewery and whether that brewery
is new, the contributor's username, and when it was suggested; and reads one
suggestion by id. Each suggestion also carries how many of its contributor's
suggestions are pending and how many were rejected. Only an admin may call
either ([task 04](04-the-admin-role-exists-and-the-api-refuses-everyone-else.md)).
The API is `catalog`'s, as [ADR-0102](../../adr/0102-a-suggestion-is-a-pending-beer-with-its-new-brewery-and-an-admin-reviews-it-inside-catalog-which-publishes-one-event-per-decision.md)
decides, under `/api/v1/admin/suggestions`, and `catalog` names the contributor
through `ProfileApi`.

## Non-goals

- Acting on a suggestion — [tasks 06](06-an-admin-approves-or-rejects-a-suggestion.md)
  and [07](07-an-admin-edits-a-suggestion-before-approving-it.md).
- The page — [task 11](11-design-the-admin-review-page.md).
- Searching or filtering the queue beyond its order, until a queue is long
  enough to need it.

## Constraints

- A module dependency follows [architecture §3](../../architecture.md#3-backend-modules):
  through the root-package API, verified by `ModularityTest` and
  `ArchitectureTest`; the module diagram in §2 is drift-checked by
  `ArchitectureDocumentationTest`.
- DTOs at the API boundary, never a domain entity
  ([iteration 7 task 13](../iteration-7/13-guard-dtos-at-the-api-boundary.md)).
- Every list is paginated in the one envelope and every parameter bounded
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)).
- Every response an operation sends is in the spec, the `403` and `401`
  included, and the operations are tagged apart from the public API, and the committed
  `backend/openapi.json` fails a breaking diff
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md));
  a new path is additive.
- A suggestion is a `PENDING` beer that has a contributor, with its brewery
  when that is `PENDING` too, and its id is its beer's id
  (ADR-0102): there is no suggestion table, so the queue is a query and needs
  no migration.
- "Oldest first" sorts by when the beer was added and then by id, so a page
  boundary never repeats or drops a row when two were added in the same
  instant.
- A profile row is created lazily and may not exist
  ([ADR-0049](../../adr/0049-profile-module-and-public-identity.md)), so a
  contributor can have no username to look up. The listing still carries that
  suggestion, with no username, rather than dropping it or answering `500`;
  how the page shows it is [task 11](11-design-the-admin-review-page.md)'s.
- The counts are the contributor's `PENDING` and `REJECTED` beers, one per
  suggestion — the same count [task 08](08-the-sql-moderation-script-is-retired.md)'s
  cap uses, so the pending count includes the suggestion shown. A `REMOVED`
  beer is neither. For a page they are read in one grouped query, not one per
  row.
- The contributor is kept out of every *public* read response
  ([iteration 8 task 03](../iteration-8/03-add-beer-ui.md)); an admin read is
  the one place it is served.

**Decided at refinement, 2026-11-04** (product owner; the second pass on
2026-11-05 checked this file against ADR-0102):

- **COULD-81: `ProfileApi` gains a username lookup by id, apart from the
  cellar-visibility predicate.** Whether a username may be shown is decided by
  the module that serves it — here, an admin-only read. A lookup scoped to
  admin reads alone was rejected.
- **Beside each suggestion: its contributor's pending and rejected counts.**
  The catalog's similar names were left out; the admin can search the catalog.
- **Oldest first,** as a queue, in the one paginated envelope.

**Decided at refinement, 2026-11-05** (product owner):

- **Reading one suggestion answers only what is still waiting.** A beer that
  was decided meanwhile, and one that was never a suggestion (an imported one),
  both answer `404`, matching the queue, which omits decided ones. A *decision*
  on a decided suggestion answers `409` instead
  ([task 06](06-an-admin-approves-or-rejects-a-suggestion.md)), so the page
  learns the outcome from the action it just tried.

## Open questions

**None.**

## Acceptance criteria

- [x] An integration test lists suggestions with and without a new brewery,
      oldest first and paginated, each naming its contributor — including a
      contributor whose cellar is private and one with no profile row, who is
      listed with no username — and two suggestions added in the same instant
      are never repeated or dropped across a page boundary
- [x] An integration test shows the list and the single read refused to a
      non-admin and to an anonymous caller
- [x] A suggestion already approved or rejected is not in the list — test
- [x] A listed suggestion's id is its beer's id, and reading by that id an
      imported beer, an approved or rejected one, or an unknown id answers
      `404`, since none is waiting — integration test
- [x] Each listed suggestion carries its contributor's pending and rejected
      counts, and a page's counts cost one query rather than one per row —
      integration test
- [x] `ProfileApi`'s username lookup by id, batched at the catalog's batch size
      as `publicUsernames` is ([ADR-0042](../../adr/0042-bounded-request-parameters.md)),
      names a user whose cellar is private, while `publicCellarOwnerId` and
      `publicUsernames` still hide them — test
- [x] `ModularityTest`, `ArchitectureTest` and `ArchitectureDocumentationTest`
      pass with `catalog` reading `ProfileApi`, and §2's diagram and §3 show
      the dependency
- [x] The committed spec carries both operations under their own tag, the
      generated web client is regenerated, and the glossary's JSON field names
      carry what the response adds (the brewery's newness and the two counts);
      *suggestion* is already there
- [x] `make verify-fast` is green

## Notes

Provenance: the product owner's brief for iteration 10.5 ("own module and API
for ADMIN operations"); [quality backlog](../quality-backlog.md) COULD-81,
`[needs decision]` (open question 1).
