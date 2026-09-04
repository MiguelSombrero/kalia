# Task 14: Chunk the cellar's batch beer lookup past 100 ids

- **Status:** needs-refinement
- **Iteration:** [6](../iteration-6.md)

## Why

[Task 09](09-batch-beer-lookup-for-cellar.md) replaced the cellar page's
per-beer catalog calls with one call to `GET /api/v1/beers/batch`. That
endpoint caps `ids` at 100 and answers `400` over the cap
([ADR-0042](../../adr/0042-bounded-request-parameters.md)), and
`frontend/features/cellar/api.ts`'s `fetchBeersById` issues exactly one call
with every distinct beer id in the cellar.

So a cellar holding more than 100 distinct catalog beers now sends an
over-cap request, gets a `400`, and `fetchBeersById` throws — the whole
cellar page renders its error state. Before task 09 the page made N
per-beer calls and worked for any N, so this is a narrow regression at the
boundary.

It was left as-is in task 09 deliberately: `docs/architecture.md` §4
documents a cellar as "realistically far smaller than the catalog", task
09's acceptance criteria mandated a single call, and chunking was out of
that task's scope. This task exists so the decision is made explicitly
rather than left as an unhandled edge.

Flagged by `/code-review` on task 09's implementation PR.

## Scope

`fetchBeersById` (and any equivalent path added since) enriches a cellar of
any size without a failed request: the deduped id list is split into groups
no larger than the endpoint's cap, the groups are fetched concurrently, and
the results merged into the one lookup map the callers already expect. A
cellar of 100 or fewer distinct beers still issues exactly one batch call.

## Non-goals

- Changing the backend `GET /api/v1/beers/batch` cap, or adding a
  paginated/streaming variant — the 100-id bound stays
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)).
- Switching `resolvePublicCellarBeers` (the public cellar page) off its
  per-entry `getBeer` calls — [task 09](09-batch-beer-lookup-for-cellar.md)
  scoped that out and this task does not reopen it unless refinement decides
  otherwise (see Open questions).
- Any change to the cellar page's rendered output or ordering.

## Constraints

- The batch endpoint's contract is fixed by
  [task 09](09-batch-beer-lookup-for-cellar.md): repeated `ids`, at most
  100, unknown ids omitted, `400` over the cap.
- `frontend/features/cellar/api.ts` and `types.ts` stay the only files in
  the cellar feature reaching the generated catalog client
  ([ADR-0012](../../adr/0012-orval-api-client.md)).
- Runtime failures still surface as a tagged `ApiError`
  ([ADR-0023](../../adr/0023-typed-api-failures.md)); a genuinely failed
  chunk still throws.
- The chunk size is the backend cap, referenced once rather than restated as
  a second literal that can drift from it.

## Open questions

- Functional scope: is the intended ceiling on a cellar's distinct-beer
  count truly unbounded, or is there a product limit above which the cellar
  page is allowed to degrade differently (paginate, truncate with a notice)?
- Edge cases and failure handling: if one chunk of several fails, should the
  page fail whole (current behaviour), or render the beers it did resolve
  and drop the rest the way an unknown id is already dropped?
- Trade-offs: should the concurrent chunk fan-out be bounded (e.g. a small
  concurrency limit) to avoid a burst of parallel backend calls for a very
  large cellar, or is ceil(N/100) calls acceptable as-is given how rare
  N > 100 is?
- Module boundaries: does any part of this decision belong in an ADR, or is
  it a within-feature implementation choice recorded only here and in
  `docs/architecture.md` if the §4 note needs a word?
- Should `resolvePublicCellarBeers` be folded in after all, so both cellar
  reads share one enrichment path?

## Acceptance criteria

- [ ] A cellar of more than 100 distinct catalog beers renders its full
      list, with no failed request — frontend test with a mocked multi-chunk
      cellar, confirmed to fail against today's single-call implementation
- [ ] A cellar of 100 or fewer distinct beers still issues exactly one batch
      call — frontend test asserting the call count
- [ ] The chunk size is derived from a single named constant, not a repeated
      literal — visible in review, covered by the tests above
- [ ] Whatever partial-failure behaviour refinement settles on is covered by
      a frontend test with a mocked failing chunk
- [ ] `make verify` is green

## Notes

Provenance: `/code-review` finding on
[task 09](09-batch-beer-lookup-for-cellar.md)'s implementation PR,
2026-09-04. Not in the [quality backlog](../quality-backlog.md).
