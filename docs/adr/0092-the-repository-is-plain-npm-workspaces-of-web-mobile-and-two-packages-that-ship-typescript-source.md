# ADR-0092: The repository is plain npm workspaces of `web/`, `mobile/` and two packages that ship TypeScript source

- **Status:** accepted
- **Date:** 2026-10-30

## Context

[ADR-0001](0001-monorepo.md) put two apps in one repository and noted that
nothing in the code coupled them beyond the REST API. Iteration 9 adds a third
codebase, an Expo app, and it breaks that: the generated API client
([ADR-0012](0012-orval-api-client.md)) and the en/fi strings
([ADR-0011](0011-i18next-localization.md)) are needed by the web and the app
alike. A second copy of either is a second place to drift, and the API one
drifts silently, since a field the server renamed type-checks against a stale
copy.

Sharing code between two Node projects needs npm workspaces, which the
repository does not have: `frontend/package-lock.json` is the only lockfile
and no `package.json` sits at the root. `docs/architecture.md` §7 had said
this would be revisited "if a second frontend client appears".

The questions are which tool does the workspace work, what the directories
are called, what is shared now, and how each consumer (Next.js, Metro and the
web's Docker build) reads a shared package.

Product-owner decisions at refinement on 2026-10-30, recorded here as made.

## Decision

The repository is npm workspaces with no tool on top: three top-level
directories, `web/`, `mobile/` and `packages/`, of which `packages/` holds two
packages that ship TypeScript source for each app to compile.

- **Names.** `frontend/` becomes `web/`, and the compose service and its image
  become `web` with it. `backend/` keeps its name. `mobile/` is the Expo app.
- **Shared now:** the generated API client and its types, and the en/fi
  strings. Each is one package under `packages/`; their names are
  [task 09](../tasks/iteration-9/09-shared-packages.md)'s. There is no
  package of the features' `types.ts` files: the API's types come with the
  generated client, and the rest is each app's own. Design tokens are not
  shared; their format is [iteration 11](../tasks/iteration-11.md)'s decision.
- **Source, not builds.** A package's `exports` point at its `.ts` files. Each
  consumer compiles what it imports: Next.js with `transpilePackages`, Metro
  natively. A package has no build step, no `dist/` and no second artefact to
  keep in step with its source.
- **One lockfile, at the root.** `web/` and `mobile/` have none of their own.
  Dependabot's npm entry, Trivy's manifest scan and the web's Docker build are
  pointed at the root, and the Docker build context becomes the repository
  root, since the lockfile and `packages/` are outside `web/`.
- **A package stays platform-neutral by a lint rule.** An ESLint rule fails a
  package that imports from an app (`web/` or `mobile/`) or from `react-dom`,
  `next` or `react-native`. Which rule and which fixture proves it fires are
  [task 09](../tasks/iteration-9/09-shared-packages.md)'s, as is where it
  lives; the requirement is that it fails the build.
- **E2E specs stay with the app they drive,** in `web/e2e/`. `architecture.md`
  §7 named a dedicated `e2e/` package as what a second client or workspaces
  might justify. Both have now happened, and the top level is fixed at three
  directories above, so the specs move with the app. A suite that drives the
  mobile app is [task 06](../tasks/iteration-9/06-decision-mobile-testing-strategy.md)'s.

This ADR decides the layout and does not perform it. [Task 08](../tasks/iteration-9/08-workspaces-refactor.md)
does the move and rewrites every path; until it merges the repository still
has `frontend/`, and the docs say so. [Task 09](../tasks/iteration-9/09-shared-packages.md)
builds the packages.

Whether ADR-0012's generation and its drift check still hold, now that a
second platform consumes the client, is
[task 04](../tasks/iteration-9/04-decision-api-compatibility-policy.md)'s
question, not this one's.

## Alternatives considered

- **pnpm.** A second package manager in every place that now runs `npm ci`:
  the CI jobs, the web's Docker build stage, every developer's machine and the
  Dependabot and Trivy entries (a different lockfile format). Its strength is
  a strict, linked `node_modules`, which two packages and two apps do not
  need. Not chosen: the cost is paid at once and the
  benefit is for a repository larger than this one.
- **Yarn.** The same second package manager, with its own lockfile and
  configuration file, for the same lack of benefit.
- **Turborepo.** A task runner that caches and orders builds across packages.
  With source-shipping packages there is no per-package build to order or
  cache; the only builds are the two apps', and each already runs on its own
  CI job. It would be a new dependency, a configuration file and a cache whose
  invalidation CI has to get right, for nothing to orchestrate. Not chosen.
- **Nx.** The same objection as Turborepo, with more machinery: a project
  graph and generators to configure for two packages.
- **A build step per package, publishing `dist/`.** Consumers would read plain
  JavaScript and no transpile setting would be needed. Rejected because the
  built output is a second artefact that has to be rebuilt before every
  consumer's test, type-check and dev server, and a stale `dist/` type-checks
  against what the source no longer says: the same silent drift that sharing
  was meant to remove.
- **A package of the features' `types.ts` files,** so the app could reuse the
  web's feature types. Rejected: the API's types come with the generated
  client, and what remains in those files is shaped by the web's own screens.
  Moving it would make a package out of one app's view code.
- **Keep copying,** with a check that the copies agree. Rejected: it keeps two
  copies and adds a third thing, the check, that can itself be wrong.
- **Keep `frontend/`.** With a `mobile/` beside it the name reads as "the
  frontend" when there are two, and the rename is cheapest while task 08 is
  already rewriting every path in CI, Docker, compose, the Makefile and the
  docs. Not chosen: the rename costs one commit now and a second sweep of
  every path later.
- **Per-app lockfiles under a shared package.** Rejected: a package would
  resolve a different version of the same dependency in each app, and the
  drift between the two lockfiles would be unchecked.

## Consequences

- Good, because the API contract and the translations each have one copy, so a
  change to either reaches both apps in the same commit and the same pull
  request.
- Good, because npm is already the package manager everywhere: the repository
  gains no tool, no dependency and no new lockfile format, only a lockfile that
  moves to the root.
- Good, because a package with no build step has nothing to rebuild or to go
  stale, and an edit shows up in the next test run of either app.
- Bad, because every consumer of `frontend/` stops checking silently if its
  path is missed, not failing. CI's change filter (which today matches
  `^frontend/`) must also match `packages/`, the root `package.json` and the
  root lockfile, or a change to a shared package runs neither app's tests.
  Dependabot's directory and Trivy's manifest list have the same failure.
  [Task 08](../tasks/iteration-9/08-workspaces-refactor.md) carries that risk.
- Bad, because the web's Docker build context widens from `frontend/` to the
  whole repository, so the image build sees, and can be invalidated by, files
  outside the web. Because one lockfile now covers every workspace, the web
  image's install must be scoped to what the web needs, or it pulls in the
  app's dependencies. Whether `npm ci` can be scoped to a workspace here is for
  task 08 to verify, not assumed.
- Bad, because a single hoisted `node_modules` means a package's `react` or
  `i18next` resolves to whichever version sits at the root. The two apps must
  agree on the versions the packages touch, or those dependencies must be
  peer dependencies of the package. The lint rule above keeps the platform's
  own modules out, but it does not check versions.
- Neutral, because the lockfile moves, so a lockfile diff in a pull request now
  covers every workspace rather than the web alone.
- Neutral, because "ship source" makes each app's compiler responsible for the
  packages. An app whose bundler stops compiling packages, or a third consumer
  without one, would need the build step this ADR rejects.
- **Revisit trigger:** a third consumer of a package, a package that needs a
  build (generated code that must be compiled before use, or a native module),
  or a build time that makes running all of CI on every change slow enough to
  want caching, which is the point where Turborepo or Nx would start to pay.

## Evidence

Read in `web/`'s Next.js 16.4.3 documentation (`node_modules/next/dist/docs/`)
on 2026-10-30. **Read, not run:** no workspace exists to build yet, and
[task 08](../tasks/iteration-9/08-workspaces-refactor.md) and
[task 09](../tasks/iteration-9/09-shared-packages.md) confirm each point below
by building.

- `transpilePackages` takes package names (scoped names included, not paths or
  globs) and compiles a dependency "instead of treating it as untouched runtime
  code".
- The same page says Turbopack transpiles workspace packages "automatically"
  under both routers, and webpack does so for the App Router, so listing a
  workspace package is, on the documented behaviour, explicit rather than
  required. This ADR lists them anyway, so that the dependency on the consumer
  compiling the source is declared where it can be read; task 09 confirms
  whether the entry changes anything and may drop it if not.
- The same page says Next.js does not compile code inside `node_modules` by
  default, and that a package which ships raw TypeScript is opted in by
  listing it. A workspace package is reached through the root `node_modules`
  and its source lives outside `web/`; that the listing is the safer default
  for it is this ADR's inference, not the page's wording.
- `output: "standalone"`, which the web uses, traces files from the project
  directory by default, and files outside it are not included unless
  `outputFileTracingRoot` is set (`output.md`). A package under `packages/` is
  such a file, so task 08 must set it and confirm by running the image.
- Turbopack finds its root by looking for a lockfile (`package-lock.json`
  among them), so a lockfile at the repository root makes the root the
  workspace root (`turbopack.md`).
- Metro compiling workspace TypeScript natively is not in Next.js's
  documentation and is not verified here; it is the mobile stack's decision
  ([task 02](../tasks/iteration-9/02-decision-the-mobile-stack.md)) and
  [task 11](../tasks/iteration-9/11-app-skeleton.md)'s to confirm.
