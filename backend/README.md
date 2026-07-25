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
mvn spring-boot:run
curl localhost:8080/actuator/health
curl localhost:8080/api/v1/beers?query=westvleteren
```

API docs (springdoc): `/v3/api-docs` (OpenAPI 3.1) and Swagger UI at
`/swagger-ui/index.html` — both reachable at `localhost:8080` whether the
backend is run in the compose stack or natively.

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

- **Package structure per module (ADR-0007):** DDD-lite layers as direct
  subpackages — `domain` (entities, value objects, repositories,
  specifications), `application` (use-case services + API-response
  exceptions), `web` (controllers, advice, HTTP DTOs, boundary mapping).
  Dependency direction web → application → domain, never inward-out;
  enforced by `ArchitectureTest` (ArchUnit). The module root package is the
  inter-module API and stays empty until a consumer exists. Entity→DTO
  mapping lives in `web` (static `from(...)` factories on the DTOs), so
  repositories eager-load relations the boundary needs (entity graphs).
- **Lombok for boilerplate, not for domain semantics.** Use class-level
  `@Getter` and `@NoArgsConstructor(access = PROTECTED)` (the JPA
  constructor) on entities. Do **not** use `@Setter`, `@Data` or `@Builder`
  on entities — state changes go through factory methods and behavior
  methods that enforce invariants (rich domain model).
- Value objects and DTOs are Java records, which need no Lombok.
- **JSpecify nullability.** Every package has a `package-info.java` with
  `@NullMarked` (Spring Framework 7 itself is null-marked). Types are
  non-null by default; anything that may be null is annotated
  `@org.jspecify.annotations.Nullable` — fields, record components,
  parameters and returns alike. New packages must add the marker.
- **SpringDoc annotations on every public endpoint.** `@Tag` on the
  controller class (one tag per module's API surface); `@Operation`
  (summary + description) on every handler method; `@Parameter` on every
  `@RequestParam`/`@PathVariable`. DTOs carry type- and component-level
  `@Schema` descriptions. New endpoints and DTOs must ship annotated —
  undocumented API surface is a gap, not a later task.
- **Every non-`@Nullable` DTO field needs `@Schema(requiredMode =
  Schema.RequiredMode.REQUIRED)`.** springdoc does not infer `required`
  from Java non-nullability, `@Nullable`'s absence, or even primitives —
  every field defaults to optional in the generated schema otherwise
  (confirmed by running it). The frontend's generated API client
  ([ADR-0012](../docs/adr/0012-orval-api-client.md)) is only as accurate
  as this annotation is complete.
- **Null fields are omitted from JSON responses**
  (`spring.jackson.default-property-inclusion=non_null`), not serialized as
  `"field": null`. This makes "optional" mean the same thing in the OpenAPI
  schema, the generated frontend types (`city?: string`, not `city?: string
  | null`), and the actual wire format — verified directly with `@JsonTest`
  (`DtoSerializationIT`), since seed data alone doesn't exercise every
  null case.

## Error-handling convention

`ProblemDetail.detail` carries only messages from exception types
**explicitly designed as API responses** (e.g. `BeerNotFoundException`,
`InvalidSearchParameterException`) — their messages are written for API
consumers and contain nothing internal. Never map broad exception types
(`IllegalArgumentException`, `RuntimeException`) to responses: a library
exception caught by such a handler would leak internal messages. Everything
unexpected falls through to Spring Boot's defaults — 500 problem+json
without a message (`server.error.include-message=never`), logged
server-side.

## Logging conventions

SLF4J via Lombok's `@Slf4j`, parameterized logging only (`log.warn("Beer
{} not found", id)`, never string concatenation). Level follows what's
being logged, not the mechanism that produced it: `ERROR` for genuine
unexpected failures (including anything falling through to the default
exception handler, always with the stack trace); `WARN` for anticipated
conditions the app already recovered from — an exception type designed as
an API response (see above) is `WARN` at most, never `ERROR`, since it
isn't a failure; `INFO` for application lifecycle events, not routine
per-request logging (no correlation-ID infra yet to stitch request lines
together); `DEBUG` for diagnostics, off by default. Log once, at the
point an exception is finally decided — not at every layer that catches
and rethrows it. Never log full request/response bodies, tokens, or
passwords; log an identifier instead of a full domain object. No manual
controller entry/exit logging — that belongs in one centralized mechanism
if request-level visibility is ever needed, not scattered per-method
statements. Full rationale: [ADR-0013](../docs/adr/0013-logging-conventions.md).

## Testing conventions

- **Aim for ≥ 80 % coverage of the backend — through valuable tests, not
  coverage theater.** Test domain logic, filtering/sorting, mappings and
  error paths; do not test trivial code (plain getters, dumb DTOs,
  framework wiring).
- Test behavior against real collaborators where practical: specifications
  and repositories run against PostgreSQL via Testcontainers
  (`@DataJpaTest`), the API via `@SpringBootTest` + `RestTestClient`.
  Mock-heavy unit tests that assert implementation calls are a smell.
