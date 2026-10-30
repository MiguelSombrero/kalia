# Task 09: The API client and the locale strings are shared packages

- **Status:** needs-refinement
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-2

## Why

The web's generated API types and client live in `frontend/lib/api/generated/`
([ADR-0012](../../adr/0012-orval-api-client.md)), and its en/fi strings in
`frontend/i18n/locales/`. The mobile app needs both. A second copy of either is
a second place for a contract or a translation to drift, and the API one drifts
silently — a field the server renamed type-checks fine against a stale copy.
[Iteration 8.5 task 06](../iteration-8.5/06-generated-client-ready-to-share.md)
made the generated client fit to share; this task shares it.

The client cannot be shared as it is: its mutator, `kaliaFetch`, reads the
token from the web's server-side session. Mobile reads it from secure storage
and calls Spring directly, so each platform needs a mutator of its own over one
set of generated types.

## Scope

A shared package under `packages/` holds the generated API types and client,
generated once from the committed spec, with a mutator per platform; another
holds the en/fi strings. The web consumes both instead of its own copies, and
the mobile app can. A breaking change to the spec fails CI.

## Non-goals

- Design tokens — [iteration 11](../iteration-11.md).
- Using the client in the app — [task 15](15-walking-skeleton-slice.md).

## Constraints

- [Task 03](03-decision-repo-layout-and-code-sharing.md)'s layout and
  [task 04](04-decision-api-compatibility-policy.md)'s answer on ADR-0012.
- The generated client is read-only to agents (`.claude/settings.json`,
  [ADR-0012](../../adr/0012-orval-api-client.md)); the setting follows it.
- [ADR-0023](../../adr/0023-typed-api-failures.md): API failures stay typed
  through either mutator.
- [ADR-0011](../../adr/0011-i18next-localization.md): i18next with en and fi.
- Depends on [task 08](08-workspaces-refactor.md).

**Decided at refinement, 2026-10-30** (product owner):

- **One generation, from the committed spec, with a mutator per platform
  injected over one set of types.** A generation per platform was rejected
  as two copies of the types.
- **This task builds [task 04](04-decision-api-compatibility-policy.md)'s
  enforcement:** the committed spec, the backend test that fails when it
  differs from the served one, and the CI job that diffs it against `dev`'s
  and fails on a breaking change. `api-client-drift` becomes that backend
  test plus a regenerate-and-diff of the package, with no Docker. The diff
  tool's version is this task's dependency question.
- **All of `common.json` is shared now,** moved whole. Splitting it into
  shared and per-app namespaces was rejected for now: a web-only string in
  the app's bundle costs nothing.
- **The web's missing-translation check moves into the strings package.**

## Open questions

**Answered, waiting on an accepted ADR.** Every question raised for this task
was answered at refinement on 2026-10-30 (Constraints). It stays
`needs-refinement` only because [the iteration](../iteration-9.md) has a
decision accepted before the build tasks it binds are refined — here those of
tasks [03](03-decision-repo-layout-and-code-sharing.md) and
[04](04-decision-api-compatibility-policy.md). A second pass moves it once
they merge, or reopens a question an ADR contradicts.

## Acceptance criteria

- [ ] The web imports its API client and strings from the shared packages and
      no longer has its own copies; its Vitest and Playwright suites are green
- [ ] A test in the API package proves each mutator attaches the token from
      its platform's source and maps an error to the typed failure
- [ ] A lint rule or test fails when a shared package imports from `web/` or
      `mobile/`, or from a platform-only module
- [ ] `make verify-fast` is green, and the drift check fails when the spec and
      the generated client disagree — confirmed by breaking one
- [ ] A backend test fails when the committed spec differs from the one the
      app serves, and the CI diff job fails on a removed response field —
      each confirmed by breaking one

## Notes

Provenance: [backlog](../backlog.md#mobile-client), "Almost none of
`frontend/` is shareable"; [iteration 8.5 task 06](../iteration-8.5/06-generated-client-ready-to-share.md).
