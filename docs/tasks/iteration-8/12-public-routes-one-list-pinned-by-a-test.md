# Task 12: Which routes are public is one list, pinned by a test

- **Status:** done
- **Iteration:** [8](../iteration-8.md)

## Why

**Three documented lists of the routes that need no token, and none matches
the code.** `SecurityConfig.java:46-59` is what actually runs:

- `docs/architecture.md:356-358` omits `GET /api/v1/cellars/*`.
- `docs/architecture.md:542-545` omits the feed.
- `backend/README.md:232-234` omits both.

`FeedController.java:25` cites
[ADR-0028](../../adr/0028-resource-server-and-current-user.md) as the reason
it is public, and ADR-0028 never mentions the feed. A reviewer checking a new
`permitAll` against the docs works from an incomplete list.

**Nothing fails when a route becomes public by accident.** No test compares
the handler mappings with an allow-list, and
`ArchitectureTest.onlyIdentityConfiguresWebSecurity` checks where the security
chain lives, not what it permits. `/api/v1/beers/*` and `/api/v1/cellars/*`
are single-segment wildcards, and their comment guards only against
sub-resources. A future `GET /api/v1/cellars/mine` would be anonymous with no
failing test. `/api/v1/beers/batch` is already public this way, which is
intended.

Iteration 8 adds the catalog's first write path
([task 02](02-add-beer-api.md)) right next to public read routes, which is
exactly where this gap would bite.

(Quality backlog MUST-13 and COULD-29.)

## Scope

The set of anonymous routes is stated in one documented home, with pointers
from the others, and a test fails whenever the running application's
anonymous set differs from that list.

## Non-goals

- Changing which routes are public. Today's set is the baseline.
- Rate limiting the public routes — quality backlog SHOULD-27.

## Constraints

- One home and pointers from everywhere else
  ([ADR-0020](../../adr/0020-documentation-roles.md)). The test's allow-list
  in code is a second copy that cannot drift silently, because it fails.
- Default deny stays default deny
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)).
- Security configuration lives in `identity`
  (`ArchitectureTest.onlyIdentityConfiguresWebSecurity`).
- Actuator health and the springdoc endpoints are on the list too. Their
  production exposure is already pinned elsewhere (iteration-5.5 task 08), and
  the new test must not contradict that.

**Decided at refinement, 2026-10-15** (product owner):

- **The home is `docs/architecture.md` §6.** The list is shape, not how-to.
  `backend/README.md` and the other section point to it.
- **[ADR-0059](../../adr/0059-feed-respects-cellar-visibility.md) is what
  makes the feed safe to serve anonymously**, but no ADR says outright that it
  is anonymous. ADR-0059 gets a one-sentence amendment saying so, and
  `FeedController` cites ADR-0059.
- **The test probes every mapped handler anonymously.** It catches a matcher
  that matches more than intended, which comparing matchers with handler
  mappings would miss.

## Open questions

**None.**

## Acceptance criteria

- [x] Adding an anonymous-reachable handler that is not on the allow-list
      fails a test — integration test, confirmed by adding a throwaway
      `GET /api/v1/cellars/mine` and watching it fail
- [x] Every route on the allow-list answers without a token, and every other
      mapped route answers 401 without one — the same test
- [x] The anonymous route list appears in `docs/architecture.md` §6, and the
      other two places point to it
- [x] ADR-0059 is amended to say the feed is anonymous, `FeedController` cites
      it, and `node scripts/check-adrs.mjs` passes
- [x] `mvn clean verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-13 and COULD-29,
both confirmed 2026-10-14. Merged because a test that pins the list is what
keeps the documented list honest after this fix.
