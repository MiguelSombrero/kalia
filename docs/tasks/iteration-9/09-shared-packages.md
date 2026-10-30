# Task 09: The API client and the locale strings are shared packages

- **Status:** done
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

Two packages under `packages/`, as [ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md) decides: `@kalia/api` holds the generated API
types and client, generated once from the committed spec, and the
platform-neutral fetch core every platform's mutator is built on;
`@kalia/locales` holds the en/fi strings. Each ships TypeScript source —
`exports` point at `.ts`, with no build step or `dist/` — and the web compiles
them, listing them in `transpilePackages` unless the build shows it need not.
The web consumes both instead of its own copies, and the mobile app can. An
ESLint rule fails a package that imports from `web/` or `mobile/`, or from
`react-dom`, `next` or `react-native`. A breaking change to the spec fails CI.

## Non-goals

- Design tokens — [iteration 11](../iteration-11.md).
- Using the client in the app — [task 15](15-walking-skeleton-slice.md).

## Constraints

- [ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)'s
  layout and [ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)'s
  answer on ADR-0012 (the committed spec and its two enforcements).
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

**Decided in the second pass, 2026-10-30** (product owner), after
[ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)
and
[ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)
were accepted:

- **The packages are `@kalia/api` and `@kalia/locales`,** in `packages/api` and
  `packages/locales`.
- **A platform's mutator cannot live in the package.** The web's `kaliaFetch`
  imports `server-only`, the logger, the metrics and the session
  (`web/lib/api/mutator.ts`), all of which the platform-neutrality rule keeps
  out of a package. So the package holds the **platform-neutral core** —
  base URL, request timeout, JSON parsing, non-2xx statuses returned rather
  than thrown, and the typed failure of
  [ADR-0023](../../adr/0023-typed-api-failures.md), moved in with it — and the
  generated client calls a **transport the app registers once at startup**.
  The web's mutator stays in `web/`, wraps the core, and adds what is the
  web's (trace headers, metrics, logging, the session's token). The app's is
  registered by [task 11](11-app-skeleton.md), with the token source added by
  [task 14](14-sign-in-on-mobile.md). A transport that was never registered
  throws at the first call. Build-time aliases per app were rejected: four
  tools (Next.js, Metro, Vitest, TypeScript) would carry the same alias, and
  the registration is one function call.
- **The committed spec is `backend/openapi.json`.** The contract sits with
  what serves it, so the backend's own test fails in the backend developer's
  loop, and the client package generates from `../../backend/openapi.json`. The
  CI job reads `dev`'s copy of the same path.
- **The platform-neutrality rule lives with the packages** and is proven like
  the web's `boundaries/dependencies` policies, by committed violating
  fixtures run in a test (`architecture.md` §7). The packages' tests run on
  Vitest, which the web already pins, so this adds no dependency.
- **The generated client stays in its `react-query` form,** so
  `@kalia/api` depends on TanStack Query and React, which the rule allows
  because only `react-dom`, `next` and `react-native` are banned.
- **The OpenAPI diff tool is asked for when this task starts,** as one
  batched dependency question
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
- **Whether `transpilePackages` is needed** for workspace packages is found by
  building with and without the entry. Next.js's documentation says they are
  transpiled automatically; ADR-0092 lists them anyway and lets this task
  drop the entry if the build shows it does nothing.
- **Depends on [task 08](08-workspaces-refactor.md),** which sets up the
  scoped install and the standalone trace root this task puts the first
  package behind.

## Open questions

**None.**

## Acceptance criteria

- [x] The web imports its API client and strings from the shared packages and
      no longer has its own copies; its Vitest and Playwright suites are green
- [x] A test in `@kalia/api` proves the core attaches the token a transport
      supplies, returns a non-2xx status rather than throwing, maps a lost
      request to the typed failure, and throws when no transport was
      registered; the web has a test that its wiring supplies the session's
      token and keeps its trace headers, metrics and logging
- [x] A lint rule, proven by committed violating fixtures run in a test, fails
      when a shared package imports from `web/` or `mobile/`, or from
      `react-dom`, `next` or `react-native`
- [x] `make verify-fast` is green, and the drift check — a regeneration of the
      package from `backend/openapi.json` and a diff, with no Docker stack —
      fails when the spec and the generated client disagree, confirmed by
      breaking one
- [x] A backend test fails when `backend/openapi.json` differs from the one
      the app serves, and the CI diff job fails on a removed response field —
      each confirmed by breaking one
- [x] The web's missing-translation check runs from `@kalia/locales` and
      fails on a key present in one language and not the other, confirmed by
      deleting one
- [x] The web image still builds from the repository root and serves its
      pages with both packages in it, and `.claude/settings.json` marks the
      generated client's new path read-only
- [x] The build with and without the `transpilePackages` entries is compared
      and the result stated in the PR

## Notes

Provenance: [backlog](../backlog.md#mobile-client), "Almost none of
`frontend/` is shareable"; [iteration 8.5 task 06](../iteration-8.5/06-generated-client-ready-to-share.md).
