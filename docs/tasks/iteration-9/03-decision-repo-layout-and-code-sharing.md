# Task 03: Decide the repository layout and what code is shared

- **Status:** needs-refinement
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-5

## Why

The repository holds two apps side by side with nothing shared between them
([ADR-0001](../../adr/0001-monorepo.md)). A third codebase changes that: the
generated API client, the en/fi strings and, later, design-token values are
needed by both the web and the app, and copying them is two copies drifting.
Sharing them needs npm workspaces, which this repository does not have, and
[architecture.md §7](../../architecture.md) already carries the revisit trigger
"if a second frontend client appears".

The backlog's analysis also observes that if `frontend/` is ever to become
`web/`, the cheapest moment is inside the workspaces change, when every path
in CI, Docker and the docs is already being touched.

## Scope

The layout is a recorded decision: the workspace tool, the directory names,
which layers become shared packages now and which stay per-app, and how each
consumer — Next.js, Metro, the web's Docker build — reads a shared package.

## Non-goals

- Doing the move — [task 08](08-workspaces-refactor.md).
- Building the shared packages — [task 09](09-shared-packages.md).
- Sharing design tokens; their format is [iteration 11](../iteration-11.md)'s
  decision ([backlog](../backlog.md#mobile-client), decision 5).

## Constraints

- [ADR-0001](../../adr/0001-monorepo.md) is amended or superseded, not
  silently contradicted; an accepted ADR is amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- [ADR-0012](../../adr/0012-orval-api-client.md) owns how the client is
  generated; whether it still holds is [task 04](04-decision-api-compatibility-policy.md)'s
  question, not this one.
- Any build tool beyond npm itself is a new dependency, asked about, not
  researched (`CLAUDE.md`).

## Open questions

1. **npm workspaces, as planned**, or a tool on top of them? The ADR records
   why pnpm, Yarn and Turborepo or Nx were not chosen.
2. **`frontend/` becomes `web/`, confirmed?** It touches every path in CI,
   compose, the Makefile, `.claude/settings.json` and the docs, and accepted
   ADRs that name the old path.
3. **Which packages, and what are they called?** The planned line names API
   types or client, i18n strings and design tokens; tokens are out (above).
   Whether feature `types.ts` files belong in a package too.
4. **Source or built?** Do shared packages ship TypeScript that each app
   compiles (`transpilePackages` in Next.js, Metro natively), or a build step
   of their own?
5. **One lockfile at the root?** It changes how Dependabot, Trivy's manifest
   scan and the web's Docker build find their dependencies.
6. **What may a package import?** Import boundaries for the web are ESLint's
   job today; a package that imports from an app, or from React DOM, has to
   fail a check rather than a review.

## Acceptance criteria

- [ ] An ADR records the layout, the package list, the rejected tools and
      what each would have cost, and passes `node scripts/check-adrs.mjs`
- [ ] `docs/architecture.md` §2 shows the new layout, and §7's revisit trigger
      is marked as fired
- [ ] The checks that keep a package platform-neutral are named in the
      acceptance criteria of [task 09](09-shared-packages.md) — a lint rule or
      test that fails when a package imports an app's code
- [ ] Tasks [08](08-workspaces-refactor.md) and [09](09-shared-packages.md)
      have their Scope and Open questions rewritten against the decision
      before either is refined

## Notes

A decision task, so it adds no automated test of its own — see
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md) for the
exception. Provenance: [backlog](../backlog.md#mobile-client) decision 4.
