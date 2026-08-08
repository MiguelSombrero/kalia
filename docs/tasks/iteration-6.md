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
| [01](iteration-6/01-profile-and-visibility.md) | User profile and cellar visibility | needs-refinement |
| [02](iteration-6/02-public-cellar-api.md) | Public cellar read API | needs-refinement |
| [03](iteration-6/03-profile-page.md) | Profile page and the visibility control | needs-refinement |
| [04](iteration-6/04-public-cellar-page.md) | Public cellar page | needs-refinement |

Depends on [iteration 5](iteration-5.md): there is nothing to make public until
the cellar exists.

This is the first iteration where getting it wrong exposes someone's data
rather than merely breaking a page, so tasks 01 and 02 carry the visibility
rule between them and task 02 owns proving it.

The end-to-end journey in "Done when" is an acceptance criterion of
[task 04](iteration-6/04-public-cellar-page.md), the last task it depends on —
not a task of its own ([ADR-0026](../adr/0026-task-file-format.md)) and not
shared with [task 03](iteration-6/03-profile-page.md), whose browser coverage
stops at the visibility control.
