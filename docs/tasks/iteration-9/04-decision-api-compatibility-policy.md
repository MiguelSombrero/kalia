# Task 04: Decide the API compatibility policy

- **Status:** refined
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-5

## Why

Until now the backend and its only client deploy together, so any change to
`/api/v1` can be made and consumed in one pull request. An installed app breaks
that: it keeps calling the API it was built against for as long as it stays
installed, and some never update. [Iteration 8.5 task 02](../iteration-8.5/02-api-contract-pruned-before-it-freezes.md)
pruned the contract for exactly this moment. What it cannot do is say what
happens to the contract next — which changes are still allowed, what forces a
`/api/v2`, and how long an old one lives.

The same moment reopens [ADR-0012](../../adr/0012-orval-api-client.md)'s
rejection of a committed OpenAPI spec. Its reasoning held for one client
regenerated against a running backend; with two, the drift check costs a
Docker stack per client in CI, and a macOS runner building iOS may not have
Docker at all.

## Scope

The compatibility policy is a recorded decision: what an additive change is,
what triggers a new version, how a deprecation is announced and how long it
lasts, and how a breaking change is caught before merge rather than in review.
ADR-0012 is reaffirmed or amended against two generated clients.

## Non-goals

- The app-config endpoint that lets a server refuse an old client —
  [task 12](12-app-config-endpoint.md), though the policy has to say how the
  two work together.
- Generating the second client — [task 09](09-shared-packages.md).

## Constraints

- [ADR-0012](../../adr/0012-orval-api-client.md) is amended rather than
  rewritten ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- [architecture.md §4](../../architecture.md) owns the API's shape; the
  policy's rules land there, its reasoning in the ADR
  ([ADR-0020](../../adr/0020-documentation-roles.md)).
- A diffing tool for OpenAPI would be a new dependency — asked, not researched
  (`CLAUDE.md`).

**Decided at refinement, 2026-10-30** (product owner):

- **Both clients promise to ignore unknown fields and to treat an unknown
  enum value as a fallback.** That makes these additive: a new endpoint, a
  new optional response field, a new optional request parameter, a new enum
  value. **Breaking:** removing, renaming or retyping anything, making an
  optional field required, and tightening a request's validation.
- **A deprecated element lives until [task 12](12-app-config-endpoint.md)'s
  minimum supported version excludes every app build that uses it** —
  measured in releases, not time. A time floor is added once the app is
  distributed beyond the product owner's own phone.
- **`/api/v2`, for the whole API, only for a breaking change that cannot be
  made as a new path beside the old one;** the normal route is the new path,
  with the old one deprecated. Versioning per resource was rejected.
- **A deprecation is announced by the OpenAPI `deprecated` flag only.** The
  generated client turns it into `@deprecated`, which lint flags at every
  use. `Deprecation` and `Sunset` headers wait for distribution beyond the
  product owner's phone, since a release-measured window has no date to put
  in them.
- **The OpenAPI spec is committed, and a breaking change fails CI.** A
  backend test fails when the committed spec differs from the one the app
  serves; both clients generate from the committed file, so neither needs a
  Docker stack nor a running backend; and a CI job diffs the spec against
  `dev`'s and fails on a breaking change. ADR-0012 is amended with the
  two-client reasoning. The diff tool is a new dependency whose version is
  asked in [task 09](09-shared-packages.md), which builds the job.

## Open questions

**None.**

## Acceptance criteria

- [ ] An ADR records the policy, the rejected alternatives and their costs,
      and passes `node scripts/check-adrs.mjs`
- [ ] ADR-0012 is reaffirmed or amended, with the two-client reasoning
      written down either way
- [ ] `docs/architecture.md` §4 states the additive-only rule and the
      deprecation mechanism
- [ ] If the policy is enforced mechanically, the check is named as an
      automated test in a build task's acceptance criteria — a CI job that
      fails on a removed field — before that task is refined

## Notes

Provenance: [backlog](../backlog.md#mobile-client) decision 2, and its note on
revisiting ADR-0012. A decision task, so it adds no automated test of its own —
see [iteration 8 task 01](../iteration-8/01-catalog-data-source.md).
