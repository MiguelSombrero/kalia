# Task 04: Decide the API compatibility policy

- **Status:** needs-refinement
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

## Open questions

1. **What is additive?** New endpoints and new optional response fields
   plainly are. A new enum value is not, for a client that switches on it
   exhaustively; nor is tightening validation on a request field. The list has
   to be explicit.
2. **What does the client promise in return?** Ignoring unknown fields and
   treating unknown enum values as a fallback is what makes "additive" safe; it
   is a rule for both clients, not only the server.
3. **What triggers `/api/v2`**, and is versioning per path prefix for the whole
   API or per resource?
4. **The deprecation window**, measured in time or in app releases — and what
   it means while the only installed app is the product owner's own
   ([iteration 10](../iteration-10.md)).
5. **How is a deprecation announced on the wire?** `Deprecation` and `Sunset`
   response headers, the OpenAPI `deprecated` flag, or both.
6. **Is a breaking change caught mechanically?** An OpenAPI diff in CI against
   the last released spec, which needs the spec committed or published — the
   ADR-0012 question in its concrete form.
7. **Does ADR-0012's "no committed spec" still hold**, given the drift check's
   Docker cost per client?

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
