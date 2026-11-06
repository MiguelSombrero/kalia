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

Create a `.env` file at the repository root first — Docker Compose loads it
automatically, and the compose files have no default for this one value on
purpose, since it is a credential:

```bash
echo "KALIA_WEB_CLIENT_SECRET=kalia-dev-secret" > .env
docker compose up --build   # web app at http://localhost:3000
```

The web app is at `:3000`; the backend is also reachable, at `:8080`, for
direct API access and Swagger UI — see [backend/README.md](backend/README.md).
Keycloak's admin console is at `:8083` (admin/admin, dev-only credentials),
a port of its own: `:8081` serves the `kalia` realm's user-facing endpoints
and answers `404` for `/admin` and `/realms/master`, as `:8080` does for
`/actuator/*` but `health` and `:3000` for `/api/auth/backchannel-logout`.
Those four are not published by their own containers but by the `edge` nginx
proxy in front of them, which limits requests and body sizes per client
address ([ADR-0090](docs/adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)),
so a script that floods one gets `429`. Valkey is at `:6379` (password
`kalia-dev-valkey-password`), Postgres at
`:5432`, and Mailpit's inbox UI — where every email Keycloak sends locally
lands — at `:8025`. All bindings are localhost-only, never reachable beyond
the dev machine. Those last three are published by
`docker-compose.override.yml` alone: the deployable definition runs no Mailpit
and publishes neither Postgres nor Valkey.

Postgres holds three roles besides the bootstrap superuser `kalia`
([ADR-0100](docs/adr/0100-postgres-has-three-roles-one-that-owns-the-schema-for-flyway-one-that-reads-and-writes-rows-and-one-for-keycloak.md)):
`kalia_owner` for Flyway, `kalia_app` for the backend's queries and `keycloak`,
each with its own password in
[docker-compose.dev.env](docker-compose.dev.env). They are created by
`postgres/init` on an empty volume only, so **a volume made before this
existed must be recreated once — `docker compose down -v` — and loses its
data.** `make moderate` and `make app-config` still connect as the superuser,
through `docker compose exec`.

Those are the defaults, and the main checkout keeps them. Each of the seven is
a variable in the root `.env` (`WEB_PORT`, `BACKEND_PORT`,
`KEYCLOAK_PORT`, `KEYCLOAK_ADMIN_PORT`, `POSTGRES_PORT`, `VALKEY_PORT`, `MAILPIT_PORT`; an eighth,
`METRO_PORT`, is the mobile app's Metro server, default `:8082` because Metro's
own `:8081` is Keycloak's — [mobile/README.md](mobile/README.md)), and every
address built from one — Keycloak's public address and the issuer the
web app and backend validate, the web app's own URL, the Swagger redirect
URI in the realm — follows it, so changing a port is a one-line edit. A
git worktree is given its own set by `make
stack-env`, which appends them to that worktree's `.env`: slot *n* adds 100×*n*
to each default (slot 1 is the web app `:3100`, backend `:8180`, Keycloak `:8181`,
Postgres `:5532`, Valkey `:6479`, Mailpit `:8125`, Metro `:8182`), taking the lowest slot no
other worktree's `.env` holds and whose ports are free, and re-running it
keeps what it wrote. Two worktrees can then run the stack, `make verify` and
the e2e suite at once. Cookies are scoped to a host and not a port, so two
stacks on `localhost` share their session cookies in one browser; to check
two by hand, give each worktree its own browser profile. The e2e suite is
unaffected, as Playwright's browser contexts are isolated. Running the apps
natively (`npm run dev`, `mvn spring-boot:run`) keeps the defaults and stays
one at a time.
[keycloak/realm-export.json](keycloak/realm-export.json) carries no
credential — the `kalia-web` client secret above and the other dev values
in [docker-compose.dev.env](docker-compose.dev.env) (`POSTGRES_PASSWORD`,
`AUTH_SECRET`, `VALKEY_PASSWORD`, the Keycloak admin login and the rest) are
fixed dev-only values — never reuse them outside local development. The realm
file is applied to Keycloak by the
`keycloak-config` service (`keycloak-config-cli`,
[ADR-0054](docs/adr/0054-keycloak-config-cli-realm-management.md)) on every
startup, not baked into the Keycloak image — it fully reconciles the realm
each run, so a change made in the admin console is overwritten on the next
`docker compose up`. `make verify` fails if the running realm has drifted
from the file; re-apply with `docker compose run --rm keycloak-config`.
To sign in to Kalia itself (not
the Keycloak admin console), use the seeded dev account `testuser` /
`testuser123`, created idempotently on every startup by the `keycloak-seed`
service rather than baked into the realm export. The same service seeds a
development admin, `testadmin`, holding the `admin` realm role
([ADR-0101](docs/adr/0101-an-admin-is-a-realm-role-in-the-access-token-which-the-backend-enforces-on-one-path-prefix-and-the-web-reads-in-its-bff.md)):
sign in as it to reach what only an admin may, and as `testuser` to see what
everyone else sees. Its password is `KALIA_DEV_ADMIN_PASSWORD` in
[docker-compose.dev.env](docker-compose.dev.env), a dev-only value like the
rest. The realm defines the role and grants it to no one, a self-registered
account never holds it, and the deployable definition seeds no account, so a
deployment has no admin yet: how its first one is made is not decided. The `kalia-swagger` client Swagger UI
signs in with is a second realm file, [keycloak/realm-swagger.json](keycloak/realm-swagger.json),
that only the local stack imports. For development with hot
reload, run the apps natively — see [backend/README.md](backend/README.md)
and [web/README.md](web/README.md).

## What Kalia does

What a user can do, iteration by iteration, is listed once, in
[docs/roadmap.md](docs/roadmap.md#what-each-iteration-built), beside what is
planned next. Further out, in the [backlog](docs/tasks/backlog.md): beer ratings
sourced from an external platform, likes and comments on feed events, and —
dependent on whether beer shops publish usable APIs — showing where a beer can
be bought.

## Architecture

Kalia is a **monorepo** with a Next.js web app and a Spring Boot **modulith**
backend. The web app follows the **backend-for-frontend (BFF)** pattern: the
browser talks only to Next.js, and the Next.js server calls the Spring Boot
REST API. Auth tokens and sessions stay server-side.

The diagram of how the clients, the `edge` proxy, the services and the
data stores connect is [docs/architecture.md §2](docs/architecture.md#2-high-level-design).

The backend is a single deployable split into Spring Modulith modules —
listed in [docs/architecture.md §3](docs/architecture.md#3-backend-modules) —
with enforced boundaries, keeping a later extraction
to microservices possible without paying the distributed-systems cost now.

Full design: [docs/architecture.md](docs/architecture.md) ·
Decision records: [docs/adr/](docs/adr/)

## Tech stack

What this project is built with, and why — an inventory, not a version list.
**The version of a thing lives in the file that installs it** and nowhere
else: `backend/pom.xml`, `web/package.json`, the `docker-compose*.yml` files, the
`Dockerfile`s and `.github/workflows/`
([ADR-0020](docs/adr/0020-documentation-roles.md)'s one-home rule, amended
2026-09-11). A number appears below only where the number is the point of the
sentence — a major version that tells you which framework generation this is,
an override and the condition for removing it, a pin taken to clear a CVE.
Add a technology here when you add it to a manifest; don't restate what the
manifest already says.

### Backend

- Java 25, Spring Boot 4 with Spring Modulith (later possibility to migrate to microservices)
- PostgreSQL 18 (data persistence), Flyway (migrations & seed data)
- Maven (build), JUnit 6 + Testcontainers + Spring Modulith verification tests;
  surefire/failsafe (Spring Boot-managed defaults; unit `*Test` /
  integration `*IT` split), JaCoCo (merged coverage report), ArchUnit
  (package-structure rules)
- Lombok (boilerplate reduction, version managed by Spring Boot's dependency
  BOM — see backend/README.md conventions)
- springdoc-openapi (OpenAPI spec + Swagger UI)
- spring-boot-starter-security-oauth2-resource-server (JWT validation against
  Keycloak, version managed by Spring Boot's dependency BOM — see ADR-0028)
- Micrometer (Prometheus registry and tracing bridge — failure counters and a
  W3C trace id in the logs, no exporter and no viewer; see ADR-0088)
- `pom.xml` overrides Tomcat and the two Jackson BOMs (the 2.x and 3.x lines)
  past the versions the Spring Boot BOM ships, each to clear a CVE. Each
  override carries an XML comment naming the CVE and the condition for
  dropping it again

### Web app

- Next.js 16 (App Router), React 19, TypeScript (typescript-eslint does not
  support TS 7 yet, so ESLint parses with its own TS 5 copy — revisit when it
  does)
- Tailwind CSS 4 (styling)
- @radix-ui/react-dialog and @radix-ui/react-toast (headless primitives behind
  the modal and the toast, the only two UI dependencies — why, in ADR-0021)
- TanStack Query (client-component data layer — see ADR-0008)
- Zustand (client UI state — see ADR-0009)
- react-hook-form + Zod (+ @hookform/resolvers) for stateful forms and
  validation (ADR-0010)
- i18next + i18next-resources-to-backend (server-side localization, English +
  Finnish), react-i18next (the client-component bridge, mounted in
  `app/providers.tsx` — see ADR-0011)
- orval (API client generated from the backend's committed OpenAPI spec into
  `packages/api`, committed + CI drift check — see ADR-0012, ADR-0093)
- oasdiff (CI's breaking-change diff of the committed spec against `dev`'s —
  see ADR-0093)
- Vitest + React Testing Library (unit/component tests), Playwright (E2E,
  chromium only, against the docker compose stack)
- **No `package.json` `overrides`.** The two it once carried, `postcss` and
  `sharp`, were re-tested on 2026-11-05 and removed — resolved and audited against
  `next` 16.4.5 (the latest) and 16.4.3 (the pin), and built on 16.4.3: `next` pins its own `postcss` at a version
  `npm audit` accepts, `sharp` resolves to the 0.35 line through `next`'s
  optional dependency and `mobile`'s own, and `postcss` as an override had
  forced `next`'s exact pin down to a version the audit now flags. Re-test when
  an `npm audit` finding names either package or `next` pins a vulnerable one:
  an override is justified by an audit that stays clean only with it, and
  comes out once it stays clean without it
- eslint-plugin-jsx-a11y, jest-axe (+ @types/jest-axe), @axe-core/playwright —
  WCAG 2.2 AA enforcement at lint/unit/E2E time (ADR-0075)
- eslint-plugin-boundaries (import boundaries between `app/`, `features/`,
  `components/ui/` and `lib/`, checked by `npm run lint` — see ADR-0012)
- next-auth 5, still a beta line (Auth.js — OIDC Authorization Code + PKCE
  client and session strategy, backed by a custom Valkey adapter — see
  ADR-0025)
- ioredis (Valkey client used by the Auth.js adapter)
- jose (verifies Keycloak's back-channel logout token against the realm's keys
  and reads the session id out of the id token — ADR-0031)
- Valkey (server-side session store, Redis-API-compatible — ADR-0025)
- @prometheus-io/client (the failure counters behind the token-gated
  `/api/metrics` — ADR-0088)

### Local infrastructure

- Keycloak 26 (identity provider — OIDC for the web app, JWT issuer for the
  backend; built from `keycloak/Dockerfile`, which is also where the Kalia
  login theme is baked in — [ADR-0056](docs/adr/0056-branded-bilingual-keycloak-pages.md))
- keycloak-config-cli (`quay.io/adorsys/keycloak-config-cli`, the
  `keycloak-config` service) — reconciles `keycloak/realm-export.json` into
  the running realm on every startup, and `make verify` fails if the realm has
  drifted from it ([ADR-0054](docs/adr/0054-keycloak-config-cli-realm-management.md))
- Mailpit (`axllent/mailpit`) — catches
  every email Keycloak sends in local dev and test; no auth, no real
  delivery. A deployment instead points the realm's SMTP config
  (`docker-compose.base.yml`'s `KEYCLOAK_SMTP_*`) at Gmail SMTP — the choice and its
  limits are in
  [docs/tasks/iteration-6.5/04-send-email-from-kalia.md](docs/tasks/iteration-6.5/04-send-email-from-kalia.md).
  The real credential is not created or held anywhere yet
- nginx (`edge/`, the `edge` service) — the one published service: it
  limits requests and body sizes per client address in front of the web app,
  backend and Keycloak ([ADR-0090](docs/adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md))
- Tailscale (the owner's own tailnet — how a physical iPhone reaches the stack
  on the Mac, opt-in with `make phone-mode`; its version is the one in
  `.tailscale-version`, which `make mobile-doctor` checks —
  [ADR-0097](docs/adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md))
- Docker Compose: full stack (edge + PostgreSQL + backend + web app +
  Keycloak + Valkey + Mailpit)
- Base images: Maven and Eclipse Temurin (backend), Node on Alpine (web app);
  tags are in each `Dockerfile`

### CI

- GitHub Actions (`make verify`'s checks, on every push to any branch, each
  suite only when the push can affect it: `scripts/ci-changes.mjs`). Every action is
  SHA-pinned with its tag in a trailing comment — `.github/workflows/` is the
  list; `pr-body.yml` also checks that a
  task-completing pull request fills in the template's Gates section

## Repository layout

```
kalia/
├── backend/          # Spring Boot modulith
│   └── src/main/java/fi/kalia/
│       ├── catalog/  # beers, breweries, search
│       ├── identity/ # token validation, current-user resolution
│       ├── cellar/   # personal beer cellar
│       ├── profile/  # user profile, public cellar visibility
│       ├── feed/     # front-page activity feed
│       └── notification/ # what a user is told and has not yet acknowledged
├── web/              # Next.js app (BFF + UI), an npm workspace
├── mobile/           # Expo app (development build), an npm workspace (ADR-0094)
├── packages/         # shared TypeScript source, npm workspaces (ADR-0092)
│   ├── api/          # @kalia/api: generated API client + fetch core
│   └── locales/      # @kalia/locales: the en/fi strings
├── keycloak/         # realm export, login theme, image
├── edge/             # nginx proxy in front of the web app, backend and Keycloak
├── postgres/         # init scripts
├── package.json      # the npm workspaces (ADR-0092)
├── package-lock.json # the one lockfile, for every workspace
├── scripts/          # dependency-free checkers CI runs, git hooks, generators
├── docs/
│   ├── architecture.md
│   ├── roadmap.md
│   ├── glossary.md   # the ubiquitous language
│   ├── tasks/        # per-iteration task lists, backlog, quality backlog
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

`docker-compose.base.yml` is the definition a deployment runs, and it differs
from the local stack in one way that matters: it has no default for any
secret. Name it alone, and Compose refuses to start with the variable that is
missing:

```bash
docker compose -f docker-compose.base.yml up
# required variable POSTGRES_PASSWORD is missing a value: set POSTGRES_PASSWORD, see README.md
```

It needs `POSTGRES_PASSWORD` (the bootstrap superuser's, held by Postgres
alone), `DATABASE_OWNER_PASSWORD`, `DATABASE_PASSWORD` and
`KEYCLOAK_DB_PASSWORD` (one per database role), `FEED_CURSOR_KEY`,
`AUTH_SECRET`, `KALIA_WEB_CLIENT_SECRET`, `KEYCLOAK_ADMIN`,
`KEYCLOAK_ADMIN_PASSWORD`, `KEYCLOAK_SSL_REQUIRED` (`none`, `external` or
`all`), `VALKEY_PASSWORD` (letters, digits and `. _ ~ -` only: it is carried
in the session store's address) and Keycloak's mail settings —
`KEYCLOAK_SMTP_HOST`, `KEYCLOAK_SMTP_PORT`, `KEYCLOAK_SMTP_FROM` and
`KEYCLOAK_SMTP_AUTH`, `KEYCLOAK_SMTP_STARTTLS`, `KEYCLOAK_SMTP_SSL` (each
`true` or `false`), with `KEYCLOAK_SMTP_USER` and `KEYCLOAK_SMTP_PASSWORD`
optional — from the environment or a `.env`. The database roles are created
on an empty Postgres volume only, so an existing volume is recreated with
`docker compose down -v`. `METRICS_TOKEN` is optional. It has no seeded account
and no Swagger client, and the web app refuses to start on the dev
`AUTH_SECRET`. A bare `docker compose` is the local stack, so name the file;
[ADR-0089](docs/adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)
says why it is split this way. `make compose-check` proves the refusal for
each variable.

## Development approach

- **Iterative:** features land as small, end-to-end vertical slices
  (see [roadmap](docs/roadmap.md)) — the catalog first, because it is what the
  cellar is built on, then the cellar, then what makes it social.
- **Test-driven:** tests are written with (or before) the code — unit tests
  for domain logic, Testcontainers-backed integration tests for APIs and
  persistence, Playwright for critical user flows.
- **One issue at a time:** each roadmap task is a small, independently
  reviewable change with tests and updated docs.
- **Checks run locally, not in CI first:** `make verify-fast` is the ~10 s
  local gate and `make install-hooks` puts it behind `git push`; the
  Docker-backed checks are the required CI checks, which block a merge when
  red. `make verify` runs the same list locally, minus the image vulnerability
  scans (and needs [Trivy](https://trivy.dev) installed)
  ([ADR-0046](docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).
  Nothing invokes an AI agent on your behalf at push time. To hand a failure
  to one deliberately, run it yourself:

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
