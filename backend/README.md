# Kalia backend

Spring Boot 4.1 modulith (Java 25, Maven). Modules (`catalog`, `identity`,
`cellar`; store modules if chosen later) arrive iteration by iteration — see
[docs/roadmap.md](../docs/roadmap.md) and
[docs/architecture.md](../docs/architecture.md).

## Run locally

Full stack in containers: `docker compose up --build` from the repo root.
The backend is published at `localhost:8080` (loopback only — see
[docs/architecture.md](../docs/architecture.md) §6; it stays unauthenticated
until the auth iteration, so this must never become a non-loopback binding).

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
since they are off unless a deployment opts in.

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
| `ACTUATOR_ENDPOINTS` | `health` | Web-exposed actuator endpoints, declared rather than inherited from Spring's default; a monitored deployment can widen it (e.g. `health,metrics,prometheus`) |

Adding a setting that must not have a default means adding it to
`RequiredConfigurationValidator.REQUIRED` as well as the properties file.

## Test

```bash
mvn test                      # unit tests only (*Test) — fast, no Docker
mvn verify                    # + integration tests (*IT, Testcontainers —
                              #   needs Docker) + merged JaCoCo report
```

Naming convention: **unit tests end in `*Test`** (run by surefire in the
`test` phase), **integration tests end in `*IT`** (run by failsafe in the
`verify` phase). Anything booting a Spring context or a Testcontainer is an
integration test.

Coverage: JaCoCo merges unit + integration data into
`target/site/jacoco-merged/` on `mvn verify`; CI prints the instruction
coverage in the job log. The ≥ 80 % aim is measured, not gated — see
Testing conventions below.

Notable suites:

- `ModularityTest` — Spring Modulith `ApplicationModules.verify()`; fails on
  illegal cross-module dependencies
- `KaliaApplicationIT` — boots the full context against a PostgreSQL 18.4
  Testcontainer: health endpoint reports UP, Flyway migrations create the
  module schemas

## Database migrations

Flyway owns the schema (`ddl-auto=validate`). Locations under
`src/main/resources/db/migration/`:

- `common/` — cross-module infrastructure (module schemas, Spring Modulith
  `event_publication` registry)
- one directory per module, added when the module lands (registered in
  `spring.flyway.locations`)

Version numbers (`V001`, `V002`, …) are **globally unique across all
directories** — take the next free number regardless of directory.

## Code conventions

Rules for writing code here; each links to the ADR holding the reasoning —
see [ADR-0020](../docs/adr/0020-documentation-roles.md) for why the rationale
lives there rather than in this file.

- **Package structure per module**: `domain` / `application` / `web` as direct
  subpackages, dependency direction web → application → domain, never
  inward-out. The module root package is the inter-module API and stays empty
  until a consumer exists. Enforced by `ArchitectureTest`
  ([ADR-0007](../docs/adr/0007-backend-package-structure.md)).
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
  a later task.
- **Every request parameter is bounded.** Numeric params carry both ends of
  their range (`@DecimalMin`/`@DecimalMax`, `@Min`/`@Max`) and free text
  carries `@Size`, so no caller can hand the database an unbounded or
  nonsensical value. Bounds are named constants with a comment saying why that
  number — a bound nobody can justify gets changed by the next person who
  finds it inconvenient. A constraint spanning two parameters can't be an
  annotation on either: check it in the handler and throw the module's
  API-response exception (see `requireOrderedAbvRange` in
  `CatalogController`), which reports through `detail` rather than the
  field-level `errors` array, since the violation belongs to the pair.
- Code comments carry only what the repo cannot — full policy in
  [CLAUDE.md](../CLAUDE.md)
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

SLF4J via Lombok's `@Slf4j`, parameterized only (`log.warn("Beer {} not
found", id)`, never concatenation). Level follows what is being logged, not
the mechanism that produced it: `ERROR` for genuine unexpected failures with
the stack trace, `WARN` for anticipated conditions already recovered from
(an exception designed as an API response is `WARN` at most, never `ERROR`),
`INFO` for lifecycle events, `DEBUG` for diagnostics. Log once, where the
exception is finally decided. Never log request/response bodies, tokens or
passwords — log an identifier, not a full domain object. No manual controller
entry/exit logging ([ADR-0013](../docs/adr/0013-logging-conventions.md)).

## Testing conventions

- **Aim for ≥ 80 % coverage of the backend — through valuable tests, not
  coverage theater.** Test domain logic, filtering/sorting, mappings and
  error paths; do not test trivial code (plain getters, dumb DTOs,
  framework wiring).
- Test behavior against real collaborators where practical: specifications
  and repositories run against PostgreSQL via Testcontainers
  (`@DataJpaTest`), the API via `@SpringBootTest` + `RestTestClient`.
  Mock-heavy unit tests that assert implementation calls are a smell.
