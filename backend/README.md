# Kalia backend

Spring Boot 4.1 modulith (Java 25, Maven). Modules (`catalog`, `cart`,
`ordering`, `payment`, `identity`) arrive iteration by iteration — see
[docs/roadmap.md](../docs/roadmap.md) and
[docs/architecture.md](../docs/architecture.md).

## Run locally

Requires the database from the repo root:

```bash
docker compose up -d          # from repo root
cd backend
mvn spring-boot:run
curl localhost:8080/actuator/health
```

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
