# Iteration 7 — Front page activity feed

Goal: the front page shows what people are putting in their cellars.

## Done when

Adding a bottle to a cellar produces an event, and the front page lists recent
events newest-first for signed-in and signed-out visitors alike. An event whose
cellar is public links to it. Nothing in the feed reveals anything about a
cellar its owner has kept private.

## Tasks

| ID | Task | Status |
|---|---|---|
| [01](iteration-7/01-feed-module.md) | `feed` module and cellar events | needs-refinement |
| [02](iteration-7/02-feed-api.md) | Feed read API | needs-refinement |
| [03](iteration-7/03-front-page-feed.md) | Front page feed | needs-refinement |

Depends on [iteration 6](iteration-6.md): the feed's central question is what it
may show about a private cellar, which cannot be answered before cellars have a
visibility model.

The front page today renders a static welcome. This iteration replaces it, so it
is also the first time Kalia's landing page has anything on it.
