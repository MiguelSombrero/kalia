# ADR-0083: A cellar read arrives joined with its beers from the backend, so no client rebuilds it and no feature reads another's generated client

- **Status:** accepted
- **Date:** 2026-10-23

## Context

Until now both cellar reads answered with entries that carried only a
`beerId`. `features/cellar/api.ts` joined them to the catalog itself. It
batched the owner's read through `/beers/batch` in chunks of 100, but made one
`getBeer` call per entry for a public cellar. It also dropped entries whose
beer no longer resolved, dropped empty entries again, and sorted the result.
The empty-entry rule lived in four places that did not agree: the owner's
service read applied it, the public read did not, and the frontend applied it
twice more.

That placement followed the "endpoints are client-agnostic resources"
convention in `docs/architecture.md`: an entry was the resource, and
assembling it with its beer was the client's job. Two forces now push
against it. From iteration 9 a mobile app is the primary UI, and iteration 12
adds an offline cellar (`docs/roadmap.md`). Each of them would have to
rebuild the same join, with its batching, its dropped rows and its ordering.
Second, the signed-out public cellar page turned one page view into N backend
calls, which nobody bounded.

The backend already had what the join needs. `cellar` depends on `catalog`
through `CatalogApi`, whose `getBeerSummaries` chunks any batch and already
serves `feed`'s server-side join of the same facts
([ADR-0058](0058-feed-event-recording-model.md)).

Quality backlog SHOULD-35, SHOULD-34, COULD-31 and SHOULD-15 record the
findings; [task 10](../tasks/iteration-8/10-cellar-reads-joined-in-the-backend.md)
carries the product owner's decision of 2026-10-14 and the refinement of
2026-10-15.

## Decision

`GET /api/v1/cellar` and `GET /api/v1/cellars/{username}` each answer with
every entry already joined to its beer through `CatalogApi`, and a frontend
feature's `api.ts` may import only its own tag of the generated client.

- **One beer shape, two entry shapes.** Both responses nest the same
  `CellarBeerDto`, which holds exactly the beer facts the cellar pages show:
  id, name, brewery name, style and strength. The owner's `EntryDto` and the
  public `PublicCellarEntryDto` stay separate types
  ([ADR-0050](0050-public-cellar-addressing.md)), so the public response can
  still show less than the owner's. Adding a field to the shared beer shape
  adds it to the public response too; a fact only the owner should see
  belongs on `EntryDto`, not on `CellarBeerDto`.
- **The rules live in `CellarService`, once, for both reads.** An entry with
  no bottles is never returned. An entry whose beer no longer resolves is
  left out and logged at `WARN`, which keeps today's visible behaviour while
  quality backlog SHOULD-16 is still undecided.
- **The backend fixes a stable default order (beer name, then entry id).** The
  user-chosen sort
  ([ADR-0070](0070-cellar-sortable-beers-beside-their-band-with-bottle-tiles-headed-by-vintage.md))
  stays in the client, so a UI re-sorts without a round trip.
- **The generated-client boundary is per tag.** `eslint.config.mjs` lets a
  feature's `api.ts` and `types.ts` reach the shared generated models and the
  generated tag named after the feature, plus the cellar's own `public-cellar`
  tag. A join across modules therefore has to be built in the backend, behind
  a module's public API, and cannot reappear in a feature.

This narrows the client-agnostic-resources convention rather than reversing
it. A cellar entry without the beer it is of is an incomplete resource, as a
feed line without its actor was ([ADR-0058](0058-feed-event-recording-model.md)).
The convention still forbids shaping a response around one page.

Not covered: `heldBottlesByBeer`, the catalog page's cellar marker, keeps
reading the owner's endpoint. It now gets the beer facts with it and ignores
them. Neither does this decide where the public cellar's visibility check
lives (SHOULD-45).

## Alternatives considered

**Keep the join in the frontend and only batch the public read.** This was
the smallest change: the public read would reuse the owner's chunked
`/beers/batch` lookup, and the N-call fan-out would be gone. It was rejected
because it fixes one symptom and leaves the cause. Every iteration-9+ client
would still inherit the join, its batching and its rules, and the empty-entry
rule would still live wherever each client chose to put it.

**Let the cellar endpoints return a beer id and a separate `beers` map
alongside the entries.** This keeps entries as before and adds the beer
facts once per beer rather than once per entry. It was rejected because an
entry is one beer by construction (one entry per user and beer,
[ADR-0034](0034-cellar-two-level-bottle-model.md)), so nesting duplicates
nothing, and a map only means every client writes the lookup that the join
was moved to avoid.

**Enforce the boundary with an explicit table of which feature may read which
tags, instead of matching the tag to the feature's name.** A table would make
the cellar's second tag no special case. It was rejected because it needs
updating for every new feature, and a feature could be added to it with
another module's tag without anyone noticing. Matching the name makes the
default "own tag only", and the one exception has to be written out as one.

## Consequences

- Good, because a public cellar page view is one backend call however many
  beers it holds, rather than one per beer.
- Good, because the empty-entry and unresolved-beer rules each live in one
  place, and a dropped entry is now logged rather than silent.
- Good, because a mobile or offline client reads a whole cellar in one
  response, already ordered, without knowing the catalog API.
- Bad, because the owner's read now always queries the catalog, including for
  the catalog page's cellar marker, which never shows a beer's facts. It is
  one batched query per 100 distinct beers, inside a request that already
  reads the cellar.
- Neutral, because the response contract changed: `beerId` moved into the
  nested `beer.id` on both entry types. The frontend is the only consumer and
  changed in the same pull request.
- Neutral, because a feature that later needs another tag's operations needs
  either a backend join or an explicit, reviewed exception in
  `eslint.config.mjs`.
- **Revisit trigger:** a cellar read whose catalog lookup shows up as the
  slow part of a page, or a client that needs entries without their beer
  facts.

## Evidence

- `app/[locale]/cellars/[username]/page.backendCalls.test.tsx` renders the
  public page against a stubbed `fetch` holding a 150-beer cellar. It counts
  one call against this decision's code. Run against the frontend as it was
  before this change (`git show HEAD:` for `features/cellar/{api,types,index}.ts`
  and the page), the same test failed with
  `expected "vi.fn()" to be called 1 times, but got 151 times`. Run on
  2026-10-23 with vitest 5.0.0.
- `eslint.config.test.ts` lints fixture imports. `features/cellar/api.ts` and
  `features/feed/api.ts` importing `@/lib/api/generated/catalog/catalog` are
  each rejected; `features/catalog/api.ts` importing the same module, and
  `features/cellar/api.ts` importing `cellar`, `public-cellar` and `models`,
  pass. Checked with eslint-plugin-boundaries 7.2.0.
