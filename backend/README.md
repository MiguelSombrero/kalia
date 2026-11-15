# Kalia backend

Spring Boot modulith (Java 25, Maven). Its modules, what each owns and what
each depends on: [docs/architecture.md §3](../docs/architecture.md#3-backend-modules).

Code conventions are in [CONVENTIONS.md](CONVENTIONS.md), which loads with this README into every backend session.

## Run locally

The stack: [root README](../README.md#run-locally).
Hot reload: run natively against the compose database. Name the services, as a bare `up -d` also starts the `backend` container that holds port 8080:

```bash
BACKEND_PORT=8090 docker compose up -d postgres keycloak keycloak-config edge   # from repo root
cd backend
DATABASE_PASSWORD=kalia-dev-app-password DATABASE_OWNER_PASSWORD=kalia-dev-owner-password FEED_CURSOR_KEY=any-local-key-of-at-least-32-bytes SPRINGDOC_ENABLED=true LOG_LEVEL=DEBUG mvn spring-boot:run
curl localhost:8080/actuator/health
curl localhost:8080/api/v1/beers?query=westvleteren
```

A worktree with its own ports (`make stack-env`) sets `DATABASE_JDBC_URL` and `KEYCLOAK_ISSUER_URI` to its `POSTGRES_PORT` and `KEYCLOAK_PORT`.
Swagger UI: `/swagger-ui/index.html` (natively needs `SPRINGDOC_ENABLED=true`); Authorize signs in for real against Keycloak. The seeded `testadmin` holds the `admin` role.

## Configuration

One `application.properties`, no Spring profiles; every environment-varying
value is a `${ENV_VAR:default}` placeholder whose default fails safest
([ADR-0015](../docs/adr/0015-configuration-strategy.md)).

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_PASSWORD` | **none — required** | Runtime role's; reads and writes rows, cannot change the schema |
| `DATABASE_OWNER_PASSWORD` | **none — required** | Schema owner's; Flyway alone uses it |
| `FEED_CURSOR_KEY` | **none — required** | HMAC key for feed cursors, ≥ 32 bytes (`openssl rand -base64 32`); see Traps |
| `DATABASE_JDBC_URL` | `jdbc:postgresql://localhost:5432/kalia` | localhost, so a misconfigured deploy fails loudly |
| `DATABASE_USERNAME` | `kalia_app` | Runtime role ([ADR-0100](../docs/adr/0100-postgres-has-three-roles-one-that-owns-the-schema-for-flyway-one-that-reads-and-writes-rows-and-one-for-keycloak.md)) |
| `DATABASE_OWNER_USERNAME` | `kalia_owner` | The role Flyway connects as; owns every table |
| `LOG_LEVEL` | `INFO` | `fi.kalia` level; `DEBUG` in compose, `WARN` in tests |
| `SPRINGDOC_ENABLED` | `false` | API documentation is an exposure surface |
| `ACTUATOR_ENDPOINTS` | `health` | Compose sets `health,prometheus`; the actuator needs no token, so list only what the network may see ([ADR-0088](../docs/adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset | Where spans are sent over OTLP/HTTP, read by Spring Boot itself; unset exports nothing. Compose sets it only while the observability profile runs |
| `KEYCLOAK_ISSUER_URI` | `http://localhost:8081/realms/kalia` | The `iss` every accepted token must carry |
| `KEYCLOAK_JWK_SET_URI` | `http://localhost:8081/realms/kalia/protocol/openid-connect/certs` | Signing keys; differs from the issuer under compose ([ADR-0028](../docs/adr/0028-resource-server-and-current-user.md)) |
| `KEYCLOAK_AUDIENCE` | `kalia-backend` | Required `aud`; rejects tokens minted for another client |
| `KEYCLOAK_SWAGGER_CLIENT_ID` | `kalia-swagger` | Public client; pre-fills Swagger UI's Authorize |

A setting that must not have a default goes in `RequiredConfigurationValidator.REQUIRED` as well as the properties file.

## Test

```bash
mvn test                      # unit tests only (*Test) — fast, no Docker
mvn verify                    # + integration tests (*IT, Testcontainers —
                              #   needs Docker) + merged JaCoCo report
mvn clean verify              # after any pom.xml or plugin change
```

One integration test, repeated until it fails or the count runs out (from the repo root, ~20 s a run, needs Docker):

```bash
make repeat-it TEST=ProfileServiceModuleIT#concurrentFirstSignInsForANewUserBothSucceedAgainstOneSharedProfile COUNT=20
```

`COUNT` defaults to 20. `TEST` must name a method, as a name matching nothing fails rather than passing.

Unit tests end in `*Test` (surefire); anything booting a Spring context or a Testcontainer ends in `*IT` (failsafe).
A green run is ~285 lines; keep the counts with `mvn verify 2>&1 | grep -E "Tests run:|ERROR|FAIL|BUILD"`, and **on failure re-run unfiltered** (or read `target/failsafe-reports/`) before diagnosing.
Before a push run `make verify` from the repo root, or `make verify-fast` without Docker ([ADR-0046](../docs/adr/0046-edit-time-checks-and-one-verify-gate.md)); `verify-fast` skips the suites below.

When you change:

- **the API** (DTO, endpoint, error type): `CommittedOpenApiSpecIT` fails; run `make openapi-spec`, commit `openapi.json` and the regenerated client ([ADR-0093](../docs/adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
- **an operation's error docs**: `ApiErrorDocumentationIT` wants an error on every operation, a `401` if authenticated, a `400` if it takes input, a `415` if it takes a body.
- **the module set or its edges**: `ArchitectureDocumentationTest` compares them with architecture.md §2/§3 in both directions.
- **public routes**: `PublicRoutesIT` compares `SecurityConfig` with architecture.md §6.
- **an ArchUnit rule** that is `noClasses()`-style: add a fixture in `src/test/java/archfixture/` (see Traps).

Coverage: `target/site/jacoco-merged/` after `mvn verify`; the ≥ 80 % aim is measured, not gated.
CI fails on a `HIGH`/`CRITICAL` CVE with a fix ([ADR-0024](../docs/adr/0024-dependency-vulnerability-scanning.md)): bump the dependency in `pom.xml` and confirm with `make trivy-scan` (root; `brew install trivy`).
An image OS-package finding needs no edit, as the runtime stage's `apt-get upgrade` takes the fixed package at build time: rebuild and confirm (root; the image scans are the one CI check `make verify` leaves out):

```bash
docker compose build backend
trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 --ignorefile .trivyignore.yaml <compose project>-backend
```

## Database migrations

Flyway owns the schema (`ddl-auto=validate`). Migrations live under `src/main/resources/db/migration/`: `common/` (module schemas, Modulith `event_publication`) and one directory per module, registered in `spring.flyway.locations`.
Version numbers (`V001`, `V002`, …) are **globally unique across all directories**: take the next free one.

**Until the first deployment, edit the migration a change belongs to** instead of adding one ([ADR-0036](../docs/adr/0036-pre-deployment-migration-edits.md)).
A Postgres volume that ran the old version then fails Flyway validation on the checksum; `docker compose down -v` wipes it.

`catalog/V008__catalog_wikidata_import.sql` is generated: **never edit it by hand**, `make check` fails when it differs from its inputs in `scripts/wikidata/` ([ADR-0077](../docs/adr/0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md)).
Change the generator or a mapping, then regenerate from the repo root:

```bash
node scripts/wikidata-migration.mjs        # rewrites V008, prints what it dropped and why
node scripts/wikidata-migration.mjs --check
```

## Operating the app config

`GET /api/v1/app-config` serves the mobile app its minimum build per platform and a maintenance flag, from one row (`appconfig.app_config`) that starts at 0, 0 and off ([ADR-0093](../docs/adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)). From the repo root, with `postgres` up:

```bash
make app-config MAINTENANCE=on               # raise maintenance, mid-incident
make app-config MAINTENANCE=off
make app-config IOS=5 ANDROID=5              # builds below 5 must update
```

Any of `IOS`, `ANDROID`, `MAINTENANCE` may be given; one left out keeps its value. The app sees the change at its next check.
Raising a minimum is what permits removing a deprecated API element, never before the last build using it is below the new minimum.

## Observability

Logs, counters and trace ids exist always; with the observability profile on
(`make observability-up`, [root README](../README.md)) they are also stored and
queryable ([ADR-0088](../docs/adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md), [ADR-0114](../docs/adr/0114-an-opt-in-profile-stores-traces-logs-and-metrics-in-one-local-grafana-container-an-agent-reads-through-a-bounded-interface.md)).

| | Without the profile | With it |
|---|---|---|
| **Spans** | none leave the process | OTLP/HTTP to `OTEL_EXPORTER_OTLP_ENDPOINT`, batched, every request sampled, stored as service `backend`. The readiness probe's are dropped |
| **Counters** | `/actuator/prometheus` | scraped from the same path by the store's Prometheus (`observability/prometheus.yaml`), so they survive a restart |
| **Logs** | JSON on stdout | the same stdout, read by the shipper; the backend has no log exporter |

- **Logs**: JSON per line on stdout, `traceId`/`spanId` on each line written during a request. Read: `docker compose logs backend --no-log-prefix | jq -c '[.["@timestamp"], .log.level, .message, .traceId]'`. Follow a request across both tiers: `docker compose logs --no-log-prefix | grep <traceId>`.
- **Counters** at `/actuator/prometheus` need no token and the edge answers `404` ([ADR-0090](../docs/adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)), so the network is what keeps them private ([ADR-0088](../docs/adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)): read them inside it, `docker compose exec backend curl localhost:8080/actuator/prometheus`, and let a scraper join the compose network rather than publish the port. Natively set `ACTUATOR_ENDPOINTS=health,prometheus`. Never list `env`, `heapdump` or `beans`: nothing else guards them.
- Ours: `kalia_events_publication_retries_total` and `kalia_events_publication_exhausted_total`.
- **No exporter is configured by default, and a span never carries a query string, token or body.** `TraceExportIT` reads the exported bytes for both. An instrumentation that records a full URL (`url.full`, an HTTP client's `http.url`) breaks the second silently; that test is the guard.
- **A collector that is down costs nothing**: the exporter drops spans in the background and the log gains at most one error line per ten minutes (`ExporterOutageThrottle`), however many batches fail. `make observability-down` recreates the backend without the endpoint.

## Traps — do not "fix" these

Each fails silently rather than at build time, so the warning stays here.

- **Maven must run on JDK 25**, not merely have it installed. A newer JDK fails `compile` with `Fatal error compiling: java.lang.ExceptionInInitializerError: com.sun.tools.javac.tree.EndPosTable`, naming neither Lombok nor the JDK. `mvn -version` is not `java -version`; if they differ: `JAVA_HOME=$(/usr/libexec/java_home -v 25) mvn clean verify` ([ADR-0085](../docs/adr/0085-runtimes-follow-long-term-support-not-the-newest-major.md)).
- **`mvn clean` after any `pom.xml` or plugin change.** An incremental build reports success against stale `target/classes`.
- **The runtime role cannot DDL** ([ADR-0100](../docs/adr/0100-postgres-has-three-roles-one-that-owns-the-schema-for-flyway-one-that-reads-and-writes-rows-and-one-for-keycloak.md)). A library's schema initializer fails with `permission denied`; Modulith's is off. A migration needs no `GRANT`.
- **`FEED_CURSOR_KEY` must be the same on every instance and survive restarts**, or cursors issued earlier are rejected with a `400` ([ADR-0060](../docs/adr/0060-feed-delivery-is-polling.md)).
- **Every non-`@Nullable` DTO field needs `@Schema(requiredMode = Schema.RequiredMode.REQUIRED)`.** springdoc infers `required` from nothing, so the field silently becomes optional in the spec and the generated client ([ADR-0012](../docs/adr/0012-orval-api-client.md)).
- **Null fields stay omitted from JSON** (`spring.jackson.default-property-inclusion=non_null`); it keeps `city?: string` sound end to end. Each module's `*DtoSerializationIT` pins it.
- **Measure before adding a handler for a generic Spring MVC exception.** A `ProblemDetail` return carries no headers, so overriding one whose Boot handling sets one (405's `Allow`) drops it ([ADR-0014](../docs/adr/0014-shared-exception-handling.md)).
- **Module advice and `GlobalExceptionHandler` must never handle the same type.** Spring resolves it by `@Order` without error, and `GlobalExceptionHandler` (`HIGHEST_PRECEDENCE`) wins and masks the mistake.
- **A handler with any `@ApiResponse` needs an explicit `@ResponseStatus`**, even `200`. Otherwise springdoc drops the success response from `/v3/api-docs`, with no compile error and no test failure unless one asserts on the spec.
- **Change the wire format through a `ServerHttpMessageConvertersCustomizer`, never an `HttpMessageConverter` bean.** Boot hands every converter bean to `RestClient` and `RestTestClient` too, silently changing how outgoing calls decode, e.g. a `problem+json` body read as a `String`.
- **A `noClasses()` ArchUnit rule (or a `classes().should()` rule every class satisfies) passes when it never meets a violator**, so a wrong condition looks satisfied. Such a rule gets a fixture in `src/test/java/archfixture/`; a rule already exercised by production code, like `entitiesLiveInDomain`, does not.
- **Event-listener tests poll the repository**, scoped per test. `verify(spy, timeout(…)).save(any())` races the listener's own commit. The same holds for any side effect after the response, a log line included: await it by polling until it appears or a deadline passes, never read it once.
- **A concurrency test forces its conflict and never asserts that a race occurred.** Barriers (or a hook delaying one side) go where both sides have read and neither has written, and a query a barrier guards runs before it, returning after; a thread that reads late sees the winner's row and the conflict silently never happens. A new or changed concurrency test shows 20 consecutive clean runs on its branch by `make repeat-it` before its pull request opens, stated in the pull request body; no checker looks for it, since a script cannot tell a concurrency test from any other.
