# Kalia backend

Spring Boot 4.1 modulith (Java 25, Maven). Modules (`catalog`, `identity`,
`cellar`; store modules if chosen later) arrive iteration by iteration — see
[docs/roadmap.md](../docs/roadmap.md) and
[docs/architecture.md](../docs/architecture.md).

## Run locally

Full stack in containers: `docker compose up --build` from the repo root
(note: the API is not published to the host; only the frontend is).

For development with hot reload, run natively against the compose database:

```bash
docker compose up -d          # from repo root
cd backend
mvn spring-boot:run
curl localhost:8080/actuator/health
curl localhost:8080/api/v1/beers?query=westvleteren
```

API docs (springdoc): `/v3/api-docs` (OpenAPI 3.1) and `/swagger-ui.html`.
In the full compose stack these are reachable only from the internal
network, like the rest of the API.

## Test

```bash
mvn test                      # needs Docker running (Testcontainers)
```

Test suites:

- `ModularityTests` — Spring Modulith `ApplicationModules.verify()`; fails on
  illegal cross-module dependencies
- `KaliaApplicationTests` — boots the full context against a PostgreSQL 18.4
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

## Testing conventions

- **Aim for ≥ 80 % coverage of the backend — through valuable tests, not
  coverage theater.** Test domain logic, filtering/sorting, mappings and
  error paths; do not test trivial code (plain getters, dumb DTOs,
  framework wiring).
- Test behavior against real collaborators where practical: specifications
  and repositories run against PostgreSQL via Testcontainers
  (`@DataJpaTest`), the API via `@SpringBootTest` + `RestTestClient`.
  Mock-heavy unit tests that assert implementation calls are a smell.
