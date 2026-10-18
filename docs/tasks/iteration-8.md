# Iteration 8 — Catalog beyond seed data

Goal: the catalog grows without a migration — people add the beers they cannot
find.

## Done when

A signed-in user who searches for a beer that is not in the catalog can add it
and immediately put a bottle of it in their cellar. Adding a beer that already
exists is caught rather than producing a second copy. Where the catalog's data
comes from in the long run is recorded as a decision rather than left open.

## Tasks

| ID | Task | Status |
|---|---|---|
| [01](iteration-8/01-catalog-data-source.md) | Decide where catalog data comes from | done |
| [17](iteration-8/17-seed-the-catalog-from-wikidata.md) | Seed the catalog from Wikidata | done |
| [02](iteration-8/02-add-beer-api.md) | Add-a-beer API | done |
| [03](iteration-8/03-add-beer-ui.md) | Adding a beer from search | refined |
| [04](iteration-8/04-catalog-caching-decision.md) | Decide whether and how the catalog is cached | refined |
| [05](iteration-8/05-cache-catalog-reads.md) | Cache catalog reads | needs-refinement |
| [06](iteration-8/06-feed-events-delivered-at-least-once.md) | Feed events are delivered at least once, as documented | refined |
| [07](iteration-8/07-front-page-feed-reaches-public-lines.md) | The front page's feed reaches public lines past private ones | refined |
| [08](iteration-8/08-catalog-search-bounded-end-to-end.md) | Catalog search never lands on the error page | refined |
| [09](iteration-8/09-a-username-is-a-permanent-address.md) | A username belongs to one person, permanently | refined |
| [10](iteration-8/10-cellar-reads-joined-in-the-backend.md) | Cellar reads arrive joined with their beers, from the backend | refined |
| [11](iteration-8/11-the-bff-forwards-only-what-it-checked.md) | The BFF forwards only what it has checked, and fails closed on tokens | refined |
| [12](iteration-8/12-public-routes-one-list-pinned-by-a-test.md) | Which routes are public is one list, pinned by a test | refined |
| [13](iteration-8/13-in-app-links-keep-the-readers-language.md) | Links inside the app keep the reader's language | refined |
| [14](iteration-8/14-boundary-guards-catch-what-the-docs-claim.md) | Every boundary guard catches what the docs say it catches | refined |
| [15](iteration-8/15-backend-services-own-their-cross-cutting-setup.md) | Backend services stop leaning on hidden setup | refined |
| [16](iteration-8/16-docs-describe-what-is-built.md) | The documentation describes what is built | refined |

Task 01 is a decision, not an implementation, and it comes first because its
answer changes how much tasks 02 and 03 have to build: a catalog fed by an
external API needs user contributions to reconcile against it, and one Kalia
owns outright does not. Its answer, refined on 2026-10-15, is a one-time seed
from Wikidata that Kalia then owns. Task 17 builds that import. It is listed
second, ahead of 02, because duplicate detection has to be designed against
the catalog users will actually add to. Task 03 is a design task: where
adding a beer starts and where it ends are chosen from built alternatives
([ADR-0062](../adr/0062-a-design-task-is-a-skill-and-a-marker.md)).

Tasks 04 and 05 exist because that same answer changes the catalog's size and
source, which is what the architecture's "no cache until measured" stance was
waiting for. Task 04 measures and decides, and "not yet" is a valid answer that
drops task 05. Task 05 comes after task 02, since a cache that does not evict
on the new write path hides the very beer a user just added. Task 05 stays
`needs-refinement` until task 04 has measured, because its questions depend on
the verdict.

The catalog has been ~50–100 seeded beers since iteration 1. Every iteration
since has been built on the assumption that it never changes, which is the
assumption this iteration removes.

**Tasks 06–16 are lifted from [the quality backlog](quality-backlog.md)**
after its 2026-10-14 sweep: 39 findings merged into eleven tasks, with related
findings sharing a task where they share a fix. The table lists them in order
of impact on the product, and none of them depends on 01–05. None of them
advances the "Done when" above, and none blocks it. The order puts silent data
loss and wrong pages that visitors see (06–09) ahead of structural work (10,
14, 15), and documentation drift last (16). Three of them have reasons tied to this
iteration specifically. [08](iteration-8/08-catalog-search-bounded-end-to-end.md)
hardens the search that [03](iteration-8/03-add-beer-ui.md) sends every
contributor through, and its page bound only held while the catalog stayed
small. [12](iteration-8/12-public-routes-one-list-pinned-by-a-test.md) pins
the anonymous routes that [02](iteration-8/02-add-beer-api.md)'s write route,
the catalog's first, sits beside.
[10](iteration-8/10-cellar-reads-joined-in-the-backend.md) moves the cellar's
join to the backend before iteration 9 makes mobile a second client.

Seven of the lifted findings were `[needs decision]`. The product owner
decided six of them on 2026-10-14, before the tasks were written, and each
decision is recorded once, in the Constraints of the task that owns it. The
seventh, SHOULD-15, needs no separate answer: task 10's decision removes the
import that it is about.
