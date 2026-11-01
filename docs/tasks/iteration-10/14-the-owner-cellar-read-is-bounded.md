# Task 14: The owner's cellar read has a bound before the app caches it

- **Status:** needs-refinement
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

The owner's whole-cellar read (`GET /cellar`, documented "Not paginated") was
kept whole in iteration 8.5 task 11 for [iteration 12](../iteration-12.md)'s
offline cache. Since then the web has come to load it on every signed-in
catalog search, beer detail, front and profile page, to mark about twenty
beers or show two counts, and nothing caps how many entries an account holds.
The cost of one page grows with the largest cellar anyone builds, and
[architecture §8](../../architecture.md#8-trade-offs-made-explicit) does not
list it (SHOULD-78).

The bound has to be chosen before iteration 12 builds its offline cache on
this read, and before the app ships a build that depends on its shape:
[ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)
makes the API additive-only once an app is installed, which this iteration
does for the first time.

## Scope

No signed-in page's cost grows without bound with the size of the viewer's
cellar, and the read iteration 12 will cache is either bounded or its
unboundedness is a recorded trade-off.

## Non-goals

- The offline cache itself — iteration 12.

## Constraints

- ADR-0093: an added endpoint or field is fine; removing or reshaping `GET
  /cellar` needs a deprecation the policy allows.
- [ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md):
  a cellar read is joined with its beers in the backend.
- A new endpoint is a new operation in the committed spec and is documented
  with its errors (`ApiErrorDocumentationIT`).

## Open questions

1. **Which bound?** Cap entries per account; add a bounded "held beers /
   totals" read for the web's marks and counts; or paginate the owner read and
   give the app's sync its own endpoint — or a combination.
2. **If capped:** at what number, what the user sees on reaching it, in both
   locales.
3. **If the web stops calling `GET /cellar` on those pages:** which pages keep
   the whole read, if any.

## Acceptance criteria

- [ ] The decision is recorded: a cap, a new read or a paginated one is
      implemented, or the trade-off is listed in architecture §8
- [ ] If the web's pages change what they call, a Playwright test of a catalog
      search page shows the held marks from the new read
- [ ] Any new endpoint has an integration test of its bound and is in the
      committed spec
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-78, `[needs
decision]` — open question 1.
