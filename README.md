# Kalia

[![CI](https://github.com/MiguelSombrero/kalia/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/MiguelSombrero/kalia/actions/workflows/ci.yml)

> **Status:** which iterations are done and which is in progress is the
> table in [docs/roadmap.md](docs/roadmap.md#iterations), and what each built
> is listed under it. Implementation proceeds one issue at a time.

## Goal

Kalia is hobby project developed with AI agents, focusing on the development process rather than fast-to-market. The main goals for this project is to:

1. create solid agentic development process which ensures the quality of the product (no drift between documentation and implementation, comprehensive tests etc.)

2. production-grade standards for architecture, design and code.

## Vision

Kalia is a social platform for beer enthusiasts, built around the beer cellar.

Enthusiasts age beer. A cellar is the record of what is down there: which
beers, which bottles, when each was brewed and how long it has left. Kalia
keeps that record, and makes it something you can share.

Three things carry the product:

- **The cellar** — the reason Kalia exists. A cellar holds _bottles_, not just
  beers: an AleSmith IPA brewed in January 2026 is a different thing from one
  brewed two years earlier, and a cellar that cannot tell them apart is a list,
  not a cellar. Yours is private until you decide otherwise; a public cellar is
  something anyone can browse.
- **The catalog** — what makes the cellar possible, since you have to find a
  beer before you can own it. It grows the way it has to: new beers appear
  faster than any single source keeps up with, so the people using Kalia add
  them.
- **The feed** — what makes it social. Adding a beer to your cellar is news to
  people who care about beer; the front page is where that shows up, and where
  a public cellar gets found.

And what Kalia deliberately is not. **It is not a beer review platform** —
Untappd and Pint Please do that well and Kalia will not compete with them. A
rating is a number Kalia _shows_, sourced from elsewhere, never one it collects.
**It is not a beer shop** either; at most, some distant day, it may tell you
where a beer can be bought and for how much.

## Roles

**MiguelSombrero — product owner.** Sets vision and goals, owns every
architecture and design decision, prioritises and refines the backlog, reviews
code and merges pull requests. Does not write code.

**AI agents** produce all documentation and code, in four roles:

- **Scrum master** — proposes iterations, distils the vision into scope, writes
  task files and drives the refinement conversation. Never moves a task to
  `refined` on its own behalf; that transition is the product owner's gate.
- **Architect** — designs module boundaries and data models, proposes ADRs,
  keeps [docs/architecture.md](docs/architecture.md) true. Lays out the
  trade-offs and guides the product owner through them; the product owner
  decides.
- **Developer** — implements one refined task at a time, test-first, and opens
  the pull request.
- **Reviewer** — runs the code-review gate on every diff and the periodic
  quality sweep, and treats review comments as a dialogue, not instructions.

## Run locally

```bash
echo "KALIA_WEB_CLIENT_SECRET=kalia-dev-secret" > .env   # once per checkout: a credential, so compose has no default
make stack-env   # in a git worktree only: gives it its own ports
make up          # docker compose up --build -d; `make down` stops it
docker compose down -v   # reset: stops the stack and deletes its data
```

| You reach | At |
|---|---|
| Web app | `localhost:3000` |
| API and Swagger UI | `localhost:8080` |
| Keycloak (the `kalia` realm) | `localhost:8081` |
| Keycloak admin console | `localhost:8083` (admin/admin) |
| Mailpit inbox (every email Keycloak sends) | `localhost:8025` |
| Postgres / Valkey | `localhost:5432` / `localhost:6379` |

All are bound to localhost only. Sign in to Kalia as `testuser` / `testuser123`,
or as `testadmin`, which holds the `admin` role; its password is
`KALIA_DEV_ADMIN_PASSWORD` in [docker-compose.dev.env](docker-compose.dev.env).
Every value in that file is dev-only: never reuse one outside local development.

- `make stack-env` gives worktree slot *n* each default port + 100×*n*.
- Two stacks on `localhost` share session cookies in one browser: use a browser
  profile per worktree.
- A realm change made in the Keycloak admin console is overwritten on the next
  `up` (keycloak-config-cli reconciles the realm,
  [ADR-0054](docs/adr/0054-keycloak-config-cli-realm-management.md)); re-apply the
  file with `docker compose run --rm keycloak-config`.
- A fresh worktree with no `.env` fails on an interpolation error naming
  `KALIA_WEB_CLIENT_SECRET`.

Hot-reload runs of one app: [backend/README.md](backend/README.md),
[web/README.md](web/README.md) and [mobile/README.md](mobile/README.md).

## What Kalia does

What a user can do, iteration by iteration, is listed once, in
[docs/roadmap.md](docs/roadmap.md#what-each-iteration-built), beside what is
planned next. Further out, in the [backlog](docs/tasks/backlog.md): beer ratings
sourced from an external platform, likes and comments on feed events, and —
dependent on whether beer shops publish usable APIs — showing where a beer can
be bought.

## Architecture

A **monorepo**: a Next.js web app, an Expo mobile app and a Spring Boot
**modulith** backend. The web app is a **backend-for-frontend**: the browser
never calls the API, and tokens and sessions stay server-side. The mobile app
signs in as a public PKCE client and calls the API directly through the `edge`
proxy ([ADR-0095](docs/adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)). How the clients, the `edge` proxy,
the services and the data stores connect:
[docs/architecture.md §2](docs/architecture.md#2-high-level-design); the backend
modules: [§3](docs/architecture.md#3-backend-modules). Decision records:
[docs/adr/](docs/adr/).

## Tech stack

An inventory, not a version list. **The version of a thing lives in the file that
installs it** and nowhere else — the manifests: `backend/pom.xml`, every
`package.json` (the root's, `web/`, `mobile/` and `packages/*/`), the
`docker-compose*.yml` files, the `Dockerfile`s, `.github/workflows/`, and the
toolchain pin files (`.node-version`, `.xcode-version`, `.tailscale-version` and
`mobile/.java-version`)
([ADR-0020](docs/adr/0020-documentation-roles.md)). A number appears below only
where it is the point of the sentence. Add a technology here when you add it to
a manifest; don't restate what the manifest says.

### Backend

- Java 25, Spring Boot 4, Spring Modulith
- PostgreSQL 18 (persistence), Flyway (migrations and seed data)
- Maven; JUnit 6, Testcontainers, surefire/failsafe (`*Test` / `*IT`), JaCoCo,
  ArchUnit
- Lombok (version managed by Spring Boot's BOM)
- springdoc-openapi (OpenAPI spec and Swagger UI)
- Spring Security OAuth2 resource server (JWT validation against Keycloak, [ADR-0028](docs/adr/0028-resource-server-and-current-user.md))
- Micrometer (Prometheus registry and tracing bridge, no exporter or viewer, [ADR-0088](docs/adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md))
- `pom.xml` overrides Tomcat and the two Jackson BOMs past Spring Boot's versions to clear a CVE; each carries an XML comment naming the CVE and when to drop it

### Web app

- Next.js 16 (App Router), React 19, TypeScript (ESLint parses with its own TS 5 copy until typescript-eslint supports TS 7)
- Tailwind CSS 4
- Radix UI dialog and toast, the only UI dependencies ([ADR-0021](docs/adr/0021-design-tokens-ui-primitives.md))
- TanStack Query (client data layer, ADR-0008), Zustand (client UI state, ADR-0009)
- react-hook-form, Zod and @hookform/resolvers (forms, ADR-0010)
- i18next, i18next-resources-to-backend and react-i18next (English and Finnish, ADR-0011)
- orval (API client generated from the committed OpenAPI spec into `packages/api`, ADR-0012, ADR-0093); oasdiff (breaking-change diff of that spec against `dev`'s, ADR-0093)
- Vitest and React Testing Library; Playwright (E2E, chromium only, against the compose stack)
- eslint-plugin-jsx-a11y, jest-axe, @axe-core/playwright (WCAG 2.2 AA, ADR-0075); eslint-plugin-boundaries (import boundaries, checked by `npm run lint`)
- next-auth 5, still a beta line (OIDC code flow with PKCE, ADR-0025); ioredis and a custom Valkey adapter for the session store; jose (back-channel logout token, ADR-0031)
- @prometheus-io/client (the token-gated `/api/metrics`, ADR-0088)
- **No `package.json` `overrides`.** One stays only while `npm audit` is clean only with it, and comes out once it is clean without it. Re-test when an audit finding names a package an override once covered, or `next` pins a vulnerable one

### Mobile app

- Expo (SDK generation in `mobile/package.json`) as a development build with generated native projects, React 19, React Native, TypeScript ([ADR-0094](docs/adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md))
- Expo Router (file-based navigation) with react-native-screens and react-native-safe-area-context; expo-dev-client, expo-font (with Bricolage Grotesque, SIL OFL, bundled as the app's one face, ADR-0110), expo-haptics (the result-of-an-action tap, ADR-0113), react-native-svg (the tab icons' drawings), expo-splash-screen, expo-status-bar, expo-system-ui, expo-linking, expo-constants and expo-application
- expo-auth-session and expo-web-browser (public PKCE client, ADR-0095), expo-secure-store (the offline token), expo-crypto
- `@kalia/api` and `@kalia/locales`, shared with the web app: the generated API client and the en/fi strings (react-i18next, i18next, expo-localization)
- TanStack Query, Zustand, react-hook-form with Zod and @hookform/resolvers, the same roles as on the web (@react-native-async-storage/async-storage persists client state)
- Jest with jest-expo, `@react-native/jest-preset` and React Native Testing Library (unit); sharp (renders the app's icons and splash from the web app's mark, `mobile/scripts/render-assets.mjs`); Maestro (end-to-end, Android the only CI platform, [ADR-0096](docs/adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md))
- eslint-config-expo, @tanstack/eslint-plugin-query, eslint-plugin-boundaries (checked by `npm run lint --workspace mobile`)
- Native toolchain pins: `.xcode-version` and `mobile/.java-version`, checked by `make mobile-doctor`

### Local infrastructure

- Keycloak 26 (identity provider; `keycloak/Dockerfile` also bakes in the login theme, [ADR-0056](docs/adr/0056-branded-bilingual-keycloak-pages.md))
- keycloak-config-cli (the `keycloak-config` service reconciles the realm on every startup, [ADR-0054](docs/adr/0054-keycloak-config-cli-realm-management.md))
- Valkey (session store); Mailpit (catches Keycloak's email locally; a deployment uses SMTP, see [the email task](docs/tasks/iteration-6.5/04-send-email-from-kalia.md))
- nginx (`edge/`, the only service the deployable stack publishes: per-client rate and body limits, [ADR-0090](docs/adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md))
- Tailscale (a physical iPhone reaches the stack over the owner's tailnet, opt-in with `make phone-mode`, [ADR-0097](docs/adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md))
- Docker Compose (the full stack); base images (Maven, Eclipse Temurin, Node on Alpine, nginx, Keycloak) are tagged in each `Dockerfile`

### CI

- GitHub Actions: `make verify`'s checks on every push, each suite only when the push can affect it (`scripts/ci-changes.mjs`). Every action is SHA-pinned with its tag in a trailing comment; `pr-body.yml` checks that a task-completing pull request fills in the template's Gates section, and `merge-ref-check.yml` runs `make check` on the merge of the branch into `dev`

## Repository layout

```
kalia/
├── backend/          # Spring Boot modulith (modules: docs/architecture.md §3)
├── web/              # Next.js app (BFF + UI), an npm workspace
├── mobile/           # Expo app (development build), an npm workspace (ADR-0094)
├── packages/         # shared TypeScript source, npm workspaces (ADR-0092)
│   ├── api/          # @kalia/api: generated API client + fetch core
│   └── locales/      # @kalia/locales: the en/fi strings
├── keycloak/         # realm export, login theme, Keycloak images
├── edge/             # nginx proxy in front of the web app, backend and Keycloak
├── postgres/         # Postgres image and init scripts
├── package.json      # the npm workspaces (ADR-0092)
├── package-lock.json # the one lockfile, for every workspace
├── scripts/          # dependency-free checkers CI runs, git hooks, generators
├── docs/
│   ├── architecture.md
│   ├── roadmap.md
│   ├── design.md     # the visual language
│   ├── glossary.md   # the ubiquitous language
│   ├── tasks/        # per-iteration task lists, backlog, quality backlog
│   ├── design-records/  # the choice each design task made, and why
│   └── adr/          # architecture decision records
├── .claude/          # agent skills, rules and settings
├── .github/          # CI workflows, Dependabot
├── Makefile          # `make help`; `make verify-fast` is the local gate
├── docker-compose.yml           # the local stack: includes the base with the dev values
├── docker-compose.override.yml  # what only development has: seed account, Swagger client
├── docker-compose.dev.env       # dev values for the base's secrets; the web client's comes from .env
└── docker-compose.base.yml      # the deployable definition: requires every secret
```

## The deployable definition

`docker-compose.base.yml` has no default for any secret. Name it alone and
Compose refuses to start, naming the variable that is missing:

```bash
docker compose -f docker-compose.base.yml up
# required variable POSTGRES_PASSWORD is missing a value: set POSTGRES_PASSWORD, see README.md
```

The file is the authority on which variables are required, and `make
compose-check` proves the refusal for each. `VALKEY_PASSWORD` takes letters,
digits and `. _ ~ -` only, since it is carried in the session store's address.
A bare `docker compose` is the local stack, so name the file
([ADR-0089](docs/adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)).

## Development approach

- **Iterative:** small, end-to-end vertical slices (see [roadmap](docs/roadmap.md)):
  the catalog first, then the cellar, then what makes it social.
- **Test-driven:** tests are written with (or before) the code: unit tests for
  domain logic, Testcontainers for APIs and persistence, Playwright for critical
  web user flows and Maestro for the mobile app's.
- **One issue at a time:** each roadmap task is a small, independently
  reviewable change with tests and updated docs.
- **Checks run locally, not in CI first:** `make verify-fast` is the ~40 s local
  gate; `make install-hooks` puts it behind `git push`. It needs
  [oasdiff](https://github.com/oasdiff/oasdiff) (`brew install oasdiff`, at CI's
  version); `make verify` also needs [Trivy](https://trivy.dev). The Docker-backed
  checks are the required CI checks
  ([ADR-0046](docs/adr/0046-edit-time-checks-and-one-verify-gate.md)). Nothing
  invokes an AI agent at push time; to hand a failure to one, run it yourself:

  ```bash
  claude -p "Run 'make verify-fast', fix every failure it reports, and re-run until it is green. Do not change behaviour." --allowedTools "Edit,Read,Bash"
  ```

## License

See [LICENSE](LICENSE).

## Credits

Kalia's beer catalog includes facts — names, ABVs, styles, and breweries'
countries and cities — imported once from [Wikidata](https://www.wikidata.org/),
whose structured data is available under
[CC0](https://creativecommons.org/publicdomain/zero/1.0/). Kalia credits it
even though CC0 does not require it
([ADR-0077](docs/adr/0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md)).
