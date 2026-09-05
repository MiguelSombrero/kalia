# Kalia backend

Spring Boot 4.1 modulith (Java 25, Maven). Modules (`catalog`, `identity`, and
`cellar` from iteration 5) arrive iteration by iteration — see
[docs/roadmap.md](../docs/roadmap.md) and
[docs/architecture.md](../docs/architecture.md).

## Run locally

Full stack in containers: `docker compose up --build` from the repo root.
The backend is published at `localhost:8080` (loopback only — see
[docs/architecture.md](../docs/architecture.md) §6. It is an OAuth2 resource
server and denies by default, but the loopback binding stays until a deployment
story exists, so treat it as defence in depth rather than surplus).

For development with hot reload, run natively against the compose database:

```bash
docker compose up -d          # from repo root
cd backend
POSTGRES_PASSWORD=kalia SPRINGDOC_ENABLED=true LOG_LEVEL=DEBUG mvn spring-boot:run
curl localhost:8080/actuator/health
curl localhost:8080/api/v1/beers?query=westvleteren
```

API docs (springdoc): `/v3/api-docs` (OpenAPI 3.1) and Swagger UI at
`/swagger-ui/index.html`, both at `localhost:8080`. The compose stack
enables them; running natively needs `SPRINGDOC_ENABLED=true` as above,
since they are off unless a deployment opts in. Swagger UI's Authorize
button drives a real Authorization Code + PKCE sign-in against Keycloak
(`kalia-swagger` client) and attaches the resulting token to "Try it out"
requests — no manual token copying (docs/architecture.md §6).

## Configuration

One `application.properties`, no Spring profiles; every environment-varying
value is a `${ENV_VAR:default}` placeholder whose default fails safest
([ADR-0015](../docs/adr/0015-configuration-strategy.md)).

| Variable | Default | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | **none — required** | Startup aborts with the variable named if unset |
| `DATABASE_JDBC_URL` | `jdbc:postgresql://localhost:5432/kalia` | localhost, so a misconfigured deploy fails loudly rather than reaching a real database |
| `DATABASE_USERNAME` | `kalia` | |
| `LOG_LEVEL` | `INFO` | `fi.kalia` level; `DEBUG` in compose, `WARN` in tests |
| `SPRINGDOC_ENABLED` | `false` | API documentation is an exposure surface |
| `ACTUATOR_ENDPOINTS` | `health` | Web-exposed actuator endpoints, declared rather than inherited from Spring's default; a monitored deployment can widen it (e.g. `health,metrics,prometheus`). Everything but `health` also needs a token |
| `KEYCLOAK_ISSUER_URI` | `http://localhost:8081/realms/kalia` | The `iss` every accepted token must carry |
| `KEYCLOAK_JWK_SET_URI` | `http://localhost:8081/realms/kalia/protocol/openid-connect/certs` | Where signing keys are fetched. A *different address* from the issuer under docker-compose ([ADR-0028](../docs/adr/0028-resource-server-and-current-user.md)) |
| `KEYCLOAK_AUDIENCE` | `kalia-backend` | Required `aud` claim; rejects tokens minted for another client of the realm |
| `KEYCLOAK_SWAGGER_CLIENT_ID` | `kalia-swagger` | Public, no secret — pre-fills Swagger UI's Authorize dialog (keycloak/realm-export.json) |

Adding a setting that must not have a default means adding it to
`RequiredConfigurationValidator.REQUIRED` as well as the properties file.

## Test

```bash
mvn test                      # unit tests only (*Test) — fast, no Docker
mvn verify                    # + integration tests (*IT, Testcontainers —
                              #   needs Docker) + merged JaCoCo report
mvn clean verify              # after any pom.xml or plugin change
```

Naming convention: **unit tests end in `*Test`** (run by surefire in the
`test` phase), **integration tests end in `*IT`** (run by failsafe in the
`verify` phase). Anything booting a Spring context or a Testcontainer is an
integration test.

Use `clean` after changing `pom.xml` or a plugin: an incremental build can
report success against stale `target/classes` output.

Before pushing, run the whole gate rather than this suite alone: `make verify`
from the repository root, or `make verify-fast` for the subset that needs no
Docker ([ADR-0046](../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).

`mvn verify` prints ~285 lines, mostly Spring context startup. To keep a
green run cheap for an AI-agent session, filter it — this keeps every
`Tests run:` count, so the run is still evidence:

```bash
mvn verify 2>&1 | grep -E "Tests run:|ERROR|FAIL|BUILD"
```

Triage only, not lossless: it names a failing test and its line but drops
the assertion detail. **On a failure, re-run unfiltered** (or read
`target/failsafe-reports/`) before diagnosing anything.

Coverage: JaCoCo merges unit + integration data into
`target/site/jacoco-merged/` on `mvn verify`; CI prints the instruction
coverage in the job log. The ≥ 80 % aim is measured, not gated — see
Testing conventions below.

CI also scans `pom.xml` and the built image for known CVEs and fails on a
`HIGH`/`CRITICAL` finding with a fix available
([ADR-0024](../docs/adr/0024-dependency-vulnerability-scanning.md)). A finding
is fixed in place on whatever branch is open (CLAUDE.md), by bumping the
flagged dependency to Trivy's named fixed version in `pom.xml` — confirm the
fix locally before pushing with
`trivy fs --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed pom.xml`,
matching CI's `vulnerability-scan.yml` exactly.

Notable suites:

- `ModularityTest` — Spring Modulith `ApplicationModules.verify()`; fails on
  illegal cross-module dependencies
- `ArchitectureTest` — the ArchUnit rules: layer placement and dependency
  direction ([ADR-0007](../docs/adr/0007-backend-package-structure.md)),
  including the module-root API reaching `domain` only through `application`,
  and the guard that keeps the one resource-server filter chain in `identity`
  ([ADR-0028](../docs/adr/0028-resource-server-and-current-user.md)) — a
  module bringing its own security configuration, or the chain going missing,
  fails the build
- `ArchitectureRulesRejectViolationsTest` — runs four of those rules against
  `src/test/java/archfixture/`, a tree that breaks them. **Only the rules no
  production class ever triggers get a fixture.** `entitiesLiveInDomain` needs
  none: `Beer` is an `@Entity`, so a mistake in the rule fails
  `ArchitectureTest` itself. A `noClasses()` rule — or a `classes().should()`
  rule every production class merely satisfies, like the module-root one — is
  the opposite: passing means its condition never met a violator, so a wrong
  condition looks exactly like a satisfied one. Adding a fixture for an
  already-exercised rule tests ArchUnit, not this codebase; don't
- `KaliaApplicationIT` — boots the full context against a PostgreSQL
  Testcontainer (pinned in `TestcontainersConfiguration`): health endpoint
  reports UP, Flyway migrations create the module schemas
- `ArchitectureDocumentationTest` — parses `docs/architecture.md` §2/§3 at
  test time and compares the module set and dependency edges against Spring
  Modulith's own view (`fi.kalia.web` excluded, per ADR-0014); fails the
  build the moment the code and the hand-written docs disagree, in either
  direction, or either section can't be found. Runs as a `*Test` since
  `Documenter` needs no Spring context or Testcontainer

## Database migrations

Flyway owns the schema (`ddl-auto=validate`). Locations under
`src/main/resources/db/migration/`:

- `common/` — cross-module infrastructure (module schemas, Spring Modulith
  `event_publication` registry)
- one directory per module, added when the module lands (registered in
  `spring.flyway.locations`)

Version numbers (`V001`, `V002`, …) are **globally unique across all
directories** — take the next free number regardless of directory.

Migrations install one PostgreSQL extension, `pg_trgm`
([ADR-0044](../docs/adr/0044-catalog-search-indexes.md)). It is a trusted
extension, so the database owner can create it, but a deployment running
migrations as a lower-privileged role fails at `CREATE EXTENSION`.

**Until Kalia's first deployment, put a schema change in the existing
migration it belongs to** rather than adding a new one — an index beside the
table it indexes, say
([ADR-0036](../docs/adr/0036-pre-deployment-migration-edits.md)). Editing an
applied migration changes its checksum, so a `docker compose` Postgres volume
that ran the old version fails Flyway validation until `docker compose down -v`
wipes it. Forward-only — an applied migration is never edited, and undoing one
is a new migration — resumes the moment a database exists whose schema state
outlives a developer's machine or CI.

## Code conventions

Rules for writing code here; each links to the ADR holding the reasoning —
see [ADR-0020](../docs/adr/0020-documentation-roles.md) for why the rationale
lives there rather than in this file.

- **Package structure per module**, enforced by `ArchitectureTest`: shape and
  rationale live in
  [docs/architecture.md §3](../docs/architecture.md#3-backend-modules) and
  [ADR-0007](../docs/adr/0007-backend-package-structure.md).
- **Entity→DTO mapping lives in `web`**, as static `from(...)` factories on
  the DTOs — so repositories must eager-load the relations the boundary needs
  (entity graphs), since mapping runs outside the service transaction.
- **Lombok for boilerplate, not for domain semantics.** Class-level `@Getter`
  and `@NoArgsConstructor(access = PROTECTED)` (the JPA constructor) on
  entities. Never `@Setter`, `@Data` or `@Builder` on an entity — state
  changes go through factory and behavior methods that enforce invariants.
- Value objects and DTOs are Java records, which need no Lombok.
- **JSpecify nullability.** Every package has a `package-info.java` with
  `@NullMarked`; types are non-null by default and anything nullable is
  annotated `@org.jspecify.annotations.Nullable` — fields, record components,
  parameters and returns alike. New packages must add the marker.
- **SpringDoc annotations on every public endpoint.** `@Tag` on the controller
  class, `@Operation` on every handler, `@Parameter` on every
  `@RequestParam`/`@PathVariable`, `@Schema` descriptions on DTOs. New
  endpoints and DTOs ship annotated — undocumented API surface is a gap, not
  a later task. Document each handler's response codes with `@ApiResponse`/
  `@ApiResponses`; a response every handler in the controller shares (e.g.
  401 on a controller where every route requires authentication) goes on the
  class instead of repeating it per method.
- **Text blocks (`"""`), not string concatenation, for a multiline string
  literal** — including annotation values (`@Operation(description = """…""")`),
  which accept a text block as a compile-time constant the same as any other
  string literal. A trailing `\` at the end of a line suppresses that line's
  newline, for a literal that should read as one continuous sentence.
- **Import a type rather than referencing it fully-qualified inline** —
  `List<String>`, not `java.util.List<String>` — including in test code, a
  cast, or a one-off local variable. Existing fully-qualified inline
  references are not being retrofitted wholesale; fix the ones a change
  actually touches.
- **Every request parameter is bounded**: named constants, not bare
  annotation values, and a constraint spanning two parameters is checked in
  the handler and reported through `detail`
  ([ADR-0042](../docs/adr/0042-bounded-request-parameters.md)).
- **Endpoints are protected unless listed as public.** `SecurityConfig`
  (`fi.kalia.identity.web`) permits the catalog reads, `/actuator/health` and
  the API docs; everything else needs a bearer token. A controller resolves
  the caller's id at the web edge — via `IdentityApi.requireCurrentUserId()`
  outside `identity`, or `CurrentUserService` directly inside it — and passes
  that id into the application service; a public or anonymous read takes a
  resolved owner id, or none, the same way. `profile` is the one exception,
  decoding the token itself rather than depending on `identity`
  ([ADR-0049](../docs/adr/0049-profile-module-and-public-identity.md))
  ([ADR-0028](../docs/adr/0028-resource-server-and-current-user.md)).
- Code comments carry only what the repo cannot — full policy in
  [`.claude/rules/code-comments.md`](../.claude/rules/code-comments.md), which
  loads on its own when you open a file here
  ([ADR-0017](../docs/adr/0017-code-comment-policy.md)).

**Traps — do not "fix" these**

Each fails silently rather than at build time, so the warning stays here
rather than behind a link.

- **Every non-`@Nullable` DTO field needs
  `@Schema(requiredMode = Schema.RequiredMode.REQUIRED)`.** springdoc infers
  `required` from nothing — not non-nullability, not primitives — so without
  it the field silently becomes optional in the generated schema, and the
  frontend's client is wrong ([ADR-0012](../docs/adr/0012-orval-api-client.md)).
- **Null fields must stay omitted from JSON**
  (`spring.jackson.default-property-inclusion=non_null`), never `"field":
  null` — that is what keeps `city?: string` sound across the schema, the
  generated types and the wire. `DtoSerializationIT` pins it.
- **Don't add a handler for a generic Spring MVC exception without first
  measuring what Boot already returns.** A `ProblemDetail` return carries no
  response headers, so overriding an exception whose Boot handling sets one
  (405 sets the RFC-required `Allow`) silently drops it
  ([ADR-0014](../docs/adr/0014-shared-exception-handling.md)).
- **Module advice and `GlobalExceptionHandler` must never handle the same
  type.** Two advice beans on one exception type is not a startup error —
  Spring resolves it silently by `@Order`, and `GlobalExceptionHandler` runs
  at `Ordered.HIGHEST_PRECEDENCE`, so it wins and masks the mistake.
- **A handler with any `@ApiResponse` needs an explicit `@ResponseStatus`,
  even one matching Spring's own default (`200`).** Without it, springdoc
  stops synthesizing the success response from the return type the moment
  any `@ApiResponse` applies to that operation — including one declared at
  the class level — and silently drops the success response from
  `/v3/api-docs` instead of adding to it. No compile error, no test failure
  unless something asserts on the generated spec.

## Error-handling convention

`ProblemDetail.detail` carries only messages from exception types **explicitly
designed as API responses** (e.g. `BeerNotFoundException`,
`InvalidSearchParameterException`) — their messages are written for API
consumers and contain nothing internal. **Never map broad exception types**
(`IllegalArgumentException`, `RuntimeException`) to responses: a library
exception caught by such a handler would leak internal messages. Everything
unexpected falls through to Spring Boot's defaults — 500 problem+json without
a message (`server.error.include-message=never`), logged server-side.

Business exceptions live in each module's own `<module>.web` advice; the one
shared advice, `fi.kalia.web.GlobalExceptionHandler`, handles only the two
Bean Validation exceptions where Boot omits field-level detail
([ADR-0014](../docs/adr/0014-shared-exception-handling.md)).

## Logging conventions

SLF4J via Lombok's `@Slf4j`, parameterized only, level chosen by what's being
logged rather than by the mechanism that produced it. Full convention and
rationale: [ADR-0013](../docs/adr/0013-logging-conventions.md).

## Testing conventions

- **Aim for ≥ 80 % coverage of the backend — through valuable tests, not
  coverage theater.** Test domain logic, filtering/sorting, mappings and
  error paths; do not test trivial code (plain getters, dumb DTOs,
  framework wiring).
- Test behavior against real collaborators where practical: specifications
  and repositories run against PostgreSQL via Testcontainers
  (`@DataJpaTest`), the API via `@SpringBootTest` + `RestTestClient`.
  Mock-heavy unit tests that assert implementation calls are a smell.
