# Task 14: The committed spec lists every response, and its own checks hold anywhere

- **Status:** refined
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** none

## Why

The committed `backend/openapi.json` is the contract the web and the app
compile against and the record a breaking change is checked against
([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
This iteration adds a handful of operations that take a body — deciding,
editing and acknowledging — and four gaps around the spec would carry into
each:

- A `415` or `406` is Boot's `problem+json`, but no operation lists it, though
  `ApiErrorDocumentationIT` fails an operation that lists none of its other
  responses, so the generated client cannot type it (COULD-97).
- The spec carries the OAuth URLs built from the Keycloak issuer setting, so a
  developer whose environment overrides the issuer — phone mode does
  ([ADR-0097](../../adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md))
  — fails `CommittedOpenApiSpecIT` without any contract change (COULD-100).
- That IT reads `openapi.json` relative to the working directory, which is
  `backend/` only under Maven (COULD-100).
- CI's change filter does not select the `api-breaking-change` job when only
  `scripts/check-api-breaking.mjs` changes, and a push to `dev` no longer runs
  every job, so a broken wrapper is found on the next spec change instead
  (COULD-100).

## Scope

Every body-taking operation's documented responses include the media-type
refusals it can send, or the contract records why it leaves them out;
`CommittedOpenApiSpecIT` passes under any issuer setting and from any working
directory; and a change to the breaking-change script runs the job that uses
it.

## Constraints

- Errors are documented and typed as sent
  ([iteration 8.5 task 01](../iteration-8.5/01-api-errors-complete-and-typed.md));
  a newly listed response is additive.
- The generated client is read-only and regenerated, never edited
  ([ADR-0012](../../adr/0012-orval-api-client.md)).
- `scripts/ci-changes.mjs` has a test that pins each rule
  (`ci-changes.test.mjs`).

**Decided at refinement, 2026-11-04** (product owner):

- **COULD-97: `415` is listed on every body-taking operation,** since a
  wrongly built request is a client bug the client can fix; **`406` is left
  out,** and [architecture §4](../../architecture.md#4-api-design) records
  why — no client sends a restrictive `Accept`.

## Open questions

**None.**

## Acceptance criteria

- [ ] `ApiErrorDocumentationIT` (or a sibling test) fails a body-taking
      operation that omits `415`, and the regenerated client types it
- [ ] §4 records that the contract leaves `406` out, and why
- [ ] `CommittedOpenApiSpecIT` passes with the issuer overridden, and when run
      from the repository root — both shown in the test, and the second
      confirmed to fail before
- [ ] `ci-changes.test.mjs` shows a change to `scripts/check-api-breaking.mjs`
      alone selecting `api-breaking-change`
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-97 (deferred in PR
#425) and COULD-100 (deferred in the iteration 9 task 09 pull request,
reconfirmed reviewing iteration 10 task 22). Run before the admin API's
operations, which inherit the first gap.
