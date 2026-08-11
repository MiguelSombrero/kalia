# Iteration 6 — User profile and public cellars

Goal: a user can decide their cellar is public, and anyone can then browse it.

## Done when

User A sets their cellar public and user B — and a signed-out visitor — can
open it from a link and from A's profile. Set back to private, both get nothing,
and nothing about it leaks: not the beers, not the bottle count, not whether the
cellar exists at all beyond what A's profile already reveals.

## Tasks

| ID | Task | Status |
|---|---|---|
| [05](iteration-6/05-cellar-aggregate-owns-its-writes.md) | The cellar aggregate owns its writes | needs-refinement |
| [06](iteration-6/06-entry-with-no-bottles.md) | What a cellar entry with no bottles is | needs-refinement |
| [01](iteration-6/01-profile-and-visibility.md) | User profile and cellar visibility | needs-refinement |
| [02](iteration-6/02-public-cellar-api.md) | Public cellar read API | needs-refinement |
| [03](iteration-6/03-profile-page.md) | Profile page and the visibility control | needs-refinement |
| [04](iteration-6/04-public-cellar-page.md) | Public cellar page | needs-refinement |
| [07](iteration-6/07-cellar-domain-events.md) | Where a cellar's domain events are registered | needs-refinement |
| [08](iteration-6/08-ubiquitous-language-glossary.md) | A ubiquitous language per bounded context | needs-refinement |

Depends on [iteration 5](iteration-5.md): there is nothing to make public until
the cellar exists.

Tasks 05–08 come from a Domain-Driven Design review of `backend/` on
2026-08-10 and do **not** serve this iteration's "Done when" — 01–04 still
cover it on their own. They are here because this is the iteration where each
one gets cheap or stops being cheap, and the table's order says so: 05 and 06
touch the cellar's write path and its entry lifetime, which task 02 becomes a
second caller of, so they run first; 07 is a decision iteration 7's first task
is built on, so it runs last, immediately before the iteration that needs it;
08 runs after 01–04 so the vocabulary they introduce is in the glossary from
the start, and after 07 so it can absorb that task's event-naming question.
The order is the recommendation, not a constraint — the ID is permanent, the
position is not ([template.md](template.md)).

This is the first iteration where getting it wrong exposes someone's data
rather than merely breaking a page, so tasks 01 and 02 carry the visibility
rule between them and task 02 owns proving it.

The end-to-end journey in "Done when" is an acceptance criterion of
[task 04](iteration-6/04-public-cellar-page.md), the last task it depends on —
not a task of its own ([ADR-0026](../adr/0026-task-file-format.md)) and not
shared with [task 03](iteration-6/03-profile-page.md), whose browser coverage
stops at the visibility control.
