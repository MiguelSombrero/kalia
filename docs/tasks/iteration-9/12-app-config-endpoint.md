# Task 12: The server can tell an old app to update, or that Kalia is down

- **Status:** needs-refinement
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-3

## Why

Once an app is installed, nothing can be added that the already-installed
version has to honour. A minimum-supported-version check and a maintenance
signal therefore ship in the app's first release or never
([backlog](../backlog.md#must-exist-in-the-apps-first-release-or-never)):
without the first, every future breaking change to the API is impossible for as
long as a v1.0 client is still calling it. No build is distributed in this
iteration, which is exactly why it has to exist now — before any build that
could become v1.0.

## Scope

`GET /api/v1/app-config` returns the minimum supported app version and a
maintenance flag. The app checks it on launch and on returning to the
foreground, and blocks itself behind an "update required" or "maintenance"
screen when the server says so.

## Non-goals

- Feature flags or remote configuration beyond these two signals.
- A link to an app store — there is none until the paid accounts in the
  [backlog](../backlog.md#mobile-client) are bought.

## Constraints

- [Task 04](04-decision-api-compatibility-policy.md)'s policy says how the
  minimum version and a deprecation window work together.
- Anonymous endpoints are bounded at the edge
  ([ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md))
  and request parameters are bounded
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)).
- Configuration follows [ADR-0015](../../adr/0015-configuration-strategy.md).
- The endpoint's errors are typed and documented like every other's
  ([ADR-0023](../../adr/0023-typed-api-failures.md)).

**Decided at refinement, 2026-10-30** (product owner):

- **A new functional module owns it** — no existing module's
  responsibility is "what the server tells a client about itself"
  ([ADR-0037](../../adr/0037-functional-modules.md)).
- **The values live in a database table,** changed by an operator with SQL
  the way `make moderate` changes a beer's status, so maintenance can be
  raised mid-incident without a redeploy. Application configuration was
  rejected because raising maintenance would need a restart.
- **One minimum per platform,** iOS and Android. It has to exist in the
  first release: an installed app cannot learn a field added later.
- **The minimum is a build number** — a per-platform integer that only
  increases, assigned by [iteration 10](../iteration-10.md)'s build-variant
  rules. A semantic version was rejected as needing parsing in both tiers
  for a comparison an integer makes unambiguous.
- **An unreachable endpoint fails open:** the app keeps working, so an
  offline user keeps their cellar ([iteration 12](../iteration-12.md)). An
  "update required" the app has already been told is remembered and keeps
  blocking while offline.
- **The app owns both screens' wording, in en and fi;** the server sends no
  message text.
- **The web does not read the endpoint** in this iteration.

## Open questions

**Answered, waiting on an accepted ADR.** Every question raised for this task
was answered at refinement on 2026-10-30 (Constraints). It stays
`needs-refinement` only because [the iteration](../iteration-9.md) has a
decision accepted before the build tasks it binds are refined — here
[task 04](04-decision-api-compatibility-policy.md)'s. A second pass moves it
once that ADR merges, or reopens a question the ADR contradicts.

## Acceptance criteria

- [ ] A backend integration test covers the endpoint's response, its
      anonymous access and its cache headers, and it is in the OpenAPI spec
- [ ] A unit test in the app shows the update-required screen when the
      server's minimum exceeds the app's version, and not otherwise
- [ ] On a simulator, raising the minimum version blocks the app on the next
      foregrounding, and lowering it releases it — described in the PR
- [ ] A unit test shows an unreachable endpoint lets the app open, and a
      remembered "update required" still blocks it offline

## Notes

Provenance: [backlog](../backlog.md#must-exist-in-the-apps-first-release-or-never).
