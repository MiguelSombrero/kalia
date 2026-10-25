# Kalia backend

Spring Boot modulith (Java 25, Maven). Its modules, what each owns and what
each depends on: [docs/architecture.md §3](../docs/architecture.md#3-backend-modules).

## Run locally

Full stack in containers: `docker compose up --build` from the repo root.
The backend is published at `localhost:8080` (loopback only — see
[docs/architecture.md](../docs/architecture.md) §6. It is an OAuth2 resource
server and denies by default, but the loopback binding stays until a deployment
story exists, so treat it as defence in depth rather than surplus).

For development with hot reload, run natively against the compose database.
Name the services: a bare `docker compose up -d` also starts the `backend`
container on `127.0.0.1:8080`, the port the native run needs. Keycloak is
only there for bearer tokens and Swagger UI's Authorize button; the backend
starts without it.

```bash
docker compose up -d postgres keycloak keycloak-config   # from repo root
cd backend
POSTGRES_PASSWORD=kalia FEED_CURSOR_KEY=any-local-key-of-at-least-32-bytes SPRINGDOC_ENABLED=true LOG_LEVEL=DEBUG mvn spring-boot:run
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
| `FEED_CURSOR_KEY` | **none — required** | HMAC key signing feed cursors, at least 32 bytes (`openssl rand -base64 32`). Every instance must hold the same value and it must survive restarts, or a cursor issued before is rejected with a 400 ([ADR-0060](../docs/adr/0060-feed-delivery-is-polling.md)). Rotating it invalidates cursors in flight, which the client recovers from by reloading the feed. Compose supplies a dev-only value |
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

**Maven must run on JDK 25, not merely have it installed.** Java stays on 25
([ADR-0085](../docs/adr/0085-runtimes-follow-long-term-support-not-the-newest-major.md)), and Lombok's
annotation processor reaches into `javac` internals, so a newer JDK fails the
`compile` goal with `Fatal error compiling:
java.lang.ExceptionInInitializerError: com.sun.tools.javac.tree.EndPosTable`
— which names neither Lombok nor the JDK, and looks like a broken build
rather than a wrong toolchain. `mvn -version` reports the JDK Maven itself
runs on, which is *not* necessarily the one `java -version` shows (Homebrew's
`maven` formula depends on its own `openjdk`). Point it at 25 if they differ:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 25) mvn clean verify
```

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
fix locally before pushing with `make trivy-scan` from the repository root,
which runs CI's `vulnerability-scan.yml` manifest scan with its exact flags
(Trivy is a local prerequisite, `brew install trivy`). An OS-package finding in the
image needs no edit: the runtime stage's `apt-get upgrade` takes Ubuntu's
fixed package at build time, so rebuild and confirm with
`docker compose build backend` then
`trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 --ignorefile .trivyignore.yaml <compose project>-backend`
from the repository root. The image scans are the one CI check `make verify`
leaves out.

Notable suites:

- `ModularityTest` — Spring Modulith `ApplicationModules.verify()`; fails on
  illegal cross-module dependencies
- `ArchitectureTest` — the ArchUnit rules: layer placement and dependency
  direction ([ADR-0007](../docs/adr/0007-backend-package-structure.md)),
  including the module-root API never naming a `domain` type,
  and the guard that keeps the one resource-server filter chain in `identity`
  ([ADR-0028](../docs/adr/0028-resource-server-and-current-user.md)) — a
  module bringing its own security configuration, or the chain going missing,
  fails the build — and the one that keeps token claims there: a `Jwt`
  used outside `identity` fails it
- `ArchitectureRulesRejectViolationsTest` — runs the rules above that no
  production class ever triggers against `src/test/java/archfixture/`, a tree
  that breaks them, and the two that require the filter chain against a
  codebase that has none. **Only those rules get a fixture.** `entitiesLiveInDomain` needs
  none: `Beer` is an `@Entity`, so a mistake in the rule fails
  `ArchitectureTest` itself. A `noClasses()` rule — or a `classes().should()`
  rule every production class merely satisfies — is
  the opposite: passing means its condition never met a violator, so a wrong
  condition looks exactly like a satisfied one. Adding a fixture for an
  already-exercised rule tests ArchUnit, not this codebase; don't
- `HttpBoundaryTest` — the HTTP-boundary ArchUnit rules, kept apart from
  `ArchitectureTest` because that class is about layer direction and this one
  about what a handler may put on the wire: a controller handler may
  neither return nor accept (`@RequestBody`) a JPA entity, seen through
  `List`, `Page`, `Optional` and `ResponseEntity` wrappers alike; an advice
  `@ExceptionHandler` may not answer with a body type that reaches an entity
  through its fields, and an advice may not call `ProblemDetail.setProperty`
  (architecture.md §4, §7)
- `HttpBoundaryRulesRejectViolationsTest` — same reasoning as
  `ArchitectureRulesRejectViolationsTest` above, applied to `HttpBoundaryTest`:
  none of its rules has a production violator, so each is re-run against
  `archfixture/httpboundary/`
- `ApiErrorDocumentationIT` — reads `/v3/api-docs`: every operation lists an
  error, an authenticated one a `401`, one taking input a `400`, each as
  problem+json with a declared schema that nests nothing under `properties`
  (ADR-0014); `ErrorBodyShapesIT` pins the same shapes on the wire, and
  `ProblemJsonSecurityErrorsIT` the filter chain's `401` body and challenge
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

### The Wikidata import (`V008`)

`catalog/V008__catalog_wikidata_import.sql` is generated — **do not edit it by
hand**; `make check` fails when it differs from what the committed inputs
produce ([ADR-0077](../docs/adr/0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md)).
Its inputs live in `scripts/wikidata/`: the snapshot and the five hand-reviewed
mappings (styles, seeded rows, brewery countries, country codes, and the
present-day countries of breweries in states with no code). To change a rule or a
mapping, edit the generator or the mapping and regenerate, from the repository
root, without network access:

```bash
node scripts/wikidata-migration.mjs        # rewrites V008, prints what it dropped and why
node scripts/wikidata-migration.mjs --check
```

A new style class, a new collision with a seeded row, or a brewery in a state
with no ISO code stops the generator with the entry to add. Re-taking the
snapshot (`node scripts/wikidata-extract.mjs`) queries Wikidata and is a new
task, not a routine step: the import only ever adds rows. Like any edited migration before the first deployment, a changed
`V008` needs `docker compose down -v` on an existing local database.

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
  class instead of repeating it per method. An error is documented with the
  declared type it is sent as (`Problem`, or `ValidationProblem`,
  `DuplicateBeerProblem` and the like), as `application/problem+json`; a `400`
  that may be either a field refusal or a malformed request is
  `@Schema(oneOf = {ValidationProblem.class, Problem.class})`. The `500` every
  operation can end in is added once by `UnexpectedFailureDocumentation`, not
  per handler. `ApiErrorDocumentationIT` fails an operation that lists no error,
  an authenticated one with no `401`, or one taking input with no `400`.
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
  (`fi.kalia.identity.web`) permits the routes
  [docs/architecture.md §6](../docs/architecture.md#6-authentication-and-identity)
  lists, and `PublicRoutesIT` fails when the two differ; everything else
  needs a bearer token. A controller resolves
  the caller at the web edge — via `IdentityApi.requireCurrentUserId()` and
  `requireCurrentUsername()` outside `identity`, or `CurrentUserService`
  directly inside it — and passes the id into the application service. No
  other module touches a `Jwt` (`ArchitectureTest.onlyIdentityReadsTokenClaims`),
  and a token whose claims `identity` cannot map is an
  `InvalidBearerTokenException`, answered `401` from any route
  ([ADR-0028](../docs/adr/0028-resource-server-and-current-user.md),
  [ADR-0049](../docs/adr/0049-profile-module-and-public-identity.md)). A
  service that returns *another* user's data decides whether it may: a public
  read takes the owner's username and enforces visibility itself
  (`CellarService.readPublicCellar`, `FeedService`), so no second controller or
  client can skip the check
  ([ADR-0050](../docs/adr/0050-public-cellar-addressing.md),
  [ADR-0059](../docs/adr/0059-feed-respects-cellar-visibility.md)).
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
  generated types and the wire. The per-module `*DtoSerializationIT` classes pin it.
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
- **Change the API's wire format through a `ServerHttpMessageConvertersCustomizer`,
  never an `HttpMessageConverter` bean.** Boot hands every converter bean to
  the HTTP clients as well — `RestClient` and the tests' `RestTestClient` —
  ahead of their defaults, so a stricter or reformatting JSON converter
  silently changes how outgoing calls decode responses too. In tests it can
  take over reading a `problem+json` body as a `String`, failing ITs that
  never touched JSON.

## Error-handling convention

`ProblemDetail.detail` carries only messages from exception types **explicitly
designed as API responses** (e.g. `BeerNotFoundException`,
`InvalidSearchParameterException`) — their messages are written for API
consumers and contain nothing internal. **Never map broad exception types**
(`IllegalArgumentException`, `RuntimeException`) to responses: a library
exception caught by such a handler would leak internal messages. Everything
unexpected falls through to Spring Boot's defaults — 500 problem+json without
a message (`server.error.include-message=never`), logged server-side.

Business exceptions live in each module's own `<module>.web` advice, scoped to
that module's controllers with `@RestControllerAdvice(basePackages =
"fi.kalia.<module>.web")` — a bare `@RestControllerAdvice` registers for every
controller in the application, not just the owning module's. `ArchitectureTest`
fails the build on a new advice outside `fi.kalia.web` with no `basePackages`.
The one shared advice, `fi.kalia.web.GlobalExceptionHandler`, handles only the
two Bean Validation exceptions where Boot omits field-level detail
([ADR-0014](../docs/adr/0014-shared-exception-handling.md)).

An error with fields beyond RFC 9457's is a class extending `fi.kalia.web.Problem`
with those fields as declared getters (see `ValidationProblem`), returned by its
handler — never `ProblemDetail.setProperty`, which `HttpBoundaryTest` fails on:
it is untyped, so neither the generated clients nor the entity guard can see
it. A field-error item is `fi.kalia.web.FieldErrorDto`, shared by every `400`.
The filter chain's own `401` and `403` are problem+json through
`ProblemJsonSecurityHandlers`, which keeps Spring Security's `WWW-Authenticate`
challenge and adds only a body.

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
