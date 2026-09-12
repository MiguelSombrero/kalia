# Task 14: Two silent catalog bugs, and the unit tests that would have caught them

- **Status:** refined
- **Iteration:** [7](../iteration-7.md)
- **Covers:** none

## Why

Three findings about the same module, with the same shape and the same fix
surface — they are one task because splitting them would mean three PRs
touching two files, and because the third is the reason the first two went
unnoticed.

**A misspelled sort direction silently sorts the wrong way.** `parseSort`
rejects an unknown property and rejects more than two comma-separated parts,
but any second part that is not `desc` falls through to `ASC`: `?sort=abv,dsc`
returns `200` with the beers in ascending order. The caller gets exactly the
opposite of what they asked for, with no error to tell them.
`CatalogController.java:129`. This is the direction half of the shape retired
COULD-8 fixed for trailing garbage, left behind.

**Search is locale-dependent in a way the database is not.** The specifications
lowercase with the JVM's default locale while the SQL side and the `lower(...)`
indexes use the database's collation:
`BeerSpecifications.java:29`, `:34`, `:41`. Where the default locale is Turkish
or Azeri, `"IPA".toLowerCase()` is the dotless `"ıpa"` and `?style=IPA` returns
zero rows. Nothing in the suite pins the locale, so this passes CI everywhere
and fails only in that deployment — a bug that is invisible until it is
someone's production.

**The catalog module has no `*Test` files at all**, only `*IT`. So `mvn test` —
the fast, Docker-free gate that runs on every push — covers none of its three
pieces of pure, framework-free logic: `parseSort`'s tokenising and whitelist,
`listBreweries`'s in-memory `subList` slicing with `Math.min` clamps at both
ends, and `escapeLikeWildcards`'s backslash-first escaping. All three are
static and need no Spring context. Two of them are where the bugs above live.

(Quality backlog SHOULD-23, SHOULD-22 and COULD-16.)

## Scope

Both bugs fixed, and the catalog's pure logic covered by unit tests that run
without Docker.

## Non-goals

- Any change to the search API's contract, parameters or response shape beyond
  the one decided in Constraints: `?sort=abv,dsc` becomes a 400. That is the
  only contract change here.
- `MAX_PAGE` and the deep-offset concern — [quality backlog](../quality-backlog.md)
  COULD-17, still `[needs decision]` and a different argument.
- Rewriting the existing `*IT` coverage. The unit tests are added beneath it,
  not instead of it.

## Constraints

- **A test that does not pin the locale cannot catch the locale bug.** The
  Turkish case has to be asserted by running the conversion under a Turkish
  locale explicitly; a test that merely calls `toLowerCase(Locale.ROOT)` and
  checks the output passes against the broken code on any Western machine.
- `toLowerCase(Locale.ROOT)` is the fix at all three sites, and "all three" is
  the part that fails silently — fixing two leaves the bug.
- Backend test naming: `*Test` for unit tests that need no Docker, `*IT` for
  integration ([backend/README.md](../../../backend/README.md)). The point of
  this task is partly that these land as `*Test`.
- Bounded request parameters and their rejection follow
  [ADR-0042](../../adr/0042-bounded-request-parameters.md); an invalid sort
  direction becoming an error means an RFC 9457 `problem+json` response
  ([ADR-0014](../../adr/0014-shared-exception-handling.md)), like every other
  rejected parameter in this controller.
- The frontend sends sort values from its own UI, so a newly-rejecting
  parameter must be checked against what `features/catalog` actually sends
  before it turns a working page into a 400.

**Decided 2026-09-12.**

- **An invalid sort direction is a 400 `problem+json`** (questions 1 and 2,
  product owner), and `asc`/`desc` are both explicitly accepted, **case-
  insensitively** — so `?sort=abv,ASC` is valid and `?sort=abv,dsc` is
  rejected. Consistent with how `parseSort` already treats an unknown sort
  *property* and with
  [ADR-0042](../../adr/0042-bounded-request-parameters.md). It is a contract
  change, which is why what `features/catalog` actually sends is checked in a
  browser before it ships, per the constraint above.
- **The suite's default locale is not pinned globally** (question 3). The three
  sites are fixed with `Locale.ROOT` and the locale bug is asserted by a test
  that sets a Turkish locale *explicitly* — because a test merely calling
  `toLowerCase(Locale.ROOT)` and checking the output passes against the broken
  code on any Western machine. Running the whole backend suite under
  `-Duser.language=tr` was rejected as a standing constraint every future test
  would inherit, including every test with a locale-dependent assertion of its
  own. The accepted cost: a fourth call site added later without `Locale.ROOT`
  is caught only if someone writes the test.

## Open questions

**None.**

## Acceptance criteria

- [ ] `?sort=abv,dsc` is rejected with `problem+json` rather than silently
      sorting ascending, and `?sort=abv,ASC` and `?sort=abv,asc` are both
      accepted — unit tests on `parseSort`, confirmed to fail against the
      current fall-through to `ASC`
- [ ] Case-insensitive search returns the same rows under a Turkish default
      locale as under a Western one — unit test that sets the locale
      explicitly, confirmed to fail against `toLowerCase()` with no argument,
      and covering all three call sites
- [ ] `parseSort`, `listBreweries`'s slicing including both `Math.min` clamps,
      and `escapeLikeWildcards`'s backslash-first escaping each have unit tests
      that run under `mvn test` with no Docker
- [ ] `(cd backend && mvn test)` alone — no Docker — exercises the catalog's
      pure logic, which it does not today
- [ ] The frontend's own sort values still work against the now-stricter
      parameter — checked against what `features/catalog` sends, in a browser
      and not only against the test suite
- [ ] `mvn clean verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-23, SHOULD-22 and
COULD-16, all confirmed 2026-08-30 and re-confirmed 2026-09-12. Merged into one
task by the product owner's instruction to combine similar small findings: all
three live in `catalog`, two of them in the two functions the third says are
untested.
