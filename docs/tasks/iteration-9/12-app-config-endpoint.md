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

## Open questions

1. **Which backend module owns it** — a new one, or an existing module whose
   responsibility it fits ([ADR-0037](../../adr/0037-functional-modules.md))?
2. **Where do the values live?** Configuration that needs a redeploy to change,
   or the database so an operator can change them live — the maintenance flag
   is only useful if it can be raised during an incident.
3. **One minimum version, or one per platform?** iOS and Android builds may not
   ship together.
4. **What is compared** — a semantic version, or a build number?
5. **What does the app do when the endpoint cannot be reached?** Failing open
   keeps an offline user in their cellar ([iteration 12](../iteration-12.md));
   failing closed makes the kill switch reliable.
6. **The wording of both screens, in en and fi**, and whether the maintenance
   message comes from the server.
7. **Does the web read it too?** The web deploys with the backend and never
   needs the version check, but could show maintenance.

## Acceptance criteria

- [ ] A backend integration test covers the endpoint's response, its
      anonymous access and its cache headers, and it is in the OpenAPI spec
- [ ] A unit test in the app shows the update-required screen when the
      server's minimum exceeds the app's version, and not otherwise
- [ ] On a simulator, raising the minimum version blocks the app on the next
      foregrounding, and lowering it releases it — described in the PR
- [ ] The unreachable-endpoint behaviour agreed at refinement is covered by a
      test

## Notes

Provenance: [backlog](../backlog.md#must-exist-in-the-apps-first-release-or-never).
