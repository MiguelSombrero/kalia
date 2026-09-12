# Iteration 7 — Front page activity feed

Goal: the front page shows what people are putting in their cellars, and keeps
showing it as it happens.

## Done when

- **DW-1:** Adding a bottle to a cellar records a feed event, and `cellar` has
  no compile-time dependency on `feed`.
- **DW-2:** A signed-out caller can read recent feed events over HTTP,
  newest-first, each carrying the person — by name, not by username — and the
  beer a line needs to name.
- **DW-3:** Nothing in the feed — over HTTP or on the page — reveals more about
  a cellar than its owner has agreed to, including a cellar whose visibility
  changed after the event was recorded.
- **DW-4:** The front page lists recent events as sentences that read correctly
  in both locales, and a public cellar's line links to it.
- **DW-5:** A visitor sitting on the front page sees new events appear without
  reloading the browser.
- **DW-6:** How the feed reaches an already-open browser, and what a feed line
  does to [ADR-0050](../adr/0050-public-cellar-addressing.md)'s uniform 404,
  are each recorded as a decision rather than left implicit.

## Tasks

| ID | Task | Status |
|---|---|---|
| [09](iteration-7/09-feed-and-private-cellars.md) | What a feed line may reveal, and what that does to ADR-0050 | needs-refinement |
| [05](iteration-7/05-feed-delivery-decision.md) | Decide how the feed reaches a browser that is already open | needs-refinement |
| [01](iteration-7/01-feed-module.md) | `feed` module and cellar events | needs-refinement |
| [10](iteration-7/10-person-display-name.md) | A person's name, for a feed line to say | needs-refinement |
| [04](iteration-7/04-feed-line-composition.md) | The reads a feed line needs | needs-refinement |
| [02](iteration-7/02-feed-api.md) | Feed read API | needs-refinement |
| [06](iteration-7/06-feed-increments.md) | Asking the feed what is new | needs-refinement |
| [08](iteration-7/08-shared-relative-time.md) | Relative time outside the cellar | needs-refinement |
| [03](iteration-7/03-front-page-feed.md) | Front page feed | needs-refinement |
| [07](iteration-7/07-live-front-page.md) | The front page updates without a reload | needs-refinement |

Order of work is the table's order, not the ID — tasks 01–03 were written
first and keep their numbers ([the template](template.md): IDs are permanent).
The two decision tasks come first because each changes what the tasks after it
build: [09](iteration-7/09-feed-and-private-cellars.md) decides what a feed
event may say and therefore what [01](iteration-7/01-feed-module.md) stores,
and [05](iteration-7/05-feed-delivery-decision.md) decides the delivery
mechanism and therefore the shape of [06](iteration-7/06-feed-increments.md)
and [07](iteration-7/07-live-front-page.md). Both produce an ADR and no
production code, following
[iteration 6 task 07](iteration-6/07-cellar-domain-events.md) and
[iteration 8 task 01](iteration-8/01-catalog-data-source.md).

[Task 10](iteration-7/10-person-display-name.md) is here because the vision's
sentence names a person — "Miguel Sombrero", a first name and a last name — and
Kalia stores no such thing. Every surface that names someone today prints their
username, which
[ADR-0049](../adr/0049-profile-module-and-public-identity.md) calls the
profile's whole public identity; the feed is what makes that stop being true.

Depends on [iteration 6](iteration-6.md): the feed's central question is what
it may show about a private cellar, which cannot be answered before cellars
have a visibility model.

The front page today renders a static welcome. This iteration replaces it, so
it is also the first time Kalia's landing page has anything on it — and the
first time any page in Kalia changes without the visitor doing something,
which is where [task 07](iteration-7/07-live-front-page.md)'s accessibility
work comes from.
