# ADR-0015: Environment-variable configuration, not Spring profiles

- **Status:** accepted
- **Date:** 2026-07-25

## Context

Iteration 3 task 3 was worded as "split `application.properties` into base +
`dev`/`test`/`prod` profiles". Reviewing that before implementing, the
product owner raised two objections to profiles:

1. A profile-per-environment layout ships **every** environment's
   configuration inside the artifact, so production carries development's
   database URLs and vice versa.
2. If the active profile is not set, the application silently starts on
   some other environment's settings.

Both hold. The Twelve-Factor App's config factor names this pattern
directly, criticising "batching config into named groups (often called
'environments')" and prescribing environment variables instead.

Spring Boot's own property precedence reinforces it: OS environment
variables outrank *every* packaged `application*.properties` file,
profile-specific ones included. Environment variables are already the
framework's primary override mechanism; profiles are an optional extra
layer beneath it, not the way to reach it.

Two profile-free alternatives were compared. Overriding whole properties by
relaxed binding alone (a plain `server.port=8080` overridden by
`SERVER_PORT`) was rejected: it cannot express "required, no default",
because the property always holds a literal value, so a missing secret
silently falls back to whatever shipped in the jar. It is also implicit —
nothing in the file marks which settings are meant to vary.

## Decision

- **One `application.properties`. No profile files.** Every
  environment-varying value is a `${ENV_VAR:default}` placeholder, so the
  file itself documents the complete set of knobs and their defaults.
- **Each default is the value that fails safest when nobody configures
  it**, which is not always literally the production value:

  | Kind | Rule | Example |
  |---|---|---|
  | Secret | No default at all | `${POSTGRES_PASSWORD}` |
  | Exposure flag | Restrictive | `${SPRINGDOC_ENABLED:false}` |
  | Connection target | `localhost` — cannot silently reach a real system | `${DATABASE_JDBC_URL:jdbc:postgresql://localhost:5432/kalia}` |

- **Required configuration is verified in `main()`**, before the Spring
  context starts, by `RequiredConfigurationValidator`. This is not
  belt-and-braces; two framework behaviours were measured and make the
  obvious alternatives useless:
  - Spring's configuration-properties **binder resolves placeholders
    leniently**. An unset `${POSTGRES_PASSWORD}` binds as the literal
    text `${POSTGRES_PASSWORD}` rather than failing (measured), so "no
    default" alone buys nothing. This also rules out the more idiomatic
    `@ConfigurationProperties` + `@Validated` approach: that literal is
    neither null nor blank, so `@NotNull` and `@NotBlank` are satisfied
    and validation stays silent. `@Value` *is* strict and does throw, but
    see the timing problem below.
  - **Database-touching infrastructure beans are constructed before any
    application bean.** A `@Component` with `@PostConstruct` was tried
    first and lost the race — startup still failed with
    `FATAL: password authentication failed for user "kalia"`, pointing an
    operator at a credential mismatch instead of absent configuration. A
    `@ConfigurationProperties` bean loses the same race: with Flyway
    disabled to get further, Spring Modulith's `databaseSchemaInitializer`
    connects next. It is a queue of such beans, not one culprit.

  Validating in `main()` is the earliest point that is guaranteed to run,
  needs no framework machinery, and is directly unit-testable. It reads OS
  environment variables, which is the documented contract for supplying
  this configuration. `EnvironmentPostProcessor` is the one Spring-native
  hook early enough to work, and was rejected only because it also runs
  for every test context — every `@SpringBootTest` would then need the
  secret supplied, reintroducing test-only configuration this approach
  avoids. Every production entry point (`java -jar`, `mvn spring-boot:run`)
  goes through `main()`, so the coverage is equivalent.
- **`docker-compose.yml` speaks the application's env contract**
  (`DATABASE_JDBC_URL`, `POSTGRES_PASSWORD`, `LOG_LEVEL`, `SPRINGDOC_ENABLED`)
  rather than Spring property names, and is the local development
  environment: `LOG_LEVEL=DEBUG` and Swagger enabled.
- **Tests get their configuration through the same mechanism**, set in the
  failsafe plugin configuration — no test profile, no
  `src/test/resources/application.properties` (which would shadow the main
  file on the classpath rather than merge with it). The datasource needs
  nothing there: Testcontainers' `@ServiceConnection` replaces it wholesale.
- **Profiles are rejected for configuration only.** `@Profile` on *beans*
  remains available for genuine behavioural variants — a mocked adapter
  standing in for an external service would be a legitimate future use. What
  this ADR rejects is profiles as the carrier of
  per-environment configuration values.

## Consequences

- The artifact contains exactly one set of configuration values, and they
  are the safe ones. Nothing from another environment travels with it.
- A missing setting either takes a default that cannot do damage, or stops
  startup with the variable named. It can no longer "run, but as the wrong
  environment".
- ADR-0013's per-environment logging policy is unchanged in substance —
  `dev` DEBUG, `test` WARN, `prod` INFO — but is delivered by `LOG_LEVEL`
  rather than profile files; that ADR has been corrected accordingly.
- Swagger UI and `/v3/api-docs` are **off by default** and enabled
  explicitly in docker-compose and in the test configuration. A deployment
  that forgets to configure them exposes nothing.
- Adding a required setting means adding it to
  `RequiredConfigurationValidator.REQUIRED` as well as the properties file.
  The auth iteration will add several (Keycloak client secret, session
  keys), which is why the mechanism exists now rather than later.
- Grouping is lost: a deployment sets N variables rather than one profile
  name. Deployment tooling (compose file, Kubernetes ConfigMap) does that
  grouping instead, which is where it belongs.
- `docs/tasks/iteration-3.md`'s "Done when" said "dev/test/prod each run
  off their own profile"; since that criterion could never be met under
  this decision, it was reworded rather than left unsatisfiable.
